
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserPermissions } from '../../types'; // Added UserPermissions
import { productService } from '../../services/productService';
import { Button } from '../common/Button';
import { FiPlus } from 'react-icons/fi';
import { UserTable } from './UserTable';
import { UserFormModal } from './UserFormModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { FullScreenLoader } from '../common/FullScreenLoader';

interface UserManagementPageProps {
  currentUser: User;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const clearMessages = () => {
    setActionError(null);
    setSuccessMessage(null);
  };

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const fetchedUsers = await productService.fetchUsersAdmin();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Failed to load users:", err);
      setActionError(t('errors.failedToLoadData', { entity: t('adminPage.tabUserManagement').toLowerCase()}));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenAddModal = () => {
    clearMessages();
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    clearMessages();
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (
    userData: Omit<User, 'id' | 'hashedPassword' | 'permissions'> | (Partial<Pick<User, 'username' | 'password' | 'role' | 'permissions'>> & {id: string})
  ) => {
    clearMessages();
    setIsLoading(true);
    try {
      let savedUser;
      if ('id' in userData && userData.id && editingUser) {
        // This is an update
        const updatePayload: Partial<Pick<User, 'username' | 'password' | 'role' | 'permissions'>> = {};

        if (userData.username !== undefined) {
            updatePayload.username = userData.username;
        }
        if (userData.password) { // Only include password if it's being changed (not empty)
            updatePayload.password = userData.password;
        }
        if (userData.role !== undefined) {
            updatePayload.role = userData.role;
        }

        // Handle permissions based on role
        if (userData.role === 'employee') {
            // If permissions are provided in userData, use them. Otherwise, backend might keep existing or default.
            // UserFormModal ensures permissions are part of userData if role is employee.
            if (userData.permissions !== undefined) {
                updatePayload.permissions = userData.permissions;
            }
        } else if (userData.role === 'admin') {
            // For admins, permissions are typically not stored as explicit flags or set to null/empty by backend.
            // UserFormModal sends {} for admin, which we can pass.
             updatePayload.permissions = (userData.permissions !== undefined) ? userData.permissions : {};
        }
        
        savedUser = await productService.updateUserAdmin(userData.id, updatePayload);
        if (savedUser) {
          setSuccessMessage(t('userManagement.updateSuccess', { username: savedUser.username }));
        }
      } else { 
        // Adding a new user. The 'userData' type from UserFormModal will include 'permissions' if role is employee.
        // productService.addUserAdmin expects Omit<User, 'id' | 'hashedPassword'>, which can include 'permissions?'
        savedUser = await productService.addUserAdmin(userData as Omit<User, 'id' | 'hashedPassword'>);
        setSuccessMessage(t('userManagement.addSuccess', { username: savedUser.username }));
      }

      if (!savedUser) {
          throw new Error(t('errors.apiErrorGeneric', {message: "Save operation returned no user data."}));
      }
      await loadUsers();
      handleCloseModal();
    } catch (err) {
      console.error("Error saving user:", err);
      setActionError(t('userManagement.saveError', { error: (err instanceof Error ? err.message : String(err)) }));
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    clearMessages();
    if (currentUser.id === userId) {
        setActionError(t('userManagement.errorSelfDelete'));
        return;
    }
    if (window.confirm(t('userManagement.confirmDeleteUser', { username }))) {
      setIsLoading(true);
      try {
        const success = await productService.deleteUserAdmin(userId); 
        if (success) {
            setSuccessMessage(t('userManagement.deleteSuccess', { username }));
            await loadUsers();
        } else {
             setActionError(t('userManagement.deleteError', { username }));
        }
      } catch (err) {
        console.error("Error deleting user:", err);
        setActionError(t('userManagement.saveError', { error: (err instanceof Error ? err.message : String(err))}) );
      } finally {
          setIsLoading(false);
      }
    }
  };

  const MessageDisplay = () => {
    if (actionError) return <p className="text-center text-red-500 py-4 bg-red-50 rounded-md my-4">{actionError}</p>;
    if (successMessage) return <p className="text-center text-green-500 py-4 bg-green-50 rounded-md my-4">{successMessage}</p>;
    return null;
  };

  if (isLoading && users.length === 0 && !actionError && !successMessage) {
    return <FullScreenLoader />;
  }


  return (
    <div className="space-y-6">
      <MessageDisplay />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800">{t('userManagement.title')}</h2>
        <Button onClick={handleOpenAddModal} variant="primary" leftIcon={<FiPlus />} disabled={isLoading}>
          {t('userManagement.addNewUserButton')}
        </Button>
      </div>

      {isLoading && users.length > 0 && <p className="text-center text-gray-500 py-4">{t('common.loading')} {t('adminPage.tabUserManagement').toLowerCase()}...</p>}

      {!isLoading && actionError && users.length === 0 && (
         <p className="text-center text-red-500 py-8 border-2 border-dashed border-red-300 rounded-md">
           {actionError}
         </p>
      )}
      
      {!isLoading && !actionError && (
          <UserTable
            users={users}
            currentUser={currentUser}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteUser}
          />
      )}


      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
          user={editingUser}
          currentUser={currentUser}
          key={editingUser ? editingUser.id : 'new-user-modal'}
        />
      )}
    </div>
  );
};
