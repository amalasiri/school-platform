import React, { useState } from 'react';
import { SystemSettings, AuditLog } from '../types';
import { storageService } from '../services/storageService';
import {
  Settings,
  Save,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
  Building,
  Clock,
  Database,
} from 'lucide-react';

interface SettingsViewProps {
  settings: SystemSettings;
  auditLogs: AuditLog[];
  onUpdateSettings: (settings: SystemSettings) => void;
  onResetAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  auditLogs,
  onUpdateSettings,
  onResetAll,
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSettings(formData);
    onUpdateSettings(formData);
    setSuccessMsg('تم حفظ وتحديث بيانات الترويسة والمدرسة بنجاح.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleExportBackup = () => {
    const data = storageService.exportSystemData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة_احتياطية_منصة_الدرب_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.settings && json.indicators) {
          storageService.saveSettings(json.settings);
          storageService.saveDomains(json.domains || []);
          storageService.saveCriteria(json.criteria || []);
          storageService.saveIndicators(json.indicators || []);
          if (json.tasks) storageService.saveTasks(json.tasks);
          alert('تم استعادة النسخة الاحتياطية بنجاح.');
          window.location.reload();
        } else {
          alert('ملف النسخة الاحتياطية غير صالح.');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة الملف.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من استعادة البيانات الافتراضية الرسمية؟ سيتم إعادة ضبط الترويسة والمعايير الأساسية.')) {
      onResetAll();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* رأس الصفحة */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          إعدادات المنصة والهوية المدرسية
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          تخصيص بيانات الترويسة والتذييل، وإدارة النسخ الاحتياطية وسجلات النظام
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* نموذج بيانات الترويسة الموحدة */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                بيانات الترويسة الرسمية (أعلى اليمين) واسم المديرة (التذييل)
              </h2>
              <p className="text-xs text-slate-500">
                هذه الحقول تُحدّث الترويسة والتذييل فورًا عبر كافة صفحات المنصة والتقارير المطبوعة
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الجهة الحكومية:</label>
                <input
                  type="text"
                  value={formData.ministryName}
                  onChange={(e) => setFormData({ ...formData, ministryName: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">إدارة التعليم:</label>
                <input
                  type="text"
                  value={formData.educationDept}
                  onChange={(e) => setFormData({ ...formData, educationDept: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم المدرسة الرسمي:</label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم مديرة المدرسة:</label>
                <input
                  type="text"
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">يظهر في التذييل السفلي: مديرة المدرسة/ {formData.principalName}</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">العام الدراسي:</label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">المرحلة ونوع المدرسة:</label>
                <input
                  type="text"
                  value={formData.schoolType}
                  onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات في الترويسة</span>
              </button>
            </div>
          </form>
        </div>

        {/* إدارة التخزين والنسخ الاحتياطي */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Database className="w-5 h-5 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">النسخ الاحتياطي والأمان</h2>
            </div>

            <div className="space-y-2 text-xs">
              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 transition-colors"
              >
                <span>تصدير نسخة احتياطية كاملة (JSON)</span>
                <Download className="w-4 h-4 text-emerald-700" />
              </button>

              <label className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 cursor-pointer transition-colors">
                <span>استعادة نسخة احتياطية من ملف</span>
                <Upload className="w-4 h-4 text-blue-700" />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-between p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold text-rose-800 transition-colors mt-4"
              >
                <span>استعادة المعايير الافتراضية الرسمية</span>
                <RotateCcw className="w-4 h-4 text-rose-700" />
              </button>
            </div>
          </div>

          {/* حالة التخزين المحلي الفعلي */}
          <div className="bg-emerald-900 text-white rounded-xl p-4 shadow-xs text-xs space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span>محرك التخزين المستمر</span>
              <span className="bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded text-[10px]">
                نشط وفوري
              </span>
            </div>
            <p className="text-emerald-200 text-[11px] leading-relaxed">
              تخزين محلي مباشر عبر IndexedDB للملفات وLocalStorage للمؤشرات، جاهز للربط مع Firebase السحابي.
            </p>
          </div>
        </div>

      </div>

      {/* سجل التعديلات والعمليات (Audit Log) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">سجل عمليات وتعديلات المنصة (Audit Trail)</h2>
        </div>

        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[11px]">
              <tr>
                <th className="p-2 font-bold">الوقت والتاريخ</th>
                <th className="p-2 font-bold">المستخدم</th>
                <th className="p-2 font-bold">الإجراء</th>
                <th className="p-2 font-bold">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 20).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2 font-mono text-slate-500 tabular-nums text-[11px]">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('ar-SA') : 'الآن'}
                  </td>
                  <td className="p-2 font-semibold text-slate-800">{log.userName}</td>
                  <td className="p-2 font-bold text-emerald-800">{log.action}</td>
                  <td className="p-2 text-slate-600 truncate max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
