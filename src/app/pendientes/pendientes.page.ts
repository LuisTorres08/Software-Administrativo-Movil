import { Component, inject, signal } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  attachOutline,
  calendarOutline,
  chevronForwardOutline,
  fileTrayOutline,
} from 'ionicons/icons';
import type { RefresherCustomEvent } from '@ionic/angular';
import { ApiService, ResumenCxp } from '../core/api.service';
import { Cuenta } from '../core/models';
import { formatCOP, formatDate } from '../core/format';

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

  readonly cop = formatCOP;
  readonly fecha = formatDate;

  constructor() {
    addIcons({
      attachOutline,
      calendarOutline,
      chevronForwardOutline,
      fileTrayOutline,
    });
  }

  ionViewWillEnter(): void {
    this.cargar();
    this.cargarResumen();
  }

  onSegment(value: string): void {
    this.filtro.set(value === 'REVISADO' ? 'REVISADO' : 'PENDIENTE');
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
    this.api.getResumen().subscribe({
      next: (r) => this.resumen.set(r),
      error: () => {},
    });
  }

  abrir(cuenta: Cuenta): void {
    this.api.cuentaSeleccionada.set(cuenta);
    this.router.navigate(['/cuenta', cuenta.id]);
  }

  tieneSoporte(c: Cuenta): boolean {
    return c.tiene_soporte === true || c.tiene_soporte === 1;
  }

  /** Monto compacto para las tarjetas del resumen: $4.0M, $850K, $1.2MM. */
  compact(v: number | null | undefined): string {
    const n = Number(v ?? 0) || 0;
    if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'MM';
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
    return '$' + n;
  }
}
