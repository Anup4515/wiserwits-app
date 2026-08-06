import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Polyline, Line, Circle as Dot, Text as SvgText } from "react-native-svg";
import { colors, palette, spacing, typography } from "@/theme";

/**
 * Lightweight glanceable charts built on `react-native-svg` (plan §3). Custom
 * SVG rather than a chart lib keeps full control over the mock's ring/donut/
 * sparkline look and avoids empty-data runtime surprises.
 */

// ── ProgressRing — a single 0–100 value as a ring with a centred label ──────
export function ProgressRing({
  value,
  size = 132,
  stroke = 13,
  color = colors.navy,
  track = palette.primary50,
  centerLabel,
  centerSub,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  centerLabel?: string;
  centerSub?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  const offset = circ * (1 - v / 100);
  const c = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{centerLabel ?? `${Math.round(v)}%`}</Text>
        {centerSub ? <Text style={styles.ringSub}>{centerSub}</Text> : null}
      </View>
    </View>
  );
}

// ── Donut — multiple segments (e.g. present / late / absent) ─────────────────
export interface DonutSegment {
  value: number;
  color: string;
}

export function Donut({
  segments,
  size = 132,
  stroke = 16,
  centerLabel,
  centerSub,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const c = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={palette.primary50} strokeWidth={stroke} fill="none" />
        {segments.map((s, i) => {
          if (s.value <= 0) return null;
          const frac = s.value / total;
          const dash = frac * circ;
          const gap = circ - dash;
          const rotation = (acc / total) * 360 - 90;
          acc += s.value;
          return (
            <Circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              stroke={s.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="butt"
              transform={`rotate(${rotation} ${c} ${c})`}
            />
          );
        })}
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{centerLabel ?? ""}</Text>
        {centerSub ? <Text style={styles.ringSub}>{centerSub}</Text> : null}
      </View>
    </View>
  );
}

// ── TrendChart — a small sparkline of monthly percentages ────────────────────
export function TrendChart({
  points,
  height = 120,
  color = colors.navy,
  domain = "fixed",
  formatValue = (v) => `${Math.round(v)}%`,
}: {
  points: { label: string; value: number }[];
  height?: number;
  color?: string;
  /**
   * Y-axis scaling. "fixed" pins 0–100 (percentages, e.g. attendance). "auto"
   * fits the axis snugly around the data with a little padding — for series
   * that live in a narrow band (e.g. BMI ~18–30) where a 0–100 axis would
   * flatten every change into a straight line.
   */
  domain?: "fixed" | "auto";
  /** Format for the value shown above each point (default a percentage). */
  formatValue?: (v: number) => string;
}) {
  const [width, setWidth] = useState(0);
  if (points.length === 0) return null;

  const padX = 10;
  // Extra top padding leaves room for the value label that sits above each dot.
  const padTop = 24;
  const padBottom = 22;
  const chartH = height - padTop - padBottom;
  const usableW = Math.max(width - padX * 2, 1);

  // Resolve the y-range. Auto fits the data (min span of 4 so a truly flat
  // series still sits mid-chart rather than exaggerating rounding noise).
  const values = points.map((p) => p.value);
  let minV = 0;
  let maxV = 100;
  if (domain === "auto") {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max((hi - lo) * 0.5, 2);
    minV = lo - pad;
    maxV = hi + pad;
  }
  const span = maxV - minV || 1;

  const xFor = (i: number) =>
    points.length === 1 ? padX + usableW / 2 : padX + (usableW * i) / (points.length - 1);
  const yFor = (v: number) =>
    padTop + chartH * (1 - (Math.max(minV, Math.min(maxV, v)) - minV) / span);

  const gridLines = [minV, (minV + maxV) / 2, maxV];
  const polyline = points.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(" ");

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {gridLines.map((g) => (
            <Line
              key={g}
              x1={padX}
              x2={width - padX}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}
          <Polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Dot key={i} cx={xFor(i)} cy={yFor(p.value)} r={3.5} fill={color} />
          ))}
          {/* Value above each point so the graph is readable on its own. */}
          {points.map((p, i) => (
            <SvgText
              key={`v${i}`}
              x={xFor(i)}
              y={Math.max(yFor(p.value) - 8, 10)}
              fontSize={10}
              fontWeight="700"
              fill={colors.ink}
              textAnchor="middle"
            >
              {formatValue(p.value)}
            </SvgText>
          ))}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      <View style={styles.trendLabels}>
        {points.map((p, i) => (
          <Text key={i} style={styles.trendLabel}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── BarRow — a labelled horizontal bar (0–100), for holistic dims / subjects ─
export function BarRow({
  label,
  value,
  color = colors.navy,
  valueLabel,
}: {
  label: string;
  value: number;
  color?: string;
  valueLabel?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${v}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{valueLabel ?? `${Math.round(v)}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: { fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  ringSub: { ...typography.caption, color: colors.textMuted, marginTop: 1 },

  trendLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 },
  trendLabel: { ...typography.caption, color: colors.textMuted },

  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  barLabel: { ...typography.label, color: colors.text, width: 96 },
  barTrack: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: palette.primary50,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 999 },
  barValue: { ...typography.label, color: colors.textMuted, width: 40, textAlign: "right" },
});
