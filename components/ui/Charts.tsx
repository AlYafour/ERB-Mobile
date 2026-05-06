import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#0a7ea4',
  },
};

interface LineChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
  legend?: string[];
}

interface BarChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
  }>;
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface ChartProps {
  title?: string;
  height?: number;
}

export function LineChartComponent({
  data,
  title,
  height = 220,
}: ChartProps & { data: LineChartData }) {
  return (
    <View style={styles.container}>
      {title && <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>}
      <LineChart
        data={data}
        width={screenWidth - 32}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withDots={true}
        withShadow={false}
        segments={4}
      />
    </View>
  );
}

export function BarChartComponent({
  data,
  title,
  height = 220,
}: ChartProps & { data: BarChartData }) {
  return (
    <View style={styles.container}>
      {title && <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>}
      <BarChart
        data={data}
        width={screenWidth - 32}
        height={height}
        chartConfig={chartConfig}
        style={styles.chart}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        showValuesOnTopOfBars={true}
        segments={4}
        yAxisLabel=""
        yAxisSuffix=""
      />
    </View>
  );
}

export function PieChartComponent({
  data,
  title,
  height = 220,
}: ChartProps & { data: PieChartData[] }) {
  return (
    <View style={styles.container}>
      {title && <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>}
      <PieChart
        data={data}
        width={screenWidth - 32}
        height={height}
        chartConfig={chartConfig}
        accessor="value"
        backgroundColor="transparent"
        paddingLeft="15"
        style={styles.chart}
        absolute
      />
    </View>
  );
}

export function ProgressChartComponent({
  data,
  title,
  height = 220,
}: ChartProps & { data: { labels: string[]; data: number[] } }) {
  return (
    <View style={styles.container}>
      {title && <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>}
      <ProgressChart
        data={data}
        width={screenWidth - 32}
        height={height}
        chartConfig={chartConfig}
        style={styles.chart}
        strokeWidth={16}
        radius={32}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

