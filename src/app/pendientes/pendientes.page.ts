import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  attachOutline,
  calendarOutline,
  chevronForwardOutline,
  fileTrayOutline,
  businessOutline,
  swapVerticalOutline,
  alertCircle,
  timeOutline,
  documentAttachOutline,
} from 'ionicons/icons';
import type { RefresherCustomEvent } from '@ionic/angular';
import { Browser } from '@capacitor/browser';
import { ApiService, ResumenCxp } from '../core/api.service';
import { Cuenta } from '../core/models';
import { formatCOP, formatDate } from '../core/format';

interface Urgencia {
  cls: 'vencida' | 'hoy' | 'pronto' | 'semana' | 'ok' | 'none';
  label: string;
  dias: number;
}

interface Seccion {
  empresa: string; // '' = sin encabezado (orden por prioridad)
  items: Cuenta[];
}

@Component({
  selector: 'app-pendientes',
  templateUrl: 'pendientes.page.html',
  styleUrls: ['pendientes.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSelect,
    IonSelectOption,
  ],
})
export class PendientesPage {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly filtro = signal<'PENDIENTE' | 'REVISADO'>('PENDIENTE');
  readonly cuentas = signal<Cuenta[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenCxp | null>(null);

  readonly empresaFiltro = signal<string>('');
  readonly orden = signal<'prioridad' | 'empresa'>('prioridad');

  readonly cop = formatCOP;
  readonly fecha = formatDate;

  /** Empresas presentes en la bandeja actual (para el filtro). */
  readonly empresas = computed(() => {
    const set = new Set<string>();
    for (const c of this.cuentas()) {
      const e = (c.empresa || c.empresa_abreviatura || '').trim();
      if (e) set.add(e);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  /** Vista final: filtrada por empresa y agrupada/ordenada. */
  readonly secciones = computed<Seccion[]>(() => {
    const ef = this.empresaFiltro();
    let lista = this.cuentas();
    if (ef) lista = lista.filter((c) => (c.empresa || c.empresa_abreviatura || '').trim() === ef);

    const porFecha = (a: Cuenta, b: Cuenta) => this.dias(a.fecha_vencimiento) - this.dias(b.fecha_vencimiento);

    if (this.orden() === 'empresa') {
      const map = new Map<string, Cuenta[]>();
      for (const c of lista) {
        const e = (c.empresa || c.empresa_abreviatura || 'Sin empresa').trim();
        (map.get(e) ?? map.set(e, []).get(e)!).push(c);
      }
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([empresa, items]) => ({ empresa, items: items.slice().sort(porFecha) }));
    }
    // prioridad: por vencimiento ascendente (vencidas primero)
    return [{ empresa: '', items: lista.slice().sort(porFecha) }];
  });

  readonly total = computed(() => this.secciones().reduce((s, g) => s + g.items.length, 0));

  constructor() {
    addIcons({
      attachOutline,
      calendarOutline,
      chevronForwardOutline,
      fileTrayOutline,
      businessOutline,
      swapVerticalOutline,
      alertCircle,
      timeOutline,
      documentAttachOutline,
    });
  }

  ionViewWillEnter(): void {
    this.cargar();
    this.cargarResumen();
  }

  onSegment(value: string): void {
    this.filtro.set(value === 'REVISADO' ? 'REVISADO' : 'PENDIENTE');
    this.empresaFiltro.set('');
    this.cargar();
  }

  cargar(event?: RefresherCustomEvent): void {
    if (!event) this.loading.set(true);
    this.error.set(null);
    this.api.getCuentas(this.filtro()).subscribe({
      next: (data) => {
        this.cuentas.set(data);
        this.loading.set(false);
        event?.target.complete();
      },
      error: () => {
        this.error.set('No se pudieron cargar las cuentas.');
        this.cuentas.set([]);
        this.loading.set(false);
        event?.target.complete();
      },
    });
    if (event) this.cargarResumen();
  }

  cargarResumen(): void {
    this.api.getResumen().subscribe({ next: (r) => this.resumen.set(r), error: () => {} });
  }

  abrir(cuenta: Cuenta): void {
    this.api.cuentaSeleccionada.set(cuenta);
    this.router.navigate(['/cuenta', cuenta.id]);
  }

  tieneSoporte(c: Cuenta): boolean {
    return !!c.link && ((c.tiene_soporte === true || c.tiene_soporte === 1) || !!c.link);
  }

  async verSoporte(c: Cuenta, ev: Event): Promise<void> {
    ev.stopPropagation();
    const url = this.api.fileUrl(c.link);
    if (url) await Browser.open({ url });
  }

  /** Días desde hoy hasta el vencimiento (negativo = vencida; +∞ si no hay fecha). */
  dias(fecha?: string): number {
    if (!fecha) return Number.MAX_SAFE_INTEGER;
    const parts = fecha.substring(0, 10).split('-').map(Number);
    if (parts.length < 3 || !parts[0]) return Number.MAX_SAFE_INTEGER;
    const fv = new Date(parts[0], parts[1] - 1, parts[2]);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((fv.getTime() - hoy.getTime()) / 86400000);
  }

  urgencia(c: Cuenta): Urgencia {
    const d = this.dias(c.fecha_vencimiento);
    if (d === Number.MAX_SAFE_INTEGER) return { cls: 'none', label: 'Sin fecha', dias: d };
    if (d < 0) return { cls: 'vencida', label: `Vencida (${Math.abs(d)}d)`, dias: d };
    if (d === 0) return { cls: 'hoy', label: 'Vence hoy', dias: d };
    if (d <= 3) return { cls: 'pronto', label: `Vence en ${d}d`, dias: d };
    if (d <= 7) return { cls: 'semana', label: `Vence en ${d}d`, dias: d };
    return { cls: 'ok', label: `Vence en ${d}d`, dias: d };
  }

  compact(v: number | null | undefined): string {
    const n = Number(v ?? 0) || 0;
    if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'MM';
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
    return '$' + n;
  }
}
