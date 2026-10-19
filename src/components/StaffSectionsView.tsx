import React, { useState } from 'react';
import { Indicator, TaskItem } from '../types';
import {
  Users2,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';

interface StaffSectionsViewProps {
  type: 'vice_principals' | 'teachers' | 'admin_staff';
  indicators: Indicator[];
  tasks: TaskItem[];
  onNavigateToIndicator: (indicatorId: string) => void;
}

export const StaffSectionsView: React.FC<StaffSectionsViewProps> = ({
  type,
  indicators,
  tasks,
  onNavigateToIndicator,
}) => {
  const configs = {
    vice_principals: {
      title: 'قسم أعمال ومسؤوليات الوكيلات',
      subtitle: 'متابعة أعمال وكيلة الشؤون التعليمية، وكيلة الشؤون المدرسية، ووكيلة شؤون الطالبات',
      icon: <Users2 className="w-5 h-5 text-emerald-700" />,
      roles: [
        {
          name: 'وكيلة الشؤون التعليمية',
          scope: 'الإشراف على الخطط التدريسية، مجتمعات التعلم المهنية، ونتائج تقويم التعلم ونواتج نافس',
          indicatorsCount: 8,
          completedCount: 6,
          assignedTasks: tasks.filter((t) => t.assignedToRole === 'vice_principal'),
        },
        {
          name: 'وكيلة الشؤون المدرسية',
          scope: 'الخطة التشغيلية للمدرسة، التجهيزات المدرسية، والمبنى والمرافق والصيانة',
          indicatorsCount: 6,
          completedCount: 4,
          assignedTasks: [],
        },
        {
          name: 'وكيلة شؤون الطالبات',
          scope: 'قواعد السلوك والمواظبة، الانضباط المدرسي، ورعاية حقوق الطالبات والمجلس الطلابي',
          indicatorsCount: 5,
          completedCount: 4,
          assignedTasks: [],
        },
      ],
    },
    teachers: {
      title: 'قسم أعمال وشواهد المعلمات',
      subtitle: 'ملفات إنجاز المعلمات، الاستراتيجيات التدريسية، مصادر التعلم الرقمية، والتقويم البنائي',
      icon: <GraduationCap className="w-5 h-5 text-emerald-700" />,
      roles: [
        {
          name: 'شعبة المواد العلمية والرياضيات',
          scope: 'استراتيجيات التفكير، المعامل الافتراضية، التدريب على اختبارات نافس والقدرات',
          indicatorsCount: 7,
          completedCount: 5,
          assignedTasks: tasks.filter((t) => t.assignedToRole === 'teacher'),
        },
        {
          name: 'شعبة اللغات والعلوم الإنسانية',
          scope: 'الفهم القرائي، مشاريع الطالبات، منصة مدرستي، والأنشطة اللامنهجية',
          indicatorsCount: 6,
          completedCount: 4,
          assignedTasks: [],
        },
        {
          name: 'شعبة التربية الإسلامية والاجتماعيات',
          scope: 'تعزيز القيم والهوية الوطنية، السلوك الإيجابي، والعمل التطوعي المدرسي',
          indicatorsCount: 5,
          completedCount: 5,
          assignedTasks: [],
        },
      ],
    },
    admin_staff: {
      title: 'قسم أعمال الموظفات والإداريات',
      subtitle: 'خدمات التوجيه الطلابي، الصحة المدرسية، الأمن والسلامة، ومصادر التعلم والاتصالات الإدارية',
      icon: <Briefcase className="w-5 h-5 text-emerald-700" />,
      roles: [
        {
          name: 'الموجهة الطلابية',
          scope: 'خطط التوجيه والإرشاد، دراسة الحالات الفردية، ورعاية المتفوقات ومتابعة المتأخرات',
          indicatorsCount: 4,
          completedCount: 3,
          assignedTasks: [],
        },
        {
          name: 'مسؤولة الأمن والسلامة المدرسية',
          scope: 'خطط الإخلاء وتجهيزات السلامة وفحص طفايات الحريق والتوعية بالمخاطر',
          indicatorsCount: 3,
          completedCount: 3,
          assignedTasks: tasks.filter((t) => t.assignedToRole === 'admin_staff'),
        },
        {
          name: 'المرشدة الصحية المدرسية',
          scope: 'المقصف المدرسي، الفحص الاستكشافي الدوري، التوعية الصحية، وسجلات العيادة',
          indicatorsCount: 3,
          completedCount: 3,
          assignedTasks: [],
        },
      ],
    },
  };

  const currentConfig = configs[type];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {currentConfig.icon}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {currentConfig.title}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          {currentConfig.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {currentConfig.roles.map((item, idx) => {
          const rate = Math.round((item.completedCount / item.indicatorsCount) * 100);
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded">
                    مسؤوليات معتمدة
                  </span>
                  <span className="font-mono font-bold text-slate-700 tabular-nums">
                    {rate}%
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.scope}</p>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>المؤشرات المرتبطة</span>
                    <span className="font-bold text-slate-900">
                      {item.completedCount} من {item.indicatorsCount} مؤشر
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-700 h-1.5 rounded-full"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>

                {item.assignedTasks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700">المهام الجارية المسندة:</div>
                    {item.assignedTasks.map((t) => (
                      <div key={t.id} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                        <div className="font-semibold text-slate-800 line-clamp-1">{t.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">تاريخ التسليم: {t.dueDate}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-emerald-800 font-bold block text-left">
                  البنية مهيأة للإسناد والتكليف
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
