
import React from 'react';
import { SubmittedSale, SaleItemRecord } from '../../types';
import { Button } from '../common/Button';
import { FiEdit, FiCalendar, FiUser } from 'react-icons/fi';
import { FaReceipt } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';

interface SalesHistoryTableProps {
  sales: SubmittedSale[];
  onEdit: (sale: SubmittedSale) => void;
  canEditSales: boolean;
  isPrinting?: boolean; // New prop
  selectedSaleIds: string[];
  onSelectSale: (saleId: string, isSelected: boolean) => void;
  onSelectAllSales: (isSelected: boolean) => void;
}

export const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({
  sales,
  onEdit,
  canEditSales,
  isPrinting = false,
  selectedSaleIds,
  onSelectSale,
  onSelectAllSales,
}) => {
  const { t } = useLanguage();

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const allOnPageSelected = sales.length > 0 && sales.every(sale => selectedSaleIds.includes(sale.id));
  const someOnPageSelected = selectedSaleIds.some(id => sales.find(sale => sale.id === id)) && !allOnPageSelected;

  if (sales.length === 0) {
    return <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-md print:border-none print:shadow-none">{t('placeholders.noSalesFound')}</p>;
  }

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 print:mx-0 print:my-0 print:overflow-visible">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8 print:px-0 print:py-0">
          <div className={`overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg print:shadow-none print:ring-0 ${isPrinting ? 'printable-content' : ''}`}>
            <table className="min-w-full divide-y divide-gray-300 print:divide-gray-500" aria-label={t('adminPage.tabSalesHistory')}>
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  {canEditSales && !isPrinting && (
                    <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        checked={allOnPageSelected}
                        ref={input => {
                          if (input) {
                            input.indeterminate = someOnPageSelected;
                          }
                        }}
                        onChange={(e) => onSelectAllSales(e.target.checked)}
                        aria-label="Select all sales on this page"
                        disabled={sales.length === 0}
                      />
                    </th>
                  )}
                  
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                     <div className="flex items-center">
                        <FiCalendar className="h-4 w-4 mr-1 text-gray-500" /> {t('common.date')}
                     </div>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <div className="flex items-center">
                      <FiUser className="h-4 w-4 mr-1 text-gray-500" /> {t('salesHistory.submittedBy')}
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('adminPage.tabProducts')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.discount')} (€)</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.paymentMethod')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('common.total')} (€)</th>
                  {canEditSales && !isPrinting && <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-sm font-semibold text-gray-900 min-w-[100px]">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white print:divide-gray-400">
                {sales.map((sale) => {
                  const totalDiscountForSale = sale.items.reduce((sum, item) => sum + item.discount, 0);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors duration-150">
                      {canEditSales && !isPrinting && (
                        <td className="relative px-7 sm:w-12 sm:px-6">
                          {selectedSaleIds.includes(sale.id) && (
                            <div className="absolute inset-y-0 left-0 w-0.5 bg-indigo-600" />
                          )}
                          <input
                            type="checkbox"
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            value={sale.id}
                            checked={selectedSaleIds.includes(sale.id)}
                            onChange={(e) => onSelectSale(sale.id, e.target.checked)}
                            aria-label={`Select sale ${sale.id}`}
                          />
                        </td>
                      )}
                      
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 align-top">
                        {formatDate(sale.submissionDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 align-top">
                        {sale.submitted_by_username || 'N/A'}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 align-top">
                        {sale.items.length > 0 ? (
                          <ul className="space-y-3">
                            {sale.items.map((item: SaleItemRecord, index: number) => (
                              <li key={index} className="text-xs border-b border-gray-100 pb-2 last:border-b-0 last:pb-0 flex items-start gap-2 print:border-gray-300">
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.title} 
                                    className="w-10 h-10 object-cover rounded-md flex-shrink-0" 
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=No+Img')}
                                  />
                                ) : (
                                  <div className="w-10 h-10 object-cover rounded-md flex-shrink-0 flex items-center justify-center bg-gray-200 text-gray-500 text-xs">N/A</div>
                                )}
                                <div className="flex-grow">
                                  <p className="font-medium text-gray-700">{item.title}</p>
                                  <p>{t('common.code')}: {item.code}</p>
                                  {item.selectedSize && <p>{t('common.size')}: {item.selectedSize}</p>}
                                  <p>{t('common.quantity')}: {item.quantity} @ €{item.unitPrice.toFixed(2)}</p>
                                  {item.discount > 0 && <p className="text-orange-600">{t('posForm.tableHeaderDiscount')}: €{item.discount.toFixed(2)}</p>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span>{t('salesHistory.noItems')}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 align-top">
                        €{totalDiscountForSale.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 align-top">
                        {sale.paymentMethod}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-indigo-600 align-top">
                        €{sale.totalAmount.toFixed(2)}
                      </td>
                      {canEditSales && !isPrinting && (
                        <td className="whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6 align-top">
                            <Button variant="icon" size="sm" onClick={() => onEdit(sale)} aria-label={`${t('common.edit')} ${t('salesHistory.sale')} ${sale.id}`}><FiEdit /></Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
