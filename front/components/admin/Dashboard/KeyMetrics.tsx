import React from 'react';

interface KeyMetricsProps {
  sales: number;
  salesChange: number;
  orders: number;
  ordersChange: number;
  margin: number;
  marginChange: number;
  visits: number;
  visitsChange: number;
}

export const KeyMetrics: React.FC<KeyMetricsProps> = ({ sales, salesChange, orders, ordersChange, margin, marginChange, visits, visitsChange }) => {
  const renderChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm font-medium">Sales</p>
        <p className="text-2xl font-bold">€{sales.toLocaleString()}</p>
        {renderChange(salesChange)}
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm font-medium">Orders</p>
        <p className="text-2xl font-bold">{orders}</p>
        {renderChange(ordersChange)}
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm font-medium">Margin</p>
        <p className="text-2xl font-bold">€{margin.toLocaleString()}</p>
        {renderChange(marginChange)}
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-sm font-medium">Visits</p>
        <p className="text-2xl font-bold">{visits}</p>
        {renderChange(visitsChange)}
      </div>
    </div>
  );
};