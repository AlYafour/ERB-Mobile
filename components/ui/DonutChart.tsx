import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Denominator for the ring — defaults to the sum of segment values. Pass
   * the real total so an "other/unaccounted" remainder renders as track. */
  total?: number;
  size?: number;
  strokeWidth?: number;
  centerValue?: string | number;
  centerLabel?: string;
}

/**
 * Lightweight ring chart built directly on react-native-svg (already a
 * dependency via icon libraries) — no charting package needed. Segments are
 * drawn as stroked arcs via stroke-dasharray/dashoffset, rotated so the
 * first segment starts at 12 o'clock.
 */
export function DonutChart({
  segments,
  total,
  size = 96,
  strokeWidth = 12,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];

  const sum = segments.reduce((acc, s) => acc + Math.max(s.value, 0), 0);
  const denom = total && total > sum ? total : sum;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const arcs = denom > 0
    ? segments
        .filter(s => s.value > 0)
        .map(s => {
          const fraction = s.value / denom;
          const dash = fraction * circumference;
          const offset = (cumulative / denom) * circumference;
          cumulative += s.value;
          return { ...s, dash, offset };
        })
    : [];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={center} originY={center}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={c.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap={arcs.length === 1 ? 'round' : 'butt'}
              fill="none"
            />
          ))}
        </G>
      </Svg>
      {(centerValue !== undefined || centerLabel) && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.centerWrap}>
            {centerValue !== undefined && (
              <Text style={[styles.centerValue, { color: c.textPrimary }]} numberOfLines={1}>
                {centerValue}
              </Text>
            )}
            {centerLabel && (
              <Text style={[styles.centerLabel, { color: c.textMuted }]} numberOfLines={1}>
                {centerLabel}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

interface DonutLegendProps {
  segments: DonutSegment[];
}

export function DonutLegend({ segments }: DonutLegendProps) {
  const cs = useColorScheme() ?? 'light';
  const c = Colors[cs];
  return (
    <View style={styles.legend}>
      {segments.map((s, i) => (
        <View key={i} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: s.color }]} />
          <Text style={[styles.legendLabel, { color: c.textSecondary }]} numberOfLines={1}>
            {s.label}
          </Text>
          <Text style={[styles.legendValue, { color: c.textPrimary }]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  centerLabel: { fontSize: 9, fontWeight: '600', marginTop: 1 },
  legend: { gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '700' },
});
