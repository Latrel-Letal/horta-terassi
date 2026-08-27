import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#132A1D] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold tracking-wide border border-[#5E8F52]/40 animate-fade-in pointer-events-none">
      <CheckCircle2 className="w-4 h-4 text-[#5E8F52]" />
      <span>{message}</span>
    </div>
  );
};
