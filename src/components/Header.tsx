import React from 'react';
import { SystemSettings, UserRole } from '../types';
import { ShieldCheck, UserCheck, Menu } from 'lucide-react';

interface HeaderProps {
  settings: SystemSettings;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentRole,
  onRoleChange,
  onToggleSidebar,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/90 shadow-xs sticky top-0 z-40 print:relative print:border-b-2 print:border-emerald-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between gap-4">
          
          {/* ثانياً: أعلى يمين المنصة - بيانات الجهة والمدرسة */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 -mr-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
              aria-label="تبديل القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="text-right flex flex-col justify-center border-r-2 border-emerald-700 pr-3">
              <span className="text-xs sm:text-sm font-bold text-emerald-900 tracking-tight leading-tight">
                {settings.ministryName || 'وزارة التعليم'}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight">
                {settings.educationDept || 'إدارة التعليم بجازان'}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-700 leading-tight">
                {settings.schoolName || 'متوسطة وثانوية الدرب الأولى'}
              </span>
            </div>
          </div>

          {/* المنتصف: محاكي الصلاحيات والأدوار المدرسية (مخفي أثناء الطباعة) */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 no-print">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-2 border-l border-slate-200">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-medium">المستخدم الحالي:</span>
            </div>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 outline-hidden focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="principal">مديرة المدرسة (كامل الصلاحيات والاعتماد)</option>
              <option value="vice_principal">وكيلة المدرسة (إدارة الشواهد والمتابعة)</option>
              <option value="teacher">معلمة (رفع الشواهد التخصصية)</option>
              <option value="admin_staff">موظفة إدارية (إدخال ومساندة)</option>
            </select>
            {currentRole === 'principal' && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                صلاحية الاعتماد مفعلة
              </span>
            )}
          </div>

          {/* أولاً: أعلى يسار المنصة - شعار وزارة التعليم الرسمي المعتمد */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2.5">
              <div
                className="h-14 sm:h-16 flex items-center justify-center px-2 py-1 bg-white/80 rounded-xl hover:bg-slate-50 transition-colors"
                title="وزارة التعليم - المملكة العربية السعودية"
              >
                <img
                  src="/moe-logo.svg"
                  alt="شعار وزارة التعليم - المملكة العربية السعودية"
                  className="h-11 sm:h-13 md:h-14 w-auto object-contain max-w-[210px] sm:max-w-[240px] drop-shadow-xs"
                  loading="eager"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
