import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  fileTrayOutline, checkmarkDoneCircleOutline, funnelOutline, searchOutline, alertCircleOutline,
} from 'ionicons/icons';

/** Encabezado de grupo (sticky) con contador, total y checkbox opcional. */
@Component({
  selector: 'app-group-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gh" [attr.data-c]="color()">
      <span class="bar"></span>
      @if (selectable()) {
        <button class="ck" [class.on]="checked()" [class.mid]="indeterminate()" (click)="toggle.emit()" type="button" aria-label="Seleccionar grupo">
          <span class="tick"></span>
        </button>
      }
      <span class="t">{{ title() }}</span>
      @if (count() !== null && count() !== undefined) { <span class="n">{{ count() }}</span> }
      <span class="sp"></span>
      @if (total()) { <span class="tot tnum">{{ money(total()) }}</span> }
    </div>`,
  styles: [`
    .gh{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:var(--sp-8);
      padding:var(--sp-8) var(--sp-16);background:var(--surface-2);border-bottom:1px solid var(--border);
      backdrop-filter:saturate(1.1)}
    .bar{width:3px;height:14px;border-radius:var(--r-pill);background:var(--u-none)}
    .gh[data-c=vencida] .bar{background:var(--u-vencida)} .gh[data-c=hoy] .bar{background:var(--u-hoy)}
    .gh[data-c=pronto] .bar{background:var(--u-pronto)} .gh[data-c=semana] .bar{background:var(--u-semana)}
    .gh[data-c=ok] .bar{background:var(--u-ok)} .gh[data-c=accent] .bar{background:var(--accent)}
    .t{font-size:var(--fs-13);font-weight:var(--fw-bold);letter-spacing:.3px;text-transform:uppercase;color:var(--text-2)}
    .n{font-size:var(--fs-12);font-weight:var(--fw-bold);color:var(--text-3);background:var(--surface-sunken);border-radius:var(--r-pill);padding:1px 8px}
    .sp{flex:1}
    .tot{font-size:var(--fs-13);font-weight:var(--fw-bold);color:var(--text-2)}
    .ck{width:22px;height:22px;border-radius:6px;border:2px solid var(--border-strong);background:var(--surface);
      display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex:0 0 auto}
    .ck .tick{width:11px;height:6px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) scale(0);transition:transform var(--dur-fast) var(--ease);margin-bottom:2px}
    .ck.on{background:var(--accent);border-color:var(--accent)} .ck.on .tick{transform:rotate(-45deg) scale(1)}
    .ck.mid{background:var(--accent);border-color:var(--accent)} .ck.mid .tick{transform:none;width:10px;height:2px;border:0;background:#fff;margin:0}
  `],
})
export class GroupHeader {
  title = input('');
  count = input<number | null | undefined>(undefined);
  total = input<number>(0);
  color = input<'vencida' | 'hoy' | 'pronto' | 'semana' | 'ok' | 'accent' | 'none'>('none');
  selectable = input(false);
  checked = input(false);
  indeterminate = input(false);
  toggle = output<void>();
  money(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
  }
}

/** Estado vacío ilustrado con ícono. Proyecta contenido para el botón de acción. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    <div class="es animate-in">
      <div class="ic"><ion-icon [name]="icon()"></ion-icon></div>
      <h3>{{ title() }}</h3>
      @if (message()) { <p>{{ message() }}</p> }
      <ng-content></ng-content>
    </div>`,
  styles: [`
    .es{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
      min-height:46vh;padding:var(--sp-24)}
    .ic{width:72px;height:72px;border-radius:var(--r-16);display:flex;align-items:center;justify-content:center;
      background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow-1);margin-bottom:var(--sp-16)}
    .ic ion-icon{font-size:34px;color:var(--accent)}
    h3{margin:0 0 var(--sp-4);font-size:var(--fs-17);font-weight:var(--fw-bold);color:var(--text)}
    p{margin:0 0 var(--sp-16);font-size:var(--fs-13);color:var(--text-3);max-width:280px}
  `],
})
export class EmptyState {
  icon = input('file-tray-outline');
  title = input('');
  message = input('');
  constructor() {
    addIcons({ fileTrayOutline, checkmarkDoneCircleOutline, funnelOutline, searchOutline, alertCircleOutline });
  }
}

/** Bloque skeleton con shimmer. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sk" [style.width]="w()" [style.height]="h()" [style.border-radius]="radius()"></span>`,
  styles: [`
    :host{display:block}
    .sk{display:block;background:var(--surface-sunken);
      background-image:linear-gradient(90deg,transparent 0,var(--pressed) 40px,transparent 80px);
      background-repeat:no-repeat;background-size:320px 100%;animation:shimmer 1.2s infinite linear}
  `],
})
export class Skeleton {
  w = input('100%');
  h = input('14px');
  radius = input('var(--r-8)');
}

/** Barra de acciones fija inferior (respeta safe-area). Proyecta los botones. */
@Component({
  selector: 'app-action-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="ab"><ng-content></ng-content></div>`,
  styles: [`
    :host{position:fixed;left:0;right:0;bottom:0;z-index:20;animation:slideUpBar var(--dur) var(--ease) both}
    .ab{display:flex;gap:var(--sp-12);align-items:center;
      padding:var(--sp-12) var(--sp-16);
      padding-bottom:calc(var(--sp-12) + env(safe-area-inset-bottom));
      padding-left:calc(var(--sp-16) + env(safe-area-inset-left));
      padding-right:calc(var(--sp-16) + env(safe-area-inset-right));
      background:var(--surface-elev);border-top:1px solid var(--border);box-shadow:0 -6px 18px rgba(0,0,0,.10)}
  `],
})
export class ActionBar {}
