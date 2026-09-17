import {
  Component, ChangeDetectionStrategy, input, signal, computed, effect, untracked, inject, DestroyRef,
} from '@angular/core';

/** Tarjeta KPI con contador animado (respeta prefers-reduced-motion). */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kpi" [attr.data-tone]="tone()">
      <span class="l">{{ label() }}</span>
      <span class="v tnum">{{ shown() }}</span>
      @if (sub()) { <span class="s">{{ sub() }}</span> }
    </div>`,
  styles: [`
    .kpi{display:flex;flex-direction:column;gap:2px;padding:var(--sp-12);border-radius:var(--r-12);min-width:0}
    .l{font-size:var(--fs-12);font-weight:var(--fw-medium);letter-spacing:.3px;text-transform:uppercase;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v{font-size:var(--fs-20);font-weight:var(--fw-bold);line-height:1.1;white-space:nowrap}
    .s{font-size:var(--fs-12)}
    /* Sobre header grafito */
    .kpi[data-tone=header]{background:var(--header-tile);border:1px solid var(--header-tile-border)}
    .kpi[data-tone=header] .l{color:var(--on-header-dim)} .kpi[data-tone=header] .v{color:var(--on-header)} .kpi[data-tone=header] .s{color:var(--on-header-dim)}
    .kpi[data-tone=header].accent .v{color:#8fb8ff}
    .kpi[data-tone=header].success .v{color:#7ff0b0}
    /* Sobre superficie */
    .kpi[data-tone=card]{background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow-1)}
    .kpi[data-tone=card] .l{color:var(--text-3)} .kpi[data-tone=card] .v{color:var(--text)} .kpi[data-tone=card] .s{color:var(--text-3)}
    .kpi[data-tone=card].accent .v{color:var(--accent)}
    .kpi[data-tone=card].success .v{color:var(--success)}
    .kpi[data-tone=card].warning .v{color:var(--warning)}
    .kpi[data-tone=card].danger .v{color:var(--danger)}
  `],
  host: { '[class]': 'accentClass()' },
})
export class KpiCard {
  label = input('');
  value = input<number>(0);
  sub = input('');
  tone = input<'card' | 'header'>('card');
  accent = input<'default' | 'accent' | 'success' | 'warning' | 'danger'>('default');
  format = input<'cop' | 'compact' | 'int'>('compact');
  animate = input(true);

  private display = signal(0);
  readonly shown = computed(() => this.fmt(this.display()));
  readonly accentClass = computed(() => (this.accent() === 'default' ? '' : this.accent()));
  private raf = 0;

  constructor() {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    effect(() => {
      const target = this.value() || 0;
      const from = untracked(() => this.display());
      if (!this.animate() || reduce) { this.display.set(target); return; }
      cancelAnimationFrame(this.raf);
      const start = performance.now();
      const dur = 700;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        this.display.set(from + (target - from) * eased);
        if (p < 1) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.raf));
  }

  private fmt(n: number): string {
    const f = this.format();
    if (f === 'int') return String(Math.round(n));
    if (f === 'cop') return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    const v = Math.round(n);
    if (v >= 1_000_000_000) return '$' + (v / 1_000_000_000).toFixed(1) + 'MM';
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '$' + Math.round(v / 1_000) + 'K';
    return '$' + v;
  }
}
