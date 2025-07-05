import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SalesChartProps {
  data: any[];
  title: string;
  line1Key: string;
  line2Key?: string;
}

export const SalesChart: React.FC<SalesChartProps> = ({ data, title, line1Key, line2Key }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={line1Key} stroke="#8884d8" activeDot={{ r: 8 }} />
          {line2Key && <Line type="monotone" dataKey={line2Key} stroke="#82ca9d" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};