import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  date: string;
  score: number;
  tier: string;
}

interface CustomerHealthChartProps {
  data: ChartData[];
}

export default function CustomerHealthChart({ data }: CustomerHealthChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-full flex items-center justify-center text-slate-300 text-xs">
        Loading health history chart...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
        <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: '#0F172A',
            color: '#FFF',
            borderRadius: '8px',
            border: 'none',
            fontSize: '11px',
          }}
          itemStyle={{ color: '#00D4FF' }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#06B6D4"
          strokeWidth={3}
          dot={{ r: 4, fill: '#06B6D4', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
