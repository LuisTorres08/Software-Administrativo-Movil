import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/** Insignia de urgencia por vencimiento (usa tokens --u-*). */
@Component({
  selector: 'app-urgency-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ub" [attr.data-c]="cls()"><span class="dot"></span>{{ label() }}</span>`,
  styles: [`
    .ub{display:inline-flex;align-items:center;gap:var(--sp-4);font-size:var(--fs-12);
      font-weight:var(--fw-semibold);border-radius:var(--r-pill);padding:3px 9px;line-height:1;white-space:nowrap}
    .dot{width:6px;height:6px;border-radius:50%}
    .ub[data-c=vencida]{color:var(--u-vencida);background:var(--u-vencida-soft)} .ub[data-c=vencida] .dot{background:var(--u-vencida)}
    .ub[data-c=hoy]{color:var(--u-hoy);background:var(--u-hoy-soft)} .ub[data-c=hoy] .dot{background:var(--u-hoy)}
    .ub[data-c=pronto]{color:var(--u-pronto);background:var(--u-pronto-soft)} .ub[data-c=pronto] .dot{background:var(--u-pronto)}
    .ub[data-c=semana]{color:var(--u-semana);background:var(--u-semana-soft)} .ub[data-c=semana] .dot{background:var(--u-semana)}
    .ub[data-c=ok]{color:var(--u-ok);background:var(--u-ok-soft)} .ub[data-c=ok] .dot{background:var(--u-ok)}
    .ub[data-c=none]{color:var(--u-none);background:var(--u-none-soft)} .ub[data-c=none] .dot{background:var(--u-none)}
  `],
})
export class UrgencyBadge {
  cls = input<'vencida' | 'hoy' | 'pronto' | 'semana' | 'ok' | 'none'>('none');
  label = input('');
}

/** Insignia de estado de la cuenta. */
@Component({
  selector: 'app-estado-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="eb" [attr.data-e]="key()">{{ estado() }}</span>`,
  styles: [`
    .eb{display:inline-flex;align-items:center;font-size:var(--fs-12);font-weight:var(--fw-semibold);
      border-radius:var(--r-pill);padding:3px 9px;line-height:1;letter-spacing:.2px;text-transform:uppercase}
    .eb[data-e=pendiente]{color:var(--warning);background:var(--warning-soft)}
    .eb[data-e=revisado]{color:var(--accent);background:var(--accent-soft)}
    .eb[data-e=aprobado]{color:var(--success);background:var(--success-soft)}
    .eb[data-e=negado]{color:var(--danger);background:var(--danger-soft)}
    .eb[data-e=otro]{color:var(--text-3);background:var(--surface-sunken)}
  `],
})
export class EstadoBadge {
  estado = input('');
  key() {
    const e = (this.estado() || '').toUpperCase();
    if (e === 'PENDIENTE') return 'pendiente';
    if (e === 'REVISADO') return 'revisado';
    if (e === 'APROBADO') return 'aprobado';
    if (e === 'NEGADO') return 'negado';
    return 'otro';
  }
}

/** Insignia con la abreviatura de la empresa. */
@Component({
  selector: 'app-empresa-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="mb">{{ text() }}</span>`,
  styles: [`
    .mb{display:inline-flex;align-items:center;max-width:100%;font-size:var(--fs-12);font-weight:var(--fw-bold);
      color:var(--grafito-300);background:var(--surface-sunken);border:1px solid var(--border);
      border-radius:var(--r-8);padding:3px 8px;line-height:1.2;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  `],
})
export class EmpresaBadge {
  text = input('');
}

/** Chip de filtro con contador; combinable (toggle). */
@Component({
  selector: 'app-filter-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="fc" [class.on]="active()" [attr.data-c]="color()" (click)="toggle.emit()" type="button">
      <span class="t">{{ label() }}</span>
      @if (count() !== null && count() !== undefined) { <span class="n">{{ count() }}</span> }
    </button>`,
  styles: [`
    .fc{display:inline-flex;align-items:center;gap:var(--sp-8);height:34px;padding:0 12px;
      font-size:var(--fs-13);font-weight:var(--fw-semibold);color:var(--text-2);
      background:var(--surface);border:1px solid var(--border);border-radius:var(--r-pill);
      cursor:pointer;transition:background var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease),color var(--dur-fast) var(--ease);white-space:nowrap}
    .fc:active{transform:scale(.97)}
    .fc .n{font-size:var(--fs-12);font-weight:var(--fw-bold);min-width:18px;text-align:center;
      background:var(--surface-sunken);border-radius:var(--r-pill);padding:1px 6px;color:var(--text-3)}
    .fc.on{color:var(--on-accent);background:var(--accent);border-color:var(--accent)}
    .fc.on .n{background:rgba(255,255,255,.22);color:var(--on-accent)}
    .fc.on[data-c=danger]{background:var(--danger);border-color:var(--danger)}
    .fc.on[data-c=warning]{background:var(--warning);border-color:var(--warning)}
    .fc[data-c=danger]:not(.on){color:var(--danger)}
    .fc[data-c=warning]:not(.on){color:var(--warning)}
  `],
})
export class FilterChip {
  label = input('');
  count = input<number | null | undefined>(undefined);
  active = input(false);
  color = input<'accent' | 'danger' | 'warning' | 'neutral'>('accent');
  toggle = output<void>();
}
