
import React from 'react';
import { Category } from '../../types';
import { Button } from '../common/Button';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({ categories, onEdit, onDelete }) => {
  if (categories.length === 0) {
    return <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-md">No categories found. Add one to get started!</p>;
  }

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300" aria-label="Categories">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Category Name</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ID</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-sm font-semibold text-gray-900 min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{category.name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{category.id}</td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6 space-x-1">
                      <Button variant="icon" size="sm" onClick={() => onEdit(category)} aria-label={`Edit category ${category.name}`}><FiEdit /></Button>
                      <Button variant="icon" size="sm" onClick={() => onDelete(category.id)} aria-label={`Delete category ${category.name}`}><FiTrash2 /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};