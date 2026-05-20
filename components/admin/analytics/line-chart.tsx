/**
 * Server-rendered SVG line chart. Hand-rolled to avoid a recharts/
 * d3 dependency for what's a simple geometry problem.
 *
 * Renders:
 *   • An x-axis baseline with first/last/middle date ticks
 *   • A y-axis with the max value labelled
 *   • A polyline connecting all points
 *   • Circles at each data point with <title> for hover tooltip
 *
 * Sized via the viewBox so it scales to its container. Falls back
 * gracefully when the dataset has 0 or 1 point — single points
 * render as a centred dot.
 *
 * Used by metric 1 (Daily page views) and metric 4 (Inquiries series).
 */

type Point = { day: string; value: number };

export function LineChart({
  points,
  label,
  height = 200,
}: {
  /** Pre-sorted ascending by day. */
  points: Point[];
  /** Human-readable name of the series (used in tooltip + a11y). */
  label: string;
  height?: number;
}) {
  // Empty case — should be gated upstream via isEmpty, but render
  // a stable placeholder if it slips through.
  if (points.length === 0) {
    return (
      <div
        role="img"
        aria-label={`${label} chart, no data`}
        className="grid place-items-center border border-dashed border-[var(--color-line)] text-[13px] text-[var(--color-ink-3)]"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  // viewBox dimensions chosen to give nice px math. The real render
  // size is governed by the parent's width + the `height` prop via
  // preserveAspectRatio.
  const W = 600;
  const H = 200;
  const padL = 32; // y-label space
  const padR = 8;
  const padT = 12;
  const padB = 24; // x-tick space
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const minValue = 0;

  // X position is index-based (uniform spacing). For very sparse
  // data this is the most readable; the actual day shows in the
  // tooltip + axis ticks.
  const xAt = (i: number) =>
    points.length === 1
      ? padL + innerW / 2
      : padL + (i / (points.length - 1)) * innerW;
  const yAt = (v: number) =>
    padT + innerH - ((v - minValue) / (maxValue - minValue)) * innerH;

  const polylinePoints = points
    .map((p, i) => `${xAt(i)},${yAt(p.value)}`)
    .join(" ");

  // X-axis tick selection: first, last, and approx middle. Skip
  // duplicates when the series is short.
  const tickIndexes = uniqueAsc(
    [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(
      (i) => i >= 0 && i < points.length,
    ),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${label} line chart`}
      className="w-full"
      style={{ height }}
    >
      {/* y-axis baseline tick */}
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

      {/* x-axis baseline */}
      <line
        x1={padL}
        y1={H - padB}
        x2={W - padR}
        y2={H - padB}
        style={{ stroke: "var(--color-line)" }}
      />

      {/* gridline at max */}
      <line
        x1={padL}
        y1={yAt(maxValue)}
        x2={W - padR}
        y2={yAt(maxValue)}
        strokeDasharray="2,4"
        style={{ stroke: "var(--color-line)" }}
      />

      {/* x-axis tick labels */}
      {tickIndexes.map((i) => (
        <text
          key={i}
          x={xAt(i)}
          y={H - padB + 14}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
          className="num"
          style={{ fontSize: 11, fill: "var(--color-ink-3)" }}
        >
          {formatShortDate(points[i].day)}
        </text>
      ))}

      {/* the line itself */}
      {points.length > 1 ? (
        <polyline
          points={polylinePoints}
          fill="none"
          style={{ stroke: "var(--color-coral)", strokeWidth: 1.5 }}
        />
      ) : null}

      {/* data points */}
      {points.map((p, i) => (
        <circle
          key={p.day}
          cx={xAt(i)}
          cy={yAt(p.value)}
          r={2.5}
          style={{ fill: "var(--color-coral)" }}
        >
          <title>
            {`${formatLongDate(p.day)} — ${p.value} ${label.toLowerCase()}`}
          </title>
        </circle>
      ))}
    </svg>
  );
}

function uniqueAsc(arr: number[]): number[] {
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

/** "2026-05-20" → "May 20". Used on x-axis tick labels. */
function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-05-20" → "May 20, 2026". Used inside hover tooltips. */
function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
