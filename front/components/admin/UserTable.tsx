
import React from 'react';
import { User } from '../../types';
import { Button } from '../common/Button';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';

interface UserTableProps {
  users: User[];
  currentUser: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string, username: string) => void;
}

export const UserTable: React.FC<UserTableProps> = ({ users, currentUser, onEdit, onDelete }) => {
  const { t } = useLanguage();

  if (users.length === 0) {
    return <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-md">{t('placeholders.noUsersFound')}</p>;
  }

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300" aria-label={t('userManagement.title')}>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">{t('userManagement.tableHeaderUsername')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('userManagement.tableHeaderRole')}</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-sm font-semibold text-gray-900 min-w-[150px]">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{user.username}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">
                      {user.role === 'admin' ? t('userManagement.roleAdmin') : t('userManagement.roleEmployee')}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6 space-x-1">
                      <Button variant="icon" size="sm" onClick={() => onEdit(user)} aria-label={`${t('common.edit')} ${user.username}`}><FiEdit /></Button>
                      <Button
                        variant="icon"
                        size="sm"
                        onClick={() => onDelete(user.id, user.username)}
                        disabled={user.id === currentUser.id}
                        aria-label={`${t('common.delete')} ${user.username}`}
                        title={user.id === currentUser.id ? t('userManagement.errorSelfDelete') : `${t('common.delete')} ${user.username}`}
                      >
                        <FiTrash2 className={`${user.id === currentUser.id ? 'text-gray-400' : 'text-red-500'}`} />
                      </Button>
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
