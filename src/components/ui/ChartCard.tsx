import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import type { RevenueChartPoint } from '@/types/dashboard';
import { formatCurrency } from '@/utils/errors';

interface ChartCardProps {
  title: string;
  data: RevenueChartPoint[];
}

const CHART_HEIGHT = 120;
const PADDING = 8;
const STROKE_WIDTH = 3;

const hexWithAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const LineSegment = ({
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  if (length < 1) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x1,
        top: y1 - STROKE_WIDTH / 2,
        width: length,
        height: STROKE_WIDTH,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
};

export const ChartCard = ({ title, data }: ChartCardProps) => {
  const { colors } = useTheme();
  const [chartWidth, setChartWidth] = useState(300);
  const chartData = Array.isArray(data) ? data : [];

  const values = chartData.map((point) => point.value ?? point.revenue ?? 0);
  const maxValue = Math.max(...values, 1);

  const points = values.map((value, index) => {
    const x =
      PADDING + (index / Math.max(values.length - 1, 1)) * (chartWidth - PADDING * 2);
    const y = CHART_HEIGHT - PADDING - (value / maxValue) * (CHART_HEIGHT - PADDING * 2);
    return { x, y };
  });

  const total = values.reduce((sum, value) => sum + value, 0);
  const minY = points.length > 0 ? Math.min(...points.map((point) => point.y)) : CHART_HEIGHT;

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold" style={{ color: colors.text }}>
          {title}
        </Text>
        <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
          {formatCurrency(total)}
        </Text>
      </View>

      {chartData.length > 0 ? (
        <View>
          <View
            className="items-center"
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              if (width > 0) {
                setChartWidth(width);
              }
            }}
          >
            <View style={{ width: '100%', height: CHART_HEIGHT, position: 'relative' }}>
              {points.length > 0 ? (
                <LinearGradient
                  colors={[hexWithAlpha(colors.primary, 0.35), hexWithAlpha(colors.primary, 0)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    left: points[0]?.x ?? PADDING,
                    right: chartWidth - (points[points.length - 1]?.x ?? chartWidth - PADDING),
                    top: minY,
                    bottom: PADDING,
                  }}
                />
              ) : null}

              {points.slice(1).map((point, index) => {
                const previous = points[index];
                return (
                  <LineSegment
                    key={`segment-${index}`}
                    x1={previous.x}
                    y1={previous.y}
                    x2={point.x}
                    y2={point.y}
                    color={colors.primary}
                  />
                );
              })}

              {points.map((point, index) => (
                <View
                  key={`point-${index}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: point.x - 4,
                    top: point.y - 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                  }}
                />
              ))}
            </View>
          </View>

          <View className="flex-row justify-between w-full mt-2 px-1">
            {chartData.slice(0, 6).map((point, index) => (
              <Text
                key={point.label ?? point.month ?? `label-${index}`}
                className="text-[10px] flex-1 text-center"
                style={{ color: colors.textMuted }}
              >
                {point.label ?? point.month}
              </Text>
            ))}
          </View>
        </View>
      ) : (
        <Text className="text-sm text-center py-8" style={{ color: colors.textMuted }}>
          No revenue data available
        </Text>
      )}
    </Card>
  );
};
