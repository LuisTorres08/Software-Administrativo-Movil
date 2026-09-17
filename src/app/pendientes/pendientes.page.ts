import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon,
  IonSelect, IonSelectOption, IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentAttachOutline, documentOutline, chevronForwardOutline, businessOutline,
  swapVerticalOutline, warningOutline, closeCircleOutline,
} from 'ionicons/icons';
import type { RefresherCustomEvent } from '@ionic/angular';
import { Browser } from '@capacitor/browser';
import { ApiService, ResumenCxp } from '../core/api.service';
import { Cuenta } from '../core/models';
import { formatCOP, formatDate, toNumber } from '../core/format';
import {
  KpiCard, UrgencyBadge, EmpresaBadge, FilterChip, GroupHeader, EmptyState, Skeleton,
} from '../shared';

/** Límites de días para clasificar la urgencia (único lugar). */
const LIM = { PRONTO: 3, SEMANA: 7 } as const;
const INF = Number.MAX_SAFE_INTEGER;

type UrgKey = 'vencida' | 'hoy' | 'pronto' | 'semana' | 'ok' | 'none';
type Orden = 'prioridad' | 'empresa' | 'valor' | 'reciente';

interface Seccion {
  key: string;
  titulo: string;
  color: 'vencida' | 'hoy' | 'pronto' | 'semana' | 'ok' | 'accent' | 'none';
  header: boolean;
  items: Cuenta[];
  total: number;
}

const GRUPOS: { key: string; titulo: string; color: Seccion['color']; test: (d: number) => boolean }[] = [
  { key: 'vencida', titulo: 'Vencidas', color: 'vencida', test: (d) => d < 0 },
  { key: 'hoy', titulo: 'Vencen hoy', color: 'hoy', test: (d) => d === 0 },
  { key: 'pronto', titulo: 'Por vencer · próx. 3 días', color: 'pronto', test: (d) => d >= 1 && d <= LIM.PRONTO },
  { key: 'semana', titulo: 'Esta semana', color: 'semana', test: (d) => d > LIM.PRONTO && d <= LIM.SEMANA },
  { key: 'adelante', titulo: 'Más adelante', color: 'ok', test: (d) => d > LIM.SEMANA && d !== INF },
  { key: 'sinfecha', titulo: 'Sin fecha de vencimiento', color: 'none', test: (d) => d === INF },
];

const LS_KEY = 'pendientes.prefs.v1';

