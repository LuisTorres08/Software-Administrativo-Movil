import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barChartOutline, refreshOutline, cashOutline } from 'ionicons/icons';
import Chart from 'chart.js/auto';
import { ApiService } from '../core/api.service';
import { DashboardPagos, Empresa } from '../core/models';
import { formatCOP, toNumber } from '../core/format';

const PALETTE = ['#4b5563', '#3dc2ff', '#2dd36f', '#ffc409', '#eb445a', '#64748b', '#92949c', '#ff6d3d'];

@Component({
  selector: 'app-informes',
  templateUrl: 'informes.page.html',
  styleUrls: ['informes.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButton,
  ],
})
export class InformesPage {
  private api = inject(ApiService);

  @ViewChild('empresaCanvas') empresaCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('mesCanvas') mesCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('proveedorCanvas') proveedorCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('centroCanvas') centroCanvas?: ElementRef<HTMLCanvasElement>;

  readonly empresas = signal<Empresa[]>([]);
  readonly data = signal<DashboardPagos | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  empresaId: number | '' = '';
  desde = '';
  hasta = '';

  readonly cop = formatCOP;

  private charts: Chart[] = [];

  constructor() {
    addIcons({ barChartOutline, refreshOutline, cashOutline });
  }

  ionViewWillEnter(): void {
    if (this.empresas().length === 0) {
      this.api.getEmpresas().subscribe({
        next: (e) => this.empresas.set(e),
        error: () => this.empresas.set([]),
      });
    }
    this.cargar();
  }

  ionViewWillLeave(): void {
    this.destruirCharts();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getDashboardPagos({
        desde: this.desde || undefined,
        hasta: this.hasta || undefined,
        empresa_id: this.empresaId === '' ? undefined : this.empresaId,
      })
      .subscribe({
        next: (d) => {
          this.data.set(d ?? null);
          this.loading.set(false);
          setTimeout(() => this.render(), 0);
        },
        error: () => {
          this.error.set('No se pudo cargar el informe.');
          this.data.set(null);
          this.loading.set(false);
        },
      });
  }

  get totalPagado(): number {
    return toNumber(this.data()?.total_pagado);
  }

  get numPagos(): number {
    return toNumber(this.data()?.num_pagos);
  }

  private destruirCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private render(): void {
    this.destruirCharts();
    const d = this.data();
    if (!d) return;

    // (a) Barras — Pagado por empresa
    const emp = d.por_empresa ?? [];
    if (this.empresaCanvas && emp.length) {
      this.charts.push(
        new Chart(this.empresaCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: emp.map((x) => x.empresa),
            datasets: [
              {
                label: 'Pagado',
                data: emp.map((x) => toNumber(x.total)),
                backgroundColor: PALETTE[0],
                borderRadius: 6,
              },
            ],
          },
          options: this.baseOptions(),
        }),
      );
    }

    // (b) Por empresa y mes — barras agrupadas por empresa a lo largo de los meses
    const pem = d.por_empresa_mes ?? [];
    if (this.mesCanvas && pem.length) {
      const meses = Array.from(new Set(pem.map((x) => x.mes))).sort();
      const empresasSet = Array.from(new Set(pem.map((x) => x.empresa)));
      const datasets = empresasSet.map((nombre, i) => ({
        label: nombre,
        data: meses.map((m) =>
          toNumber(pem.find((x) => x.mes === m && x.empresa === nombre)?.total),
        ),
        backgroundColor: PALETTE[i % PALETTE.length],
        borderRadius: 4,
      }));
      this.charts.push(
        new Chart(this.mesCanvas.nativeElement, {
          type: 'bar',
          data: { labels: meses, datasets },
          options: this.baseOptions(true),
        }),
      );
    }

    // (c) Top proveedores — barras horizontales
    const prov = (d.por_proveedor ?? []).slice(0, 8);
    if (this.proveedorCanvas && prov.length) {
      this.charts.push(
        new Chart(this.proveedorCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: prov.map((x) => x.proveedor),
            datasets: [
              {
                label: 'Pagado',
                data: prov.map((x) => toNumber(x.total)),
                backgroundColor: PALETTE[1],
                borderRadius: 6,
              },
            ],
          },
          options: { ...this.baseOptions(), indexAxis: 'y' as const },
        }),
      );
    }

    // (d) Por centro de costo — doughnut
    const cc = (d.por_centro_costo ?? []).slice(0, 8);
    if (this.centroCanvas && cc.length) {
      this.charts.push(
        new Chart(this.centroCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: cc.map((x) => x.centro_costo),
            datasets: [
              {
                data: cc.map((x) => toNumber(x.total)),
                backgroundColor: cc.map((_, i) => PALETTE[i % PALETTE.length]),
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
          },
        }),
      );
    }
  }

  private baseOptions(stacked = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: stacked, position: 'bottom' as const } },
      scales: {
        x: { stacked, ticks: { autoSkip: true, maxRotation: 0 } },
        y: { stacked, beginAtZero: true },
      },
    };
  }
}
