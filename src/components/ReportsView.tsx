import React, { useState } from 'react';
import { Domain, Criterion, Indicator, SystemSettings } from '../types';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface ReportsViewProps {
  domains: Domain[];
  criteria: Criterion[];
  indicators: Indicator[];
  settings: SystemSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  domains,
  criteria,
  indicators,
  settings,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredIndicators = indicators.filter((ind) => {
    if (selectedDomain !== 'all' && ind.domainId !== selectedDomain) return false;
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'approved' && !ind.isApprovedByPrincipal) return false;
      if (selectedStatus !== 'approved' && ind.status !== selectedStatus) return false;
    }
    return true;
  });

  const getStatusText = (ind: Indicator) => {
    if (ind.isApprovedByPrincipal) return 'معتمد من المديرة';
    switch (ind.status) {
      case 'completed': return 'مكتمل الشواهد';
      case 'in_progress': return 'قيد الاستكمال';
      case 'needs_review': return 'يحتاج إلى مراجعة';
      case 'excluded': return 'مستثنى / غير منطبق';
      case 'not_started':
      default: return 'لم تبدأ المراجعة';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Generate UTF-8 CSV with BOM for Excel Arabic compatibility
    const BOM = '\uFEFF';
    const headers = [
      'المجال',
      'المعيار',
      'رمز المؤشر',
      'نص المؤشر',
      'حالة الاستكمال',
      'معتمد من المديرة',
      'تاريخ الاعتماد',
      'عدد الشواهد',
      'أسماء ملفات الشواهد',
      'ملاحظات وتوجيهات المديرة',
      'تاريخ التحديث',
    ];

    const rows = filteredIndicators.map((ind) => {
      const crit = criteria.find((c) => c.id === ind.criterionId);
      const dom = domains.find((d) => d.id === ind.domainId);
      const fileNames = (ind.evidenceFiles || []).map((f) => f.fileName).join(' | ');

      return [
        `"${dom?.name || ''}"`,
        `"${crit?.name || ''}"`,
        `"${ind.code}"`,
        `"${ind.name.replace(/"/g, '""')}"`,
        `"${getStatusText(ind)}"`,
        `"${ind.isApprovedByPrincipal ? 'نعم' : 'لا'}"`,
        `"${ind.approvedAt || ''}"`,
        ind.evidenceFiles?.length || 0,
        `"${fileNames.replace(/"/g, '""')}"`,
        `"${(ind.notes || '').replace(/"/g, '""')}"`,
        `"${ind.lastUpdated || ''}"`,
      ].join(',');
    });

    const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تقرير_التقويم_المدرسي_${settings.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalFiltered = filteredIndicators.length;
  const completedFiltered = filteredIndicators.filter((i) => i.status === 'completed' || i.status === 'approved').length;
  const approvedFiltered = filteredIndicators.filter((i) => i.isApprovedByPrincipal).length;
  const rateFiltered = totalFiltered > 0 ? Math.round((completedFiltered / totalFiltered) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* أدوات التقرير (تخفى عند الطباعة) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              مركز التقارير والتصدير والطباعة
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              توليد تقارير رسمية شاملة للتقويم المدرسي الخارجي جاهزة للاعتماد والطباعة بصيغة PDF أو Excel
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير Excel (CSV)</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg px-4 py-2 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير الرسمي</span>
            </button>
          </div>
        </div>

        {/* فلاتر استخراج التقرير */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">تصفية حسب المجال:</label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="all">كافة المجالات الأربعة</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">تصفية حسب حالة الاستكمال:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="all">كافة الحالات</option>
              <option value="approved">معتمد من المديرة فقط</option>
              <option value="completed">مكتمل الشواهد</option>
              <option value="in_progress">قيد الاستكمال</option>
              <option value="needs_review">يحتاج إلى مراجعة</option>
              <option value="not_started">لم تبدأ المراجعة</option>
            </select>
          </div>
        </div>
      </div>

      {/* منطقة التقرير الرسمي المطبوع */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs print:border-none print:shadow-none print:p-0">
        
        {/* ترويسة التقرير الرسمية المعتمدة */}
        <div className="border-b-2 border-emerald-900 pb-5 mb-6">
          <div className="flex items-center justify-between">
            {/* أعلى اليمين: بيانات الوزارة والإدارة والمدرسة */}
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-900">{settings.ministryName}</div>
              <div className="text-sm font-semibold text-slate-800">{settings.educationDept}</div>
              <div className="text-sm font-medium text-slate-700">{settings.schoolName}</div>
              <div className="text-xs text-slate-500 mt-1">العام الدراسي: {settings.academicYear}</div>
            </div>

            {/* العنوان في المنتصف */}
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                تقرير جاهزية التقويم المدرسي الخارجي
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full inline-block mt-1">
                سجل المؤشرات والشواهد المعتمدة
              </span>
            </div>

            {/* أعلى اليسار: شعار الوزارة والتاريخ */}
            <div className="text-left flex flex-col items-end">
              <img
                src="/moe-logo.svg"
                alt="شعار وزارة التعليم"
                className="h-10 sm:h-12 w-auto object-contain mb-1"
              />
              <div className="text-[11px] text-slate-500">تاريخ التقرير:</div>
              <div className="text-xs font-bold font-mono text-slate-800">
                {new Date().toISOString().split('T')[0]}
              </div>
            </div>
          </div>

          {/* ملخص أرقام التقرير */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded">
              <span className="text-slate-500 block">إجمالي المؤشرات</span>
              <strong className="text-slate-900 text-sm tabular-nums">{totalFiltered}</strong>
            </div>
            <div className="p-2 bg-emerald-50 rounded">
              <span className="text-emerald-700 block">الشواهد المكتملة</span>
              <strong className="text-emerald-800 text-sm tabular-nums">{completedFiltered}</strong>
            </div>
            <div className="p-2 bg-emerald-100 rounded">
              <span className="text-emerald-900 block">المعتمد من المديرة</span>
              <strong className="text-emerald-950 text-sm tabular-nums">{approvedFiltered}</strong>
            </div>
            <div className="p-2 bg-slate-50 rounded">
              <span className="text-slate-500 block">نسبة الإنجاز</span>
              <strong className="text-slate-900 text-sm tabular-nums">{rateFiltered}%</strong>
            </div>
          </div>
        </div>

        {/* جدول بيانات المؤشرات والشواهد الرسمي */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y border-slate-300 text-slate-800">
                <th className="p-2.5 font-bold border-l border-slate-200 w-16 text-center">الرمز</th>
                <th className="p-2.5 font-bold border-l border-slate-200">المجال / المعيار</th>
                <th className="p-2.5 font-bold border-l border-slate-200 w-2/5">نص المؤشر الرسمي</th>
                <th className="p-2.5 font-bold border-l border-slate-200 text-center w-28">حالة الاستكمال</th>
                <th className="p-2.5 font-bold border-l border-slate-200 w-44">ملفات الشواهد المرفقة</th>
                <th className="p-2.5 font-bold">ملاحظات المديرة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredIndicators.map((ind) => {
                const dom = domains.find((d) => d.id === ind.domainId);
                const crit = criteria.find((c) => c.id === ind.criterionId);
                const files = ind.evidenceFiles || [];

                return (
                  <tr key={ind.id} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-mono font-bold text-center border-l border-slate-200 text-slate-800 bg-slate-50">
                      {ind.code}
                    </td>
                    <td className="p-2.5 border-l border-slate-200 text-slate-700">
                      <div className="font-bold">{dom?.name}</div>
                      <div className="text-[11px] text-slate-500">{crit?.name}</div>
                    </td>
                    <td className="p-2.5 border-l border-slate-200 font-medium text-slate-900 leading-relaxed">
                      {ind.name}
                    </td>
                    <td className="p-2.5 border-l border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        ind.isApprovedByPrincipal
                          ? 'bg-emerald-100 text-emerald-900'
                          : ind.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : ind.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700'
                          : ind.status === 'needs_review'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {getStatusText(ind)}
                      </span>
                    </td>
                    <td className="p-2.5 border-l border-slate-200">
                      {files.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700">
                          {files.map((f) => (
                            <li key={f.id} className="truncate" title={f.fileName}>
                              {f.fileName}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400 text-[11px]">لا توجد شواهد</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-600 text-[11px] italic">
                      {ind.notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* توقيع مديرة المدرسة الرسمي أسفل التقرير المطبوع */}
        <div className="mt-12 pt-6 border-t-2 border-slate-300 flex items-center justify-between">
          <div className="text-right">
            <div className="text-xs text-slate-500">لجنة التقويم المدرسي والاعتماد:</div>
            <div className="text-xs font-bold text-slate-800 mt-1">متوسطة وثانوية الدرب الأولى</div>
          </div>

          <div className="text-left">
            <div className="text-xs text-slate-500">يعتمد / مديرة المدرسة</div>
            <div className="text-sm font-extrabold text-slate-900 mt-1">
              {settings.principalName || 'إيمان الشعبي'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">الختم والتوقيع الرسمي</div>
          </div>
        </div>

      </div>

    </div>
  );
};