@Component({
  selector: 'app-pendientes',
  templateUrl: 'pendientes.page.html',
  styleUrls: ['pendientes.page.scss'],
  imports: [
    CommonModule, IonHeader, IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon,
    IonSelect, IonSelectOption, IonRefresher, IonRefresherContent,
    KpiCard, UrgencyBadge, EmpresaBadge, FilterChip, GroupHeader, EmptyState, Skeleton,
  ],
})
export class PendientesPage {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly filtro = signal<'PENDIENTE' | 'REVISADO'>('PENDIENTE');
  readonly cuentasPend = signal<Cuenta[]>([]);
  readonly cuentasRev = signal<Cuenta[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenCxp | null>(null);

  readonly empresaFiltro = signal<string>('');
  readonly chips = signal<UrgKey[]>([]);        // combinables (OR)
  readonly orden = signal<Orden>('prioridad');

  readonly nombre = (typeof localStorage !== 'undefined' && localStorage.getItem('nombre')) || '';
  readonly cop = formatCOP;
  readonly fecha = formatDate;
  readonly skeletons = Array.from({ length: 7 });

  constructor() {
    addIcons({
      documentAttachOutline, documentOutline, chevronForwardOutline, businessOutline,
      swapVerticalOutline, warningOutline, closeCircleOutline,
    });
    this.cargarPrefs();
    // Persistir preferencias
    effect(() => {
      const prefs = { orden: this.orden(), chips: this.chips(), empresa: this.empresaFiltro() };
      try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    });
  }

  // ── Cuentas del segmento activo ──
  readonly cuentasSegmento = computed(() =>
    this.filtro() === 'PENDIENTE' ? this.cuentasPend() : this.cuentasRev());

  readonly countPend = computed(() => this.cuentasPend().length);
  readonly countRev = computed(() => this.cuentasRev().length);

  // Empresas presentes (para el filtro)
  readonly empresas = computed(() => {
    const set = new Set<string>();
    for (const c of this.cuentasSegmento()) {
      const e = this.empresaNombre(c);
      if (e) set.add(e);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  // ¿el modelo trae fecha de creación? (habilita "Más recientes")
  readonly tieneReciente = computed(() => this.cuentasSegmento().some((c) => !!c.created_at));

  // Base con filtro de empresa (antes de chips) — para contar los chips
  readonly baseEmpresa = computed(() => {
    const ef = this.empresaFiltro();
    const l = this.cuentasSegmento();
    return ef ? l.filter((c) => this.empresaNombre(c) === ef) : l;
  });

  // Conteos por bucket de urgencia (respetan la empresa seleccionada)
  readonly chipCounts = computed(() => {
    const acc = { vencida: 0, hoy: 0, pronto: 0, semana: 0 };
    for (const c of this.baseEmpresa()) {
      const k = this.urgKey(this.dias(c.fecha_vencimiento));
      if (k in acc) (acc as Record<string, number>)[k]++;
    }
    return acc;
  });

  // Lista final: empresa + chips
  readonly base = computed(() => {
    const chips = this.chips();
    let l = this.baseEmpresa();
    if (chips.length) l = l.filter((c) => chips.includes(this.urgKey(this.dias(c.fecha_vencimiento))));
    return l;
  });

  readonly footerCount = computed(() => this.base().length);
  readonly footerTotal = computed(() => this.base().reduce((s, c) => s + toNumber(c.valor_solicitado), 0));
  readonly hayFiltros = computed(() => !!this.empresaFiltro() || this.chips().length > 0);

  // Banner de alerta (vencidas / hoy en el segmento)
  readonly banner = computed(() => {
    let vencidas = 0, hoy = 0, total = 0;
    for (const c of this.cuentasSegmento()) {
      const d = this.dias(c.fecha_vencimiento);
      if (d < 0) { vencidas++; total += toNumber(c.valor_solicitado); }
      else if (d === 0) { hoy++; total += toNumber(c.valor_solicitado); }
    }
    return { vencidas, hoy, total, mostrar: vencidas > 0 || hoy > 0 };
  });

  // Secciones (agrupadas/ordenadas)
  readonly secciones = computed<Seccion[]>(() => {
    const items = this.base();
    const porFecha = (a: Cuenta, b: Cuenta) => {
      const da = this.dias(a.fecha_vencimiento), db = this.dias(b.fecha_vencimiento);
      if (da !== db) return da - db;
      return toNumber(b.valor_solicitado) - toNumber(a.valor_solicitado);
    };
    const total = (arr: Cuenta[]) => arr.reduce((s, c) => s + toNumber(c.valor_solicitado), 0);

    if (this.orden() === 'valor') {
      const arr = items.slice().sort((a, b) => toNumber(b.valor_solicitado) - toNumber(a.valor_solicitado));
      return arr.length ? [{ key: 'all', titulo: '', color: 'none', header: false, items: arr, total: total(arr) }] : [];
    }
    if (this.orden() === 'reciente') {
      const arr = items.slice().sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
      return arr.length ? [{ key: 'all', titulo: '', color: 'none', header: false, items: arr, total: total(arr) }] : [];
    }
    if (this.orden() === 'empresa') {
      const map = new Map<string, Cuenta[]>();
      for (const c of items) {
        const e = this.empresaNombre(c) || 'Sin empresa';
        (map.get(e) ?? map.set(e, []).get(e)!).push(c);
      }
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([empresa, arr]) => ({
          key: 'e:' + empresa, titulo: empresa, color: 'accent' as const,
          header: true, items: arr.slice().sort(porFecha), total: total(arr),
        }));
    }
    // prioridad
    return GRUPOS
      .map((g) => {
        const arr = items.filter((c) => g.test(this.dias(c.fecha_vencimiento))).sort(porFecha);
        return { key: g.key, titulo: g.titulo, color: g.color, header: true, items: arr, total: total(arr) };
      })
      .filter((s) => s.items.length > 0);
  });

  ionViewWillEnter(): void { this.cargar(); }

  cargar(event?: RefresherCustomEvent): void {
    if (!event) this.loading.set(true);
    this.error.set(null);
    let left = 2;
    const done = () => { if (--left === 0) { this.loading.set(false); event?.target.complete(); } };
    this.api.getCuentas('PENDIENTE').subscribe({
      next: (d) => { this.cuentasPend.set(d); done(); },
      error: () => { this.error.set('No se pudieron cargar las cuentas.'); this.cuentasPend.set([]); done(); },
    });
    this.api.getCuentas('REVISADO').subscribe({
      next: (d) => { this.cuentasRev.set(d); done(); },
      error: () => { this.cuentasRev.set([]); done(); },
    });
    this.api.getResumen().subscribe({ next: (r) => this.resumen.set(r), error: () => {} });
  }

  onSegment(v: string): void {
    this.filtro.set(v === 'REVISADO' ? 'REVISADO' : 'PENDIENTE');
    // si el orden es "reciente" y el nuevo segmento no tiene fecha, cae a prioridad
    if (this.orden() === 'reciente' && !this.tieneReciente()) this.orden.set('prioridad');
  }

  toggleChip(k: UrgKey): void {
    const cur = this.chips();
    this.chips.set(cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);
  }
  chipActivo(k: UrgKey): boolean { return this.chips().includes(k); }

  aplicarBanner(): void { this.chips.set(['vencida', 'hoy']); }

  limpiarFiltros(): void { this.chips.set([]); this.empresaFiltro.set(''); }

  abrir(c: Cuenta): void {
    this.api.cuentaSeleccionada.set(c);
    this.router.navigate(['/cuenta', c.id]);
  }

  tieneSoporte(c: Cuenta): boolean { return !!c.link; }
  async verSoporte(c: Cuenta, ev: Event): Promise<void> {
    ev.stopPropagation();
    if (!c.link) return;
    const url = this.api.fileUrl(c.link);
    if (url) await Browser.open({ url });
  }

  // ── Urgencia ──
  empresaNombre(c: Cuenta): string { return (c.empresa || c.empresa_abreviatura || '').trim(); }

  dias(fecha?: string): number {
    if (!fecha) return INF;
    const p = String(fecha).substring(0, 10).split('-').map(Number);
    if (p.length < 3 || !p[0]) return INF;
    const fv = new Date(p[0], p[1] - 1, p[2]);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((fv.getTime() - hoy.getTime()) / 86400000);
  }

  urgKey(d: number): UrgKey {
    if (d === INF) return 'none';
    if (d < 0) return 'vencida';
    if (d === 0) return 'hoy';
    if (d <= LIM.PRONTO) return 'pronto';
    if (d <= LIM.SEMANA) return 'semana';
    return 'ok';
  }

  urgLabel(c: Cuenta): string {
    const d = this.dias(c.fecha_vencimiento);
    if (d === INF) return 'Sin fecha';
    if (d < 0) return `Vencida hace ${-d}d`;
    if (d === 0) return 'Hoy';
    return `En ${d}d`;
  }

  private cargarPrefs(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.orden) this.orden.set(p.orden);
      if (Array.isArray(p.chips)) this.chips.set(p.chips);
      if (typeof p.empresa === 'string') this.empresaFiltro.set(p.empresa);
    } catch { /* ignore */ }
  }
}
