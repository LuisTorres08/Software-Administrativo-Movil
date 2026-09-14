const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formatea un valor numérico (o string numérico) como pesos colombianos. */
export function formatCOP(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return COP.format(n);
}

/** Convierte a número de forma segura (los totales pueden venir como string). */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return isNaN(n) ? 0 : n;
}

/** Formatea una fecha ISO a dd/mm/aaaa (es-CO). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
