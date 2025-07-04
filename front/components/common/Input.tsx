
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode; // Added leftIcon prop
  labelClassName?: string; // Added labelClassName prop
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  id, 
  error, 
  className = '', 
  containerClassName = '', 
  leftIcon, // Destructure leftIcon
  labelClassName = '', // Destructure labelClassName
  ...props 
}) => {
  const baseStyles =
    'block w-full py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm read-only:bg-gray-100 read-only:cursor-not-allowed disabled:bg-gray-100 disabled:cursor-not-allowed';
  const errorStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
  const leftIconPadding = leftIcon ? 'pl-10' : 'px-3'; // Adjust padding based on icon presence

  return (
    <div className={containerClassName}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {/* The icon itself should have its styling, e.g., text-gray-400, w-5 h-5 */}
            {leftIcon}
          </div>
        )}
        <input 
          id={id} 
          className={`${baseStyles} ${errorStyles} ${leftIconPadding} ${className}`} 
          {...props} 
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};