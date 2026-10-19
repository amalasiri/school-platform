import React, { useState } from 'react';
import { Domain, Criterion, Indicator, UserRole } from '../types';
import { storageService } from '../services/storageService';
import {
  ListTree,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  FilePlus,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface TaxonomyEditorViewProps {
  domains: Domain[];
  criteria: Criterion[];
  indicators: Indicator[];
  currentRole: UserRole;
  onUpdateAll: (domains: Domain[], criteria: Criterion[], indicators: Indicator[]) => void;
}

export const TaxonomyEditorView: React.FC<TaxonomyEditorViewProps> = ({
  domains,
  criteria,
  indicators,
  currentRole,
  onUpdateAll,
}) => {
  const [activeTab, setActiveTab] = useState<'domains' | 'criteria' | 'indicators'>('indicators');
  
  // Indicator editing state
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
  const [newIndicatorCode, setNewIndicatorCode] = useState<string>('');
  const [newIndicatorName, setNewIndicatorName] = useState<string>('');
  const [newIndicatorDesc, setNewIndicatorDesc] = useState<string>('');
  const [newIndicatorDomainId, setNewIndicatorDomainId] = useState<string>(domains[0]?.id || '');
  const [newIndicatorCriterionId, setNewIndicatorCriterionId] = useState<string>(criteria[0]?.id || '');

  // Domain editing state
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [newDomainName, setNewDomainName] = useState<string>('');
  const [newDomainCode, setNewDomainCode] = useState<string>('');
  const [newDomainDesc, setNewDomainDesc] = useState<string>('');

  // Criterion editing state
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [newCritName, setNewCritName] = useState<string>('');
  const [newCritCode, setNewCritCode] = useState<string>('');
  const [newCritDesc, setNewCritDesc] = useState<string>('');
  const [newCritDomainId, setNewCritDomainId] = useState<string>(domains[0]?.id || '');

  const [message, setMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  // Add / Update Indicator
  const handleSaveIndicator = () => {
    if (!newIndicatorName.trim() || !newIndicatorCode.trim()) {
      alert('يرجى إدخال رمز المؤشر ونصه الكامل.');
      return;
    }

    let updatedList: Indicator[];
    if (editingIndicator) {
      updatedList = indicators.map((ind) =>
        ind.id === editingIndicator.id
          ? {
              ...ind,
              code: newIndicatorCode,
              name: newIndicatorName,
              description: newIndicatorDesc,
              domainId: newIndicatorDomainId,
              criterionId: newIndicatorCriterionId,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          : ind
      );
      showSuccess(`تم تحديث المؤشر [${newIndicatorCode}] بنجاح`);
    } else {
      const newInd: Indicator = {
        id: `ind_${Date.now()}`,
        domainId: newIndicatorDomainId,
        criterionId: newIndicatorCriterionId,
        code: newIndicatorCode,
        name: newIndicatorName,
        description: newIndicatorDesc,
        order: indicators.length + 1,
        status: 'not_started',
        notes: '',
        lastUpdated: new Date().toISOString().split('T')[0],
        isApprovedByPrincipal: false,
        evidenceFiles: [],
      };
      updatedList = [...indicators, newInd];
      showSuccess(`تمت إضافة المؤشر الجديد [${newIndicatorCode}]`);
    }

    storageService.saveIndicators(updatedList);
    onUpdateAll(domains, criteria, updatedList);
    resetIndicatorForm();
  };

  const resetIndicatorForm = () => {
    setEditingIndicator(null);
    setNewIndicatorCode('');
    setNewIndicatorName('');
    setNewIndicatorDesc('');
  };

  // Delete indicator (or mark excluded)
  const handleDeleteIndicator = (indId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المؤشر؟ لن يتم حذف أي شواهد محفوظة مسبقًا.')) return;
    const updated = indicators.filter((i) => i.id !== indId);
    storageService.saveIndicators(updated);
    onUpdateAll(domains, criteria, updated);
    showSuccess('تم حذف المؤشر بنجاح');
  };

  // Add / Update Domain
  const handleSaveDomain = () => {
    if (!newDomainName.trim() || !newDomainCode.trim()) {
      alert('يرجى إدخال اسم المجال ورقمه.');
      return;
    }

    let updatedDomains: Domain[];
    if (editingDomain) {
      updatedDomains = domains.map((d) =>
        d.id === editingDomain.id
          ? { ...d, name: newDomainName, code: newDomainCode, description: newDomainDesc }
          : d
      );
      showSuccess('تم تحديث المجال بنجاح');
    } else {
      const newD: Domain = {
        id: `domain_${Date.now()}`,
        code: newDomainCode,
        name: newDomainName,
        description: newDomainDesc,
        order: domains.length + 1,
      };
      updatedDomains = [...domains, newD];
      showSuccess('تمت إضافة المجال الجديد');
    }

    storageService.saveDomains(updatedDomains);
    onUpdateAll(updatedDomains, criteria, indicators);
    setEditingDomain(null);
    setNewDomainName('');
    setNewDomainCode('');
    setNewDomainDesc('');
  };

  // Add / Update Criterion
  const handleSaveCriterion = () => {
    if (!newCritName.trim() || !newCritCode.trim()) {
      alert('يرجى إدخال اسم المعيار ورمزه.');
      return;
    }

    let updatedCriteria: Criterion[];
    if (editingCriterion) {
      updatedCriteria = criteria.map((c) =>
        c.id === editingCriterion.id
          ? { ...c, name: newCritName, code: newCritCode, description: newCritDesc, domainId: newCritDomainId }
          : c
      );
      showSuccess('تم تحديث المعيار بنجاح');
    } else {
      const newC: Criterion = {
        id: `crit_${Date.now()}`,
        domainId: newCritDomainId,
        code: newCritCode,
        name: newCritName,
        description: newCritDesc,
        order: criteria.length + 1,
      };
      updatedCriteria = [...criteria, newC];
      showSuccess('تمت إضافة المعيار الجديد');
    }

    storageService.saveCriteria(updatedCriteria);
    onUpdateAll(domains, updatedCriteria, indicators);
    setEditingCriterion(null);
    setNewCritName('');
    setNewCritCode('');
    setNewCritDesc('');
  };

  return (
    <div className="space-y-6">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            إدارة المعايير والمؤشرات والقوائم المدرسية
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            تعديل وإضافة وترتيب المجالات والمعايير والمؤشرات ديناميكيًا بما يلبي متطلبات التوسع المستمر
          </p>
        </div>

        {/* أزرار التبديل بين المستويات الثلاثة */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('indicators')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === 'indicators' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المؤشرات الفرعية ({indicators.length})
          </button>
          <button
            onClick={() => setActiveTab('criteria')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === 'criteria' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المعايير الرئيسية ({criteria.length})
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
              activeTab === 'domains' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المجالات ({domains.length})
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          <span>{message}</span>
        </div>
      )}

      {/* تبويب إدارة المؤشرات */}
      {activeTab === 'indicators' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* نموذج إضافة / تعديل مؤشر */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 self-start">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-emerald-700" />
              <span>{editingIndicator ? 'تعديل المؤشر الحالي' : 'إضافة مؤشر تقويم جديد'}</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">المجال التابع له:</label>
                <select
                  value={newIndicatorDomainId}
                  onChange={(e) => setNewIndicatorDomainId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">المعيار التابع له:</label>
                <select
                  value={newIndicatorCriterionId}
                  onChange={(e) => setNewIndicatorCriterionId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  {criteria
                    .filter((c) => c.domainId === newIndicatorDomainId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الرمز الرسمي للمؤشر:</label>
                <input
                  type="text"
                  value={newIndicatorCode}
                  onChange={(e) => setNewIndicatorCode(e.target.value)}
                  placeholder="مثال: 1-1-1-3"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نص المؤشر الرسمي:</label>
                <textarea
                  rows={3}
                  value={newIndicatorName}
                  onChange={(e) => setNewIndicatorName(e.target.value)}
                  placeholder="اكتب نص المؤشر كما ورد في الدليل الوزاري..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">متطلبات الشواهد (اختياري):</label>
                <textarea
                  rows={2}
                  value={newIndicatorDesc}
                  onChange={(e) => setNewIndicatorDesc(e.target.value)}
                  placeholder="أنواع الوثائق والشواهد المطلوبة لإثبات المؤشر..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveIndicator}
                  className="flex-1 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingIndicator ? 'تحديث المؤشر' : 'إضافة المؤشر'}</span>
                </button>
                {editingIndicator && (
                  <button
                    type="button"
                    onClick={resetIndicatorForm}
                    className="text-xs text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* قائمة المؤشرات الحالية */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">قائمة المؤشرات المعرفة بالنظام</span>
              <span className="text-xs text-slate-500">{indicators.length} مؤشر مسجل</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {indicators.map((ind) => (
                <div key={ind.id} className="p-3.5 hover:bg-slate-50/80 flex items-center justify-between gap-3">
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {ind.code}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {ind.evidenceFiles?.length || 0} شواهد مرتبطة
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">
                      {ind.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingIndicator(ind);
                        setNewIndicatorCode(ind.code);
                        setNewIndicatorName(ind.name);
                        setNewIndicatorDesc(ind.description || '');
                        setNewIndicatorDomainId(ind.domainId);
                        setNewIndicatorCriterionId(ind.criterionId);
                      }}
                      className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteIndicator(ind.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* تبويب إدارة المعايير */}
      {activeTab === 'criteria' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 self-start">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-700" />
              <span>{editingCriterion ? 'تعديل المعيار' : 'إضافة معيار جديد'}</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">المجال:</label>
                <select
                  value={newCritDomainId}
                  onChange={(e) => setNewCritDomainId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رمز المعيار:</label>
                <input
                  type="text"
                  value={newCritCode}
                  onChange={(e) => setNewCritCode(e.target.value)}
                  placeholder="مثال: 1-6"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم المعيار:</label>
                <input
                  type="text"
                  value={newCritName}
                  onChange={(e) => setNewCritName(e.target.value)}
                  placeholder="مثال: الشراكة العالمية والتميز"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">وصف المعيار:</label>
                <textarea
                  rows={2}
                  value={newCritDesc}
                  onChange={(e) => setNewCritDesc(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveCriterion}
                className="w-full text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>حفظ المعيار</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">المعايير المعتمدة ({criteria.length})</span>
            </div>
            <div className="divide-y divide-slate-100">
              {criteria.map((crit) => (
                <div key={crit.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                        {crit.code}
                      </span>
                      <strong className="text-xs sm:text-sm text-slate-900">{crit.name}</strong>
                    </div>
                    {crit.description && (
                      <p className="text-xs text-slate-500 mt-1">{crit.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingCriterion(crit);
                      setNewCritCode(crit.code);
                      setNewCritName(crit.name);
                      setNewCritDesc(crit.description || '');
                      setNewCritDomainId(crit.domainId);
                    }}
                    className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* تبويب إدارة المجالات */}
      {activeTab === 'domains' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4 self-start">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>{editingDomain ? 'تعديل المجال' : 'إضافة مجال رئيسي جديد'}</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رقم/رمز المجال:</label>
                <input
                  type="text"
                  value={newDomainCode}
                  onChange={(e) => setNewDomainCode(e.target.value)}
                  placeholder="مثال: 5"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم المجال:</label>
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="مثال: الابتكار والتحول الرقمي"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">وصف المجال:</label>
                <textarea
                  rows={2}
                  value={newDomainDesc}
                  onChange={(e) => setNewDomainDesc(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveDomain}
                className="w-full text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>حفظ المجال</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">المجالات الرئيسية الأربعة ({domains.length})</span>
            </div>
            <div className="divide-y divide-slate-100">
              {domains.map((domain) => (
                <div key={domain.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-emerald-900 text-white px-2 py-0.5 rounded">
                        المجال {domain.code}
                      </span>
                      <strong className="text-xs sm:text-sm text-slate-900">{domain.name}</strong>
                    </div>
                    {domain.description && (
                      <p className="text-xs text-slate-500 mt-1">{domain.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingDomain(domain);
                      setNewDomainCode(domain.code);
                      setNewDomainName(domain.name);
                      setNewDomainDesc(domain.description || '');
                    }}
                    className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
