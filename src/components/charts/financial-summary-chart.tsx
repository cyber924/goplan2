'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart } from 'recharts';

interface FinancialData {
    year: string;
    revenue?: number;
    operatingProfit?: number;
    netProfit?: number;
}

interface FinancialSummaryChartProps {
  data: FinancialData[];
}

const formatYAxis = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
}

export default function FinancialSummaryChart({ data }: FinancialSummaryChartProps) {
  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" tickFormatter={formatYAxis} />
          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" tickFormatter={formatYAxis} />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                borderColor: 'hsl(var(--border))'
            }}
            formatter={(value: number) => `${value.toLocaleString()} 원`}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="revenue" name="매출액" fill="hsl(var(--primary) / 0.7)" />
          <Line yAxisId="right" type="monotone" dataKey="operatingProfit" name="영업이익" stroke="hsl(var(--accent))" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="netProfit" name="당기순이익" stroke="hsl(var(--chart-2))" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
