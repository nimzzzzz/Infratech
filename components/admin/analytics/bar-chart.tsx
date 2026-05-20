/**
 * Server-rendered SVG bar chart. Supports single-series (one
 * bar per label, used by the time-to-publish histogram) and
 * stacked multi-series (each bar a stack of coloured segments,
 * used by submissions throughput + admin activity).
 *
 * Hand-rolled to match the LineChart primitive — zero deps, theme
 * tokens for colour, <title> tooltips for hover.
 */

export type BarSegment = {
  /** Series key — drives the legend label + segment color. */
  key: string;
  value: number;
  /** Tailwind-token CSS color. Defaults to coral on the first
   *  segment, ink-3 on later ones. Callers pass colors per series
   *  for legible stacking. */
  color?: string;
};

export type Bar = {
  label: string;
  /** Optional longer label used in the hover tooltip; defaults
   *  to `label`. Useful when the visible tick label is "May 14"
   *  but the tooltip wants "May 14, 2026". */
  tooltipLabel?: string;
  segments: BarSegment[];
};

const DEFAULT_FILL = "var(--color-coral)";

export function BarChart({
  bars,
  yAxisLabel,
  height = 200,
}: {
  bars: Bar[];
  yAxisLabel?: string;
  height?: number;
}) {
  if (bars.length === 0) {
    return (
      <div
        role="img"
        aria-label={`${yAxisLabel ?? "Bar chart"}, no data`}
        className="grid place-items-center border border-dashed border-[var(--color-line)] text-[13px] text-[var(--color-ink-3)]"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const padL = 32;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxValue = Math.max(
    1,
    ...bars.map((b) => b.segments.reduce((s, seg) => s + seg.value, 0)),
  );

  const barCount = bars.length;
  const slotW = innerW / barCount;
  const barW = Math.max(4, slotW * 0.68);

  const yAt = (v: number) => padT + innerH - (v / maxValue) * innerH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={yAxisLabel ?? "Bar chart"}
      className="w-full"
      style={{ height }}
    >
      {/* y-axis ticks: 0 + max */}
      <text
        x={padL - 6}
        y={yAt(maxValue) + 4}
        textAnchor="end"
        className="num"
        style={{ fontSize: 11, fill: "var(--color-ink-3)" }}
      >
        {maxValue}
      </text>
      <text
        x={padL - 6}
        y={yAt(0) + 4}
        textAnchor="end"
        className="num"
        style={{ fontSize: 11, fill: "var(--color-ink-3)" }}
      >
        0
      </text>

      {/* baseline */}
      <line
        x1={padL}
        y1={H - padB}
        x2={W - padR}
        y2={H - padB}
        style={{ stroke: "var(--color-line)" }}
      />

      {/* dashed gridline at max */}
      <line
        x1={padL}
        y1={yAt(maxValue)}
        x2={W - padR}
        y2={yAt(maxValue)}
        strokeDasharray="2,4"
        style={{ stroke: "var(--color-line)" }}
      />

      {/* bars */}
      {bars.map((bar, i) => {
        const cx = padL + i * slotW + slotW / 2;
        const x = cx - barW / 2;
        const total = bar.segments.reduce((s, seg) => s + seg.value, 0);
        // Stack from bottom up.
        let cumulative = 0;
        const tooltip = bar.tooltipLabel ?? bar.label;
        return (
          <g key={`${bar.label}-${i}`}>
            {bar.segments.map((seg, segIdx) => {
              const y = yAt(cumulative + seg.value);
              const h = (seg.value / maxValue) * innerH;
              cumulative += seg.value;
              return (
                <rect
                  key={`${seg.key}-${segIdx}`}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(0, h)}
                  style={{ fill: seg.color ?? DEFAULT_FILL }}
                >
                  <title>{`${tooltip} — ${seg.key}: ${seg.value}`}</title>
                </rect>
              );
            })}
            {/* aggregate tooltip on a thin invisible rect over the
                whole bar so hovering the gap between segments still
                resolves to the total */}
            {bar.segments.length > 1 ? (
              <rect
                x={x}
                y={padT}
                width={barW}
                height={innerH}
                fill="transparent"
              >
                <title>{`${tooltip} — total ${total}`}</title>
              </rect>
            ) : null}
            <text
              x={cx}
              y={H - padB + 14}
              textAnchor="middle"
              className="num"
              style={{ fontSize: 11, fill: "var(--color-ink-3)" }}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Stacked-bar palette. Stable per-key colors across renders so the
 * legend matches the bars. Callers pre-map their series keys to a
 * color from this palette before constructing Bars.
 */
export const STACKED_PALETTE: ReadonlyArray<string> = [
  "var(--color-coral)",
  "var(--color-magenta)",
  "var(--color-ink-2)",
  "var(--color-ink-3)",
  "#7AA487",
  "#A38BC8",
];

/** Render a legend below a stacked chart. */
export function BarChartLegend({
  items,
}: {
  items: { key: string; color: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <li
          key={it.key}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-ink-3)]"
        >
          <span
            aria-hidden
            className="inline-block h-2 w-2"
            style={{ background: it.color }}
          />
          {it.key}
        </li>
      ))}
    </ul>
  );
}
