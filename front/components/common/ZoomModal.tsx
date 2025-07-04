import React from 'react';
import { createPortal } from 'react-dom';

interface ZoomModalProps {
  imageUrl: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const ZoomModal: React.FC<ZoomModalProps> = ({ imageUrl, position, onClose }) => {
  return createPortal(
    <div
      className="absolute z-50 border border-gray-300 shadow-lg"
      style={{ left: position.x + 10, top: position.y, transform: 'translateY(-50%)' }}
    >
      <img
        src={imageUrl}
        alt="Zoomed Product Image"
        className="w-[423px] h-[564px] object-contain bg-white cursor-zoom-out"
        onClick={onClose}
      />
    </div>,
    document.body
  );
};