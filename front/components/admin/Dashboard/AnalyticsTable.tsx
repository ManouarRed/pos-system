import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface AnalyticsTableProps {
  title: string;
  data: any[];
  columns: { header: string, accessor: string, isCurrency?: boolean, isPercentage?: boolean }[];
}

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({ title, data, columns }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      {data.length === 0 ? <p className="text-sm text-gray-500">{t('placeholders.noData')}</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.accessor} className="py-2 px-3 text-left font-medium text-gray-600">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.accessor} className="py-2 px-3 text-gray-700">
                      {col.isCurrency ? `€${Number(row[col.accessor]).toFixed(2)}` : 
                       col.isPercentage ? row[col.accessor] :
                       row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
