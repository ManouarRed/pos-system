import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  subValue: string;
  isActive?: boolean;
  onClick: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subValue, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg shadow cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 ${
        isActive ? 'bg-blue-500 text-white' : 'bg-white'
      }`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm">{subValue}</p>
    </div>
  );
};