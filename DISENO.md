# Sistema de diseño — Revisor CxP

Guía de referencia del rediseño profesional. **Toda** la UI sale de tokens en
`src/theme/variables.scss`; los componentes no usan valores fijos. Claro y oscuro
siguen el tema del sistema (`prefers-color-scheme`).

## Identidad
- **Base de marca:** grafito / plomo (`--grafito-900…200`).
- **Acento interactivo (azul):** botones principales, chips activos, pestaña activa, enlaces.
  - Claro `--accent: #2563EB` · Oscuro `--accent: #60A5FA`.
- **Semánticos:** verde solo aprobar/éxito, rojo solo negar/vencido, ámbar/naranja urgencia.

## Paleta

| Token | Claro | Oscuro | Uso |
|-------|-------|--------|-----|
| `--accent` | #2563EB | #60A5FA | Interactivo |
| `--success` | #16A34A | #22C55E | Aprobar/éxito |
| `--danger` | #DC2626 | #F05252 | Negar/vencido |
| `--warning` | #D97706 | #F59E0B | Aviso/urgencia |
| `--bg` | #EEF1F5 | #0F1115 | Fondo |
| `--surface` | #FFFFFF | #171A21 | Tarjetas / superficie |
| `--surface-2` | #F7F9FC | #1B1F28 | Superficie secundaria |
| `--surface-elev` | #FFFFFF | #1E222B | Superficie elevada |
| `--border` | rgba(17,24,39,.08) | rgba(255,255,255,.09) | Bordes 1px |
| `--text` | #111827 | #F3F4F6 | Texto principal |
| `--text-2` | #4B5563 | #C7CBD1 | Secundario |
| `--text-3` | #6B7280 | #9AA0AA | Terciario/muted |
| `--header-a/-b` | #2D3542 / #1C212B | #1A1F27 / #0F1115 | Degradado del header grafito |

**Urgencia:** `--u-vencida` (rojo), `--u-hoy` (naranja), `--u-pronto`/`--u-semana` (ámbar), `--u-ok` (verde), `--u-none` (gris). Cada uno con su variante `-soft` para fondos.

**Gráficos:** `--chart-1…8` (azul, celeste, verde, ámbar, rojo, violeta, teal, rosa), vivos y distinguibles en ambos modos; nunca el gris de marca como color de datos. `--chart-grid`, `--chart-text` para ejes.

En oscuro hay **3 niveles de superficie** sobre fondo grafito (`--bg` → `--surface` → `--surface-elev`), no negro plano, con bordes sutiles de 1px.

## Tipografía
- **Inter**, empaquetada local con `@fontsource/inter` (pesos 400/500/600/700). Sin CDN.
- Números tabulares en montos/fechas/contadores: clase `.tnum` (`font-variant-numeric: tabular-nums`).
- Escala: `--fs-12 / -13 / -15 / -17 / -20 / -28 / -34`. Texto principal 15px. Nada < 12px.
- Pesos: `--fw-medium 500`, `--fw-semibold 600`, `--fw-bold 700`. Montos destacados en 700.
- Contraste objetivo WCAG AA (4.5:1) en ambos modos.

## Espaciado, radios, sombras, movimiento
- Espaciado: `--sp-4/8/12/16/24/32`.
- Radios: `--r-8/12/16`, `--r-pill`.
- Sombras: `--shadow-1` (sutil), `--shadow-2` (elevada); adaptadas por modo.
- Movimiento: `--dur 200ms`, `--dur-fast 150ms`, `--ease`. Todo respeta `prefers-reduced-motion` (global.scss desactiva animaciones/transiciones).

## Iconografía
Solo **ionicons outline**, tamaños 18 / 20 / 24. Área táctil mínima 44px.

## Componentes compartidos (`src/app/shared/`)
- `KpiCard` (`app-kpi-card`): tarjeta KPI con contador animado (rAF, respeta reduced-motion). `tone` = `card`|`header`, `accent`, `format` = `cop`|`compact`|`int`.
- `UrgencyBadge` (`app-urgency-badge`): insignia de urgencia (`cls`, `label`).
- `EstadoBadge` (`app-estado-badge`): insignia de estado de la cuenta.
- `EmpresaBadge` (`app-empresa-badge`): abreviatura de empresa.
- `FilterChip` (`app-filter-chip`): chip de filtro con contador, combinable (`active`, `count`, `color`, `toggle`).
- `GroupHeader` (`app-group-header`): encabezado de grupo sticky con contador, total y checkbox opcional (multiselección).
- `EmptyState` (`app-empty-state`): estado vacío ilustrado con ícono + acción proyectada.
- `Skeleton` (`app-skeleton`): bloque con shimmer.
- `ActionBar` (`app-action-bar`): barra de acciones fija inferior con safe-area y animación de entrada.

Superficies globales, toolbar grafito (`.grafito-toolbar`), tab bar y utilidades (`.tnum`, `.animate-in`, keyframes) en `src/global.scss`.

## Reglas de aplicación
- Cero valores hex/px sueltos en componentes: usar tokens.
- Montos siempre COP, alineados a la derecha; el monto es el dato visual más fuerte de cada fila.
- Estado presionado visible en filas/botones; transiciones 150–250 ms; entrada escalonada de filas.
- Safe-area (`env(safe-area-inset-*)`) en barras fijas y en horizontal (notch).
