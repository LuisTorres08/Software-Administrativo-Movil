import { Component, computed, inject, signal, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  openOutline,
  calendarOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { Browser } from '@capacitor/browser';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Cuenta, Pago, Retenciones } from '../core/models';
import { formatCOP, formatDate, toNumber } from '../core/format';
import { EstadoBadge, EmpresaBadge, ActionBar, Skeleton, EmptyState } from '../shared';

/** Límites de días para clasificar la urgencia por vencimiento. */
const LIM = { PRONTO: 3, SEMANA: 7 } as const;
const INF = Number.MAX_SAFE_INTEGER;

type UrgKey = 'vencida' | 'hoy' | 'pronto' | 'semana' | 'ok' | 'none';

@Component({
  selector: 'app-cuenta-detalle',
  templateUrl: 'cuenta-detalle.page.html',
  styleUrls: ['cuenta-detalle.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonIcon,
    EstadoBadge,
    EmpresaBadge,
    ActionBar,
    Skeleton,
    EmptyState,
  ],
})
export class CuentaDetallePage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  @Input() id!: string;

  readonly cuenta = signal<Cuenta | null>(null);
  readonly retenciones = signal<Retenciones | null>(null);
  readonly pagos = signal<Pago[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly exito = signal(false);

  readonly cop = formatCOP;
  readonly fecha = formatDate;

  constructor() {
    addIcons({
      documentTextOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      openOutline,
      calendarOutline,
      checkmarkOutline,
    });
  }

  ngOnInit(): void {
    const idNum = Number(this.id);
    const seleccionada = this.api.cuentaSeleccionada();
    if (seleccionada && seleccionada.id === idNum) {
      this.cuenta.set(seleccionada);
      this.loading.set(false);
      this.cargarDetalle(idNum);
    } else {
      this.recuperarCuenta(idNum);
    }
  }

  private recuperarCuenta(idNum: number): void {
    // Sin la cuenta en memoria: la buscamos en las bandejas conocidas.
    this.loading.set(true);
    const estados = ['PENDIENTE', 'REVISADO'];
    let pendientes = estados.length;
    let encontrada = false;
    estados.forEach((estado) => {
      this.api.getCuentas(estado).subscribe({
        next: (data) => {
          const found = data.find((c) => c.id === idNum);
          if (found && !encontrada) {
            encontrada = true;
            this.cuenta.set(found);
            this.cargarDetalle(idNum);
          }
          if (--pendientes === 0) {
            this.loading.set(false);
            if (!encontrada) this.cargarDetalle(idNum);
          }
        },
        error: () => {
          if (--pendientes === 0) this.loading.set(false);
        },
      });
    });
  }

  private cargarDetalle(idNum: number): void {
    this.api.getRetenciones(idNum).subscribe({
      next: (r) => this.retenciones.set(r),
      error: () => this.retenciones.set(null),
    });
    this.api.getPagos(idNum).subscribe({
      next: (p) => this.pagos.set(p),
      error: () => this.pagos.set([]),
    });
  }

  get tieneRetenciones(): boolean {
    const r = this.retenciones();
    return !!r && (toNumber(r.total_retenciones) > 0 || toNumber(r.valor_neto) > 0);
  }

  // ── Progreso de pago (pagado vs. solicitado) ──
  readonly progreso = computed(() => {
    const c = this.cuenta();
    const solicitado = toNumber(c?.valor_solicitado);
    const pagado = toNumber(c?.valor_pagado);
    const pendiente = toNumber(c?.valor_pendiente);
    const pct = solicitado > 0 ? Math.min(100, Math.max(0, (pagado / solicitado) * 100)) : 0;
    return { solicitado, pagado, pendiente, pct };
  });

  // ── Aviso de vencimiento (clase de urgencia + etiqueta legible) ──
  readonly venc = computed<{ cls: UrgKey; label: string }>(() => {
    const d = this.dias(this.cuenta()?.fecha_vencimiento);
    const cls = this.urgKey(d);
    if (d === INF) return { cls, label: 'Sin fecha de vencimiento' };
    const f = formatDate(this.cuenta()?.fecha_vencimiento);
    if (d < 0) {
      const n = -d;
      return { cls, label: `Vencida hace ${n} ${n === 1 ? 'día' : 'días'} (${f})` };
    }
    if (d === 0) return { cls, label: `Vence hoy (${f})` };
    return { cls, label: `Vence en ${d} ${d === 1 ? 'día' : 'días'} (${f})` };
  });

  private dias(fecha?: string): number {
    if (!fecha) return INF;
    const p = String(fecha).substring(0, 10).split('-').map(Number);
    if (p.length < 3 || !p[0]) return INF;
    const fv = new Date(p[0], p[1] - 1, p[2]);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((fv.getTime() - hoy.getTime()) / 86400000);
  }

  private urgKey(d: number): UrgKey {
    if (d === INF) return 'none';
    if (d < 0) return 'vencida';
    if (d === 0) return 'hoy';
    if (d <= LIM.PRONTO) return 'pronto';
    if (d <= LIM.SEMANA) return 'semana';
    return 'ok';
  }

  async abrirSoporte(path: string | undefined | null): Promise<void> {
    const url = this.api.fileUrl(path);
    if (!url) return;
    await Browser.open({ url });
  }

  async confirmar(estado: 'REVISADO' | 'APROBADO' | 'NEGADO'): Promise<void> {
    const etiqueta =
      estado === 'REVISADO' ? 'Marcar como revisado' : estado === 'APROBADO' ? 'Aprobar' : 'Negar';
    const alert = await this.alertCtrl.create({
      header: etiqueta,
      message: `¿Confirmas la acción "${etiqueta}" para esta cuenta?`,
      inputs: [
        {
          name: 'observacion',
          type: 'textarea',
          placeholder: 'Observación (opcional)',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          role: 'confirm',
          handler: (data: { observacion?: string }) => {
            this.ejecutar(estado, data?.observacion ?? '');
          },
        },
      ],
    });
    await alert.present();
  }

  private ejecutar(estado: string, observacion: string): void {
    const c = this.cuenta();
    if (!c) return;
    this.saving.set(true);
    const usuario = this.auth.usuario;
    this.api.updateEstado(c.id, estado, usuario, observacion).subscribe({
      next: async () => {
        this.saving.set(false);
        this.api.cuentaSeleccionada.set(null);
        this.exito.set(true);
        await this.mostrarToast('Cuenta actualizada correctamente.', 'success');
        setTimeout(() => {
          this.router.navigate(['/tabs/pendientes'], { replaceUrl: true });
        }, 700);
      },
      error: async (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'No se pudo actualizar la cuenta.';
        await this.mostrarToast(msg, 'danger');
      },
    });
  }

  private async mostrarToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, duration: 2500 });
    await toast.present();
  }
}
