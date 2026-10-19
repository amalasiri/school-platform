import React from 'react';
import {
  LayoutDashboard,
  Award,
  FolderOpen,
  FileSpreadsheet,
  CheckSquare,
  Users2,
  GraduationCap,
  Briefcase,
  ListTree,
  Settings,
  X,
  ChevronLeft,
  Lock,
  Sparkles,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'evaluation'
  | 'evidence'
  | 'reports'
  | 'tasks'
  | 'vice_principals'
  | 'teachers'
  | 'admin_staff'
  | 'taxonomy'
  | 'settings';

interface MenuItemConfig {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  isUnlocked: boolean; // Only dashboard, evaluation, and teachers are true
  badge?: string | number;
  badgeType?: 'primary' | 'locked' | 'time';
}

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  totalIndicators: number;
  completedIndicators: number;
  totalFiles: number;
  isTeacherSubmissionOpen: boolean;
  onLockedMenuClick: (menuLabel: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  totalIndicators,
  completedIndicators,
  totalFiles,
  isTeacherSubmissionOpen,
  onLockedMenuClick,
}) => {
  // Only 3 menus are unlocked according to the requirements:
  // 1. لوحة المؤشرات التفاعلية
  // 2. معايير التقويم الخارجي (الاسم الجديد)
  // 3. أعمال المعلمات (في موضعه الحالي)
  const menuItems: MenuItemConfig[] = [
    {
      id: 'dashboard',
      label: 'لوحة المؤشرات التفاعلية',
      icon: <LayoutDashboard className="w-5 h-5" />,
      isUnlocked: true,
    },
    {
      id: 'evaluation',
      label: 'معايير التقويم الخارجي',
      icon: <Award className="w-5 h-5 text-emerald-600" />,
      badge: `${completedIndicators}/${totalIndicators}`,
      badgeType: 'primary',
      isUnlocked: true,
    },
    {
      id: 'evidence',
      label: 'إدارة الشواهد والملفات',
      icon: <FolderOpen className="w-5 h-5" />,
      badge: 'ميزة مستقبلية',
      badgeType: 'locked',
      isUnlocked: false,
    },
    {
      id: 'reports',
      label: 'التقارير والتصدير والطباعة',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      badge: 'ميزة مستقبلية',
      badgeType: 'locked',
      isUnlocked: false,
    },
    {
      id: 'tasks',
      label: 'الأعمال والمهام المسندة',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: 'ميزة مستقبلية',
      badgeType: 'locked',
      isUnlocked: false,
    },
    {
      id: 'vice_principals',
      label: 'أعمال الوكيلات',
      icon: <Users2 className="w-5 h-5" />,
      badge: 'ميزة مستقبلية',
      badgeType: 'locked',
      isUnlocked: false,
    },
    {
      id: 'teachers',
      label: 'أعمال المعلمات',
      icon: <GraduationCap className="w-5 h-5" />,
      badge: isTeacherSubmissionOpen ? 'مفتوح لـ 15 أكتوبر' : 'مغلق',
      badgeType: 'time',
      isUnlocked: true, // Remains active in its current position
    },
    {
      id: 'admin_staff',
      label: 'الموظفات والإداريات',
      icon: <Briefcase className="w-5 h-5" />,
      badge: 'ميزة مستقبلية',
      badgeType: 'locked',
      isUnlocked: false,
    },
    {
      id: 'taxonomy',
      label: 'إدارة المعايير والمؤشرات',
      icon: <ListTree className="w-5 h-5" />,
      badge: 'ميزة مستقبلية',
      badgeType: 'locked',
      isUnlocked: false,
    },
    {
      id: 'settings',
      label: 'إعدادات المنصة والهوية',
      icon: <Settings className="w-5 h-5" />,
      badge: 'ميزة مستقبلية',
      badgeType: 'locked',
      isUnlocked: false,
    },
  ];

  const handleItemClick = (item: MenuItemConfig) => {
    if (!item.isUnlocked) {
      onLockedMenuClick(item.label);
      return;
    }
    onSelectTab(item.id);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-[73px] inset-y-0 right-0 z-50 lg:z-10 w-72 bg-white border-l border-slate-200 flex flex-col h-full lg:h-[calc(100vh-73px)] transform transition-transform duration-200 ease-in-out no-print ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 lg:hidden">
          <span className="font-bold text-slate-800 text-sm">أقسام المنصة المدرسية</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section title & hint */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              أقسام المنصة المعتمدة
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 3 أقسام مفعلة
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const isLocked = !item.isUnlocked;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                title={isLocked ? `${item.label} (ميزة مستقبلية قادمة - مقفلة حالياً)` : item.label}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all group ${
                  isLocked
                    ? 'text-slate-400 bg-slate-50/50 hover:bg-slate-100/70 border border-transparent cursor-not-allowed'
                    : isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-800 hover:bg-emerald-50 hover:text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`${
                      isLocked
                        ? 'text-slate-400 group-hover:text-slate-500'
                        : isActive
                        ? 'text-emerald-200'
                        : 'text-slate-500 group-hover:text-emerald-700'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className={`truncate ${isLocked ? 'text-slate-400 font-medium' : ''}`}>
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isLocked ? (
                    <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50/90 border border-amber-200/70 px-1.5 py-0.5 rounded-md font-sans">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>مستقبلية</span>
                    </span>
                  ) : (
                    <>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded font-mono tabular-nums ${
                            item.badgeType === 'time'
                              ? isTeacherSubmissionOpen
                                ? 'bg-emerald-100 text-emerald-800 font-sans font-bold text-[10px]'
                                : 'bg-rose-100 text-rose-800 font-sans font-bold text-[10px]'
                              : isActive
                              ? 'bg-emerald-900/60 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronLeft className="w-4 h-4 text-emerald-300" />}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick school status info card */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span className="font-medium">نسبة إنجاز الشواهد المعتمدة</span>
              <span className="font-bold text-emerald-800 tabular-nums">
                {totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-700 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
              <span>مكتمل: {completedIndicators}</span>
              <span>الإجمالي: {totalIndicators} مؤشر</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
