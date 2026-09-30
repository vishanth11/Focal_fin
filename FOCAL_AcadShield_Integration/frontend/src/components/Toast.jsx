import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  let borderColor = 'border-2 border-textDark bg-surface text-textDark';
  let Icon = CheckCircle2;

  if (toast.type === 'error' || toast.type === 'danger') {
    borderColor = 'border-2 border-risk-high bg-risk-high/10 text-risk-high';
    Icon = AlertTriangle;
  } else if (toast.type === 'warning') {
    borderColor = 'border-2 border-textDark bg-neon-yellow/30 text-textDark';
    Icon = AlertTriangle;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-fadeIn font-mono">
      <div className={`p-4 ${borderColor} shadow-2xl text-xs flex items-start gap-3`}>
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1 text-textDark leading-relaxed">
          <div className="font-extrabold uppercase tracking-wider mb-0.5">SYSTEM NOTIFICATION</div>
          <div className="font-semibold">{toast.message}</div>
        </div>
      </div>
    </div>
  );
}
