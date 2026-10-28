'use client';

import { Bar, BarChart, CartesianGrid, Legend, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SalesChartProps {
  data: {
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
}

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                borderColor: 'hsl(var(--border))'
            }}
          />
          <Legend />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" name="매출" activeBar={<Rectangle fill="hsl(var(--primary) / 0.8)" stroke="hsl(var(--primary))" />} />
          <Bar dataKey="profit" fill="hsl(var(--accent))" name="이익" activeBar={<Rectangle fill="hsl(var(--accent) / 0.8)" stroke="hsl(var(--accent))" />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
