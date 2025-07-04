
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserPermissions } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useLanguage } from '../../contexts/LanguageContext';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Omit<User, 'id' | 'hashedPassword' | 'permissions'> | (Partial<Pick<User, 'username' | 'password' | 'role' | 'permissions'>> & {id: string})) => void;
  user: User | null; 
  currentUser: User; 
}

type FormData = {
  username: string;
  password?: string; 
  confirmPassword?: string; 
  role: UserRole;
  permissions: UserPermissions;
};

const initialPermissions: UserPermissions = {
    editProducts: false,
    accessInventory: false,
    viewFullSalesHistory: false,
};

const initialFormData: FormData = {
  username: '',
  password: '',
  confirmPassword: '',
  role: 'employee',
  permissions: { ...initialPermissions },
};

export const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user, currentUser }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData | keyof UserPermissions, string>>>({});

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          username: user.username,
          password: '', 
          confirmPassword: '',
          role: user.role,
          permissions: user.role === 'admin' ? { editProducts: true, accessInventory: true, viewFullSalesHistory: true } : { ...initialPermissions, ...user.permissions },
        });
      } else {
        setFormData(initialFormData);
      }
      setFormErrors({});
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked, name: permissionName } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permissionName]: checked,
            }
        }));
    } else if (name === "role") {
        const newRole = value as UserRole;
        setFormData(prev => {
            let newPermissions = { ...prev.permissions }; // Start with current form's permissions

            if (newRole === 'admin') {
                newPermissions = { editProducts: true, accessInventory: true, viewFullSalesHistory: true };
            } else if (newRole === 'employee' && prev.role === 'admin') {
                // If switching from admin role to employee role, reset permissions to initial (all false)
                newPermissions = { ...initialPermissions };
            }
            // If newRole is 'employee' and prev.role was also 'employee',
            // newPermissions (which started as ...prev.permissions) is kept.
            // This preserves any checkbox changes made while the role was 'employee'.
            return {
                ...prev,
                role: newRole,
                permissions: newPermissions
            };
        });
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (formErrors[name as keyof FormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData | keyof UserPermissions, string>> = {};
    if (!formData.username.trim()) errors.username = t('userManagement.saveError', { error: 'Username is required.' });
    
    if (!user || formData.password) { 
      if (!formData.password || formData.password.length < 6) {
        errors.password = t('userManagement.errorPasswordTooShort');
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = t('userManagement.saveError', { error: 'Passwords do not match.' });
      }
    }
    
    if (user && user.id === currentUser.id && formData.role === 'employee' && currentUser.role === 'admin') {
         // This is a simple client-side check. Backend should have the ultimate authority if it's the only admin.
        // errors.role = t('userManagement.errorSelfDemote'); // Let's rely on backend for this, more robust
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const payload: any = {
          username: formData.username,
          role: formData.role,
      };
      if (user) {
          payload.id = user.id;
      }
      if (formData.password) {
          payload.password = formData.password;
      }
      if (formData.role === 'employee') {
          // console.log("[UserFormModal] Submitting permissions for employee:", JSON.stringify(formData.permissions)); 
          payload.permissions = formData.permissions;
      } else {
          payload.permissions = {}; 
      }
      onSave(payload);
    }
  };

  if (!isOpen) return null;

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'employee', label: t('userManagement.roleEmployee') },
    { value: 'admin', label: t('userManagement.roleAdmin') },
  ];

  const isEditingSelfAsAdmin = user?.id === currentUser.id && currentUser.role === 'admin';


  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 id="user-modal-title" className="text-xl font-semibold text-gray-800">
            {user ? t('userManagement.modalEditTitle') : t('userManagement.modalAddTitle')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.cancel')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
          <Input
            label={t('userManagement.usernameLabel')}
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            error={formErrors.username}
            required
            autoFocus
          />
          <Input
            label={user ? t('userManagement.passwordOptional') : t('userManagement.passwordLabel')}
            id="password"
            name="password"
            type="password"
            value={formData.password || ''}
            onChange={handleChange}
            placeholder={t('userManagement.passwordPlaceholder')}
            error={formErrors.password}
            required={!user} 
          />
          {(!user || formData.password) && (
            <Input
              label={t('common.confirm') + " " + t('loginPage.passwordLabel').toLowerCase()}
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword || ''}
              onChange={handleChange}
              placeholder={t('common.confirm') + " " + t('userManagement.passwordPlaceholder').toLowerCase()}
              error={formErrors.confirmPassword}
              required={!user || !!formData.password}
            />
          )}
          <Select
            label={t('userManagement.roleLabel')}
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={roleOptions}
            error={formErrors.role as string | undefined}
            required
            disabled={isEditingSelfAsAdmin && formData.role === 'admin'} 
          />
           {isEditingSelfAsAdmin && formData.role === 'admin' && (
             <p className="text-xs text-orange-600 mt-1">{t('userManagement.errorSelfDemote')}</p>
           )}

          
          <fieldset className="mt-4 border p-4 rounded-md">
            <legend className="text-sm font-medium text-gray-700 px-1">{t('userManagement.permissionsTitle')}</legend>
            <div className="space-y-2 mt-2">
              {(Object.keys(initialPermissions) as Array<keyof UserPermissions>).map((key) => (
                <div key={key} className="flex items-center">
                  <input
                    id={key}
                    name={key} 
                    type="checkbox"
                    checked={formData.permissions[key] || false}
                    onChange={handleChange}
                    disabled={formData.role === 'admin'}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor={key} className="ml-2 block text-sm text-gray-900 capitalize">
                    {key === 'editProducts' && t('userManagement.permissionEditProducts')}
                    {key === 'accessInventory' && t('userManagement.permissionAccessInventory')}
                    {key === 'viewFullSalesHistory' && t('userManagement.permissionViewFullSalesHistory')}
                  </label>
                </div>
              ))}
            </div>
            {formData.role === 'admin' && <p className="text-xs text-gray-500 mt-2">Admins have all permissions by default.</p>}
          </fieldset>
        
        <div className="pt-6 mt-auto sticky bottom-0 bg-white py-4 border-t">
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <Button type="button" variant="secondary" onClick={onClose}>
                {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary">
                {user ? t('common.saveChanges') : t('userManagement.addNewUserButton')}
                </Button>
            </div>
        </div>
        </form>
      </div>
    </div>
  );
};
