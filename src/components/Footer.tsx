import React from 'react';
import { SystemSettings } from '../types';

interface FooterProps {
  settings: SystemSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-slate-700 print:border-t-2 print:border-emerald-800 print:mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* النص الإلزامي الصريح في التذييل: مديرة المدرسة/ إيمان الشعبي */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans">
              مديرة المدرسة/ {settings.principalName || 'إيمان الشعبي'}
            </span>
          </div>

          {/* معلومات النظام والسنة الدراسية */}
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>منصة الإدارة المدرسية والتقويم الخارجي</span>
            <span aria-hidden="true">·</span>
            <span>العام الدراسي {settings.academicYear || '1446-1447هـ'}</span>
            <span aria-hidden="true" className="no-print">·</span>
            <span className="no-print text-emerald-800 font-semibold">بوابة التقويم المعتمدة</span>
          </div>

        </div>
      </div>
    </footer>
  );
};
