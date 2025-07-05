import React from 'react';

export const FullScreenLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
      <img
        src="https://store.doubleredcars.eu/wp-content/uploads/2025/03/cropped-logo-1-1024x699.png"
        alt="Loading Logo"
        className="h-16 sm:h-20 mb-6" // Slightly reduced logo size and margin
      />
      <div
        className="animate-spin rounded-full h-10 w-10 border-2 border-solid border-red-500 border-t-transparent" // Smaller spinner, single arc style
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};