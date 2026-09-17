import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  refreshOutline,
  cashOutline,
  businessOutline,
  statsChartOutline,
  pieChartOutline,
  peopleOutline,
  walletOutline,
  calendarOutline,
  alertCircleOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import Chart from 'chart.js/auto';
import { ApiService } from '../core/api.service';
import { DashboardPagos, Empresa } from '../core/models';
import { formatCOP, toNumber } from '../core/format';
import { KpiCard, FilterChip, Skeleton, EmptyState } from '../shared';

type Preset = '' | 'mes' | 'mesAnterior' | '3meses' | 'anio' | 'custom';

/** Colores del tema leídos en runtime (theme-aware, claro/oscuro). */
interface Tema {
  serie: string[];
  grid: string;
  text: string;
  textStrong: string;
  text3: string;
  surface: string;
  surfaceElev: string;
  border: string;
  accent: string;
}

@Component({
  selector: 'app-informes',
  templateUrl: 'informes.page.html',
  styleUrls: ['informes.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonContent,
    IonSelect,
    IonSelectOption,
    IonIcon,
    KpiCard,
    FilterChip,
    Skeleton,
    EmptyState,
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
  readonly preset = signal<Preset>('');

  empresaId: number | '' = '';
  desde = '';
  hasta = '';

  readonly cop = formatCOP;
  readonly nombre = (typeof localStorage !== 'undefined' && localStorage.getItem('nombre')) || '';

  // ── KPIs derivados ──
  readonly totalPagado = computed(() => toNumber(this.data()?.total_pagado));
  readonly numPagos = computed(() => toNumber(this.data()?.num_pagos));
  readonly promedio = computed(() =>
    this.numPagos() > 0 ? this.totalPagado() / this.numPagos() : 0,
  );

  readonly sinDatos = computed(() => {
    const d = this.data();
    if (!d) return false;
    return (
      !(d.por_empresa?.length) &&
      !(d.por_empresa_mes?.length) &&
      !(d.por_proveedor?.length) &&
      !(d.por_centro_costo?.length)
    );
  });

  private charts: Chart[] = [];
  private mql?: MediaQueryList;
  private themeHandler = () => {
    if (this.data() && !this.loading()) this.render();
  };

  constructor() {
    addIcons({
      barChartOutline, refreshOutline, cashOutline, businessOutline, statsChartOutline,
      pieChartOutline, peopleOutline, walletOutline, calendarOutline, alertCircleOutline,
      trendingUpOutline,
    });
  }

  // ── Ciclo de vida ──
  ionViewWillEnter(): void {
    if (this.empresas().length === 0) {
      this.api.getEmpresas().subscribe({
        next: (e) => this.empresas.set(e),
        error: () => this.empresas.set([]),
      });
    }
    this.addThemeListener();
    this.cargar();
  }

  ionViewWillLeave(): void {
    this.removeThemeListener();
    this.destruirCharts();
  }

  ngOnDestroy(): void {
    this.removeThemeListener();
    this.destruirCharts();
  }

  private addThemeListener(): void {
    if (this.mql || typeof window === 'undefined' || !window.matchMedia) return;
    this.mql = window.matchMedia('(prefers-color-scheme: dark)');
    this.mql.addEventListener('change', this.themeHandler);
  }

  private removeThemeListener(): void {
    this.mql?.removeEventListener('change', this.themeHandler);
    this.mql = undefined;
  }

  // ── Carga de datos (endpoint/modelo intactos) ──
  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.destruirCharts();
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

  // ── Accesos rápidos de fecha ──
  setPreset(p: Preset): void {
    this.preset.set(p);
    if (p === 'custom') return; // revela campos; el usuario ajusta y Actualiza
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (p === 'mes') {
      this.desde = this.iso(new Date(y, m, 1));
      this.hasta = this.iso(new Date(y, m + 1, 0));
    } else if (p === 'mesAnterior') {
      this.desde = this.iso(new Date(y, m - 1, 1));
      this.hasta = this.iso(new Date(y, m, 0));
    } else if (p === '3meses') {
      this.desde = this.iso(new Date(y, m - 2, 1));
      this.hasta = this.iso(new Date(y, m + 1, 0));
    } else if (p === 'anio') {
      this.desde = this.iso(new Date(y, 0, 1));
      this.hasta = this.iso(new Date(y, 11, 31));
    }
    this.cargar();
  }

  private iso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onEmpresaChange(v: number | ''): void {
    this.empresaId = v;
    this.cargar();
  }

  // ── Alturas de canvas proporcionales a la cantidad de datos ──
  hEmpresa(): number {
    const n = this.data()?.por_empresa?.length ?? 0;
    return Math.min(360, Math.max(220, 150 + n * 26));
  }
  hMes(): number {
    return 300;
  }
  hProv(): number {
    const n = Math.min(8, this.data()?.por_proveedor?.length ?? 0);
    return Math.max(200, 56 + n * 40);
  }
  hCentro(): number {
    const n = Math.min(8, this.data()?.por_centro_costo?.length ?? 0);
    return Math.max(300, 220 + n * 16);
  }

  // ── Charts ──
  private destruirCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private tema(): Tema {
    const cs = getComputedStyle(document.documentElement);
    const g = (n: string) => cs.getPropertyValue(n).trim();
    return {
      serie: [
        g('--chart-1'), g('--chart-2'), g('--chart-3'), g('--chart-4'),
        g('--chart-5'), g('--chart-6'), g('--chart-7'), g('--chart-8'),
      ],
      grid: g('--chart-grid'),
      text: g('--chart-text'),
      textStrong: g('--text'),
      text3: g('--text-3'),
      surface: g('--surface'),
      surfaceElev: g('--surface-elev'),
      border: g('--border-strong'),
      accent: g('--accent'),
    };
  }

  /** Convierte un color (#hex o rgb/rgba) a rgba con alfa dado. */
  private rgba(color: string, a: number): string {
    const c = (color || '').trim();
    if (c.startsWith('#')) {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h, 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }
    const m = c.match(/-?\d+\.?\d*/g);
    if (m && m.length >= 3) return `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${a})`;
    return c;
  }

  /** Degradado suave del color a una versión translúcida. */
  private gradiente(
    ctx: CanvasRenderingContext2D,
    area: { top: number; bottom: number; left: number; right: number },
    color: string,
    horizontal = false,
  ): CanvasGradient {
    const grad = horizontal
      ? ctx.createLinearGradient(area.left, 0, area.right, 0)
      : ctx.createLinearGradient(0, area.bottom, 0, area.top);
    grad.addColorStop(0, this.rgba(color, horizontal ? 1 : 0.28));
    grad.addColorStop(1, this.rgba(color, horizontal ? 0.28 : 1));
    return grad;
  }

  private abrevCOP(v: number): string {
    const n = Math.abs(v);
    const strip = (x: string) => x.replace(/\.0$/, '');
    if (n >= 1e9) return '$' + strip((v / 1e9).toFixed(1)) + 'MM';
    if (n >= 1e6) return '$' + strip((v / 1e6).toFixed(1)) + 'M';
    if (n >= 1e3) return '$' + Math.round(v / 1e3) + 'K';
    return '$' + Math.round(v);
  }

  private trunc(s: string, n: number): string {
    const t = (s ?? '').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }

  private mesLabel(m: string): string {
    const names = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const [y, mm] = String(m).split('-');
    const i = Number(mm) - 1;
    return (names[i] ?? m) + (y ? ' ' + y.slice(2) : '');
  }

  private tooltipCfg(t: Tema): Record<string, unknown> {
    return {
      backgroundColor: t.surfaceElev,
      titleColor: t.textStrong,
      bodyColor: t.textStrong,
      borderColor: t.border,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      titleFont: { family: 'Inter', weight: '600', size: 12 },
      bodyFont: { family: 'Inter', size: 12 },
      boxPadding: 4,
    };
  }

  private render(): void {
    this.destruirCharts();
    const d = this.data();
    if (!d || this.sinDatos()) return;
    const t = this.tema();
    Chart.defaults.font.family = 'Inter';
    Chart.defaults.color = t.text;

    // (a) Pagado por empresa — barras verticales
    const emp = d.por_empresa ?? [];
    if (this.empresaCanvas && emp.length) {
      const full = emp.map((x) => x.empresa || '—');
      const rot = emp.length > 3 || full.some((s) => s.length > 8);
      const cfg: any = {
        type: 'bar',
        data: {
          labels: full,
          datasets: [
            {
              label: 'Pagado',
              data: emp.map((x) => toNumber(x.total)),
              borderRadius: 8,
              borderSkipped: false,
              maxBarThickness: 64,
              backgroundColor: (c: any) => {
                const { chart } = c;
                if (!chart.chartArea) return t.serie[0];
                return this.gradiente(chart.ctx, chart.chartArea, t.serie[0], false);
              },
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...this.tooltipCfg(t),
              callbacks: {
                title: (items: any[]) => full[items[0].dataIndex],
                label: (item: any) => '  ' + formatCOP(item.parsed.y),
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: t.grid },
              ticks: {
                color: t.text,
                autoSkip: false,
                maxRotation: rot ? 42 : 0,
                minRotation: 0,
                font: { family: 'Inter', size: 11 },
                callback: (_v: any, i: number) => this.trunc(full[i], 10),
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: t.grid },
              border: { display: false },
              ticks: {
                color: t.text,
                font: { family: 'Inter', size: 11 },
                callback: (v: any) => this.abrevCOP(Number(v)),
              },
            },
          },
        },
      };
      this.charts.push(new Chart(this.empresaCanvas.nativeElement, cfg));
    }

    // (b) Por empresa y mes — barras agrupadas
    const pem = d.por_empresa_mes ?? [];
    if (this.mesCanvas && pem.length) {
      const meses = Array.from(new Set(pem.map((x) => x.mes))).sort();
      const empresasSet = Array.from(new Set(pem.map((x) => x.empresa)));
      const datasets = empresasSet.map((nombre, i) => {
        const color = t.serie[i % t.serie.length];
        return {
          label: this.trunc(nombre, 18),
          data: meses.map((m) =>
            toNumber(pem.find((x) => x.mes === m && x.empresa === nombre)?.total),
          ),
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 40,
          backgroundColor: (c: any) => {
            const { chart } = c;
            if (!chart.chartArea) return color;
            return this.gradiente(chart.ctx, chart.chartArea, color, false);
          },
        };
      });
      const cfg: any = {
        type: 'bar',
        data: { labels: meses.map((m) => this.mesLabel(m)), datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: t.text,
                usePointStyle: true,
                pointStyle: 'rectRounded',
                boxWidth: 10,
                boxHeight: 10,
                padding: 12,
                font: { family: 'Inter', size: 11 },
              },
            },
            tooltip: {
              ...this.tooltipCfg(t),
              callbacks: {
                label: (item: any) => ` ${item.dataset.label}: ${formatCOP(item.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: t.grid },
              ticks: {
                color: t.text,
                autoSkip: false,
                maxRotation: 0,
                font: { family: 'Inter', size: 11 },
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: t.grid },
              border: { display: false },
              ticks: {
                color: t.text,
                font: { family: 'Inter', size: 11 },
                callback: (v: any) => this.abrevCOP(Number(v)),
              },
            },
          },
        },
      };
      this.charts.push(new Chart(this.mesCanvas.nativeElement, cfg));
    }

    // (c) Top proveedores — barras horizontales
    const prov = (d.por_proveedor ?? []).slice(0, 8);
    if (this.proveedorCanvas && prov.length) {
      const full = prov.map((x) => x.proveedor || '—');
      const cfg: any = {
        type: 'bar',
        data: {
          labels: full,
          datasets: [
            {
              label: 'Pagado',
              data: prov.map((x) => toNumber(x.total)),
              borderRadius: 7,
              borderSkipped: false,
              maxBarThickness: 26,
              backgroundColor: (c: any) => {
                const { chart } = c;
                if (!chart.chartArea) return t.serie[1];
                return this.gradiente(chart.ctx, chart.chartArea, t.serie[1], true);
              },
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { left: 4, right: 8 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              ...this.tooltipCfg(t),
              callbacks: {
                title: (items: any[]) => full[items[0].dataIndex],
                label: (item: any) => '  ' + formatCOP(item.parsed.x),
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: t.grid },
              border: { display: false },
              ticks: {
                color: t.text,
                font: { family: 'Inter', size: 11 },
                callback: (v: any) => this.abrevCOP(Number(v)),
              },
            },
            y: {
              grid: { display: false },
              border: { color: t.grid },
              ticks: {
                color: t.textStrong,
                autoSkip: false,
                crossAlign: 'far',
                font: { family: 'Inter', size: 11 },
                callback: (_v: any, i: number) => this.trunc(full[i], 20),
              },
            },
          },
        },
      };
      this.charts.push(new Chart(this.proveedorCanvas.nativeElement, cfg));
    }

    // (d) Por centro de costo — dona con total al centro
    const cc = (d.por_centro_costo ?? []).slice(0, 8);
    if (this.centroCanvas && cc.length) {
      const full = cc.map((x) => x.centro_costo || '—');
      const valores = cc.map((x) => toNumber(x.total));
      const total = valores.reduce((s, v) => s + v, 0);
      const colores = cc.map((_, i) => t.serie[i % t.serie.length]);
      const centro = {
        id: 'centroTotal',
        afterDraw: (chart: any) => {
          const arc = chart.getDatasetMeta(0)?.data?.[0];
          if (!arc) return;
          const ctx = chart.ctx as CanvasRenderingContext2D;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = t.text3;
          ctx.font = '600 11px Inter';
          ctx.fillText('TOTAL', arc.x, arc.y - 13);
          ctx.fillStyle = t.textStrong;
          ctx.font = '700 17px Inter';
          ctx.fillText(this.abrevCOP(total), arc.x, arc.y + 7);
          ctx.restore();
        },
      };
      const cfg: any = {
        type: 'doughnut',
        data: {
          labels: full,
          datasets: [
            {
              data: valores,
              backgroundColor: colores,
              borderColor: t.surface,
              borderWidth: 2,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: t.text,
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                boxHeight: 8,
                padding: 10,
                font: { family: 'Inter', size: 11 },
                generateLabels: (chart: any) => {
                  const ds = chart.data.datasets[0];
                  return chart.data.labels.map((label: string, i: number) => ({
                    text: `${this.trunc(label, 16)} — ${this.abrevCOP(valores[i])}`,
                    fillStyle: ds.backgroundColor[i],
                    strokeStyle: ds.backgroundColor[i],
                    lineWidth: 0,
                    index: i,
                  }));
                },
              },
            },
            tooltip: {
              ...this.tooltipCfg(t),
              callbacks: {
                label: (item: any) => {
                  const v = valores[item.dataIndex];
                  const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                  return `  ${formatCOP(v)} · ${pct}%`;
                },
              },
            },
          },
        },
        plugins: [centro],
      };
      this.charts.push(new Chart(this.centroCanvas.nativeElement, cfg));
    }
  }
}
