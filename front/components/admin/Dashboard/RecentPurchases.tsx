import React from 'react';
import { SubmittedSale } from '../../../types';

interface RecentPurchasesProps {
  purchases: SubmittedSale[];
}

export const RecentPurchases: React.FC<RecentPurchasesProps> = ({ purchases }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Recent Purchases</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>{new Date(purchase.submissionDate).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{purchase.paymentMethod}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <ul className="space-y-2">
                  {purchase.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-xs border-b border-gray-100 pb-2 last:border-b-0 last:pb-0 flex items-start gap-2">
                      <img src={item.image || 'https://via.placeholder.com/40?text=No+Img'} alt={item.title} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
                      <div className="flex-grow">
                        <p className="font-medium text-gray-700">{item.title}</p>
                        <p>Code: {item.code}</p>
                        {item.selectedSize && <p>Size: {item.selectedSize}</p>}
                        <p>Quantity: {item.quantity} @ €{item.unitPrice.toFixed(2)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{purchase.totalAmount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};