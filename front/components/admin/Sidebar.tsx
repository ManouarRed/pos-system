
import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiBox, FiUsers, FiDollarSign, FiBarChart2, FiSettings, FiPackage } from 'react-icons/fi';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col sidebar">
      <div className="h-20 flex items-center text-2xl font-bold pl-4"></div>
      <nav className="flex-1 px-4 py-8">
        <ul>
          <li><NavLink to="/admin/inventory" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiGrid className="mr-4" />Inventory</NavLink></li>
          <li><NavLink to="/admin/products" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiBox className="mr-4" />Products</NavLink></li>
          <li><NavLink to="/admin/categories" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiPackage className="mr-4" />Categories</NavLink></li>
          <li><NavLink to="/admin/manufacturers" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiPackage className="mr-4" />Manufacturers</NavLink></li>
          <li><NavLink to="/admin/users" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiUsers className="mr-4" />Users</NavLink></li>
          <li><NavLink to="/admin/sales-history" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiDollarSign className="mr-4" />Sales History</NavLink></li>
          <li><NavLink to="/admin/analytics" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiBarChart2 className="mr-4" />Analytics</NavLink></li>
          <li><NavLink to="/admin/settings" className="flex items-center py-3 px-4 rounded-md hover:bg-gray-700"><FiSettings className="mr-4" />Settings</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
