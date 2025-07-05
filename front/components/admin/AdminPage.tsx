
import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { User } from '../../types';

interface AdminPageProps {
  currentUser: User;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser }) => {
  console.log("AdminPage: currentUser", currentUser);
  return (
    <AdminLayout currentUser={currentUser}>
      <Outlet />
    </AdminLayout>
  );
};
