import React, { useState, useMemo } from 'react';
import { Domain, Criterion, Indicator, UserRole } from '../types';
import { IndicatorModal } from './IndicatorModal';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Paperclip,
  ExternalLink,
  Plus,
  Eye,
  Layers,
} from 'lucide-react';

interface EvaluationViewProps {
  domains: Domain[];
  criteria: Criterion[];
  indicators: Indicator[];
  currentRole: UserRole;
  initialDomainId?: string;
  initialStatusFilter?: string;
  onUpdateIndicator: (updated: Indicator) => void;
  onAddIndicator?: (domainId: string, criterionId: string) => void;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  domains,
  criteria,
  indicators,
  currentRole,
  initialDomainId,
  initialStatusFilter,
  onUpdateIndicator,
  onAddIndicator,
}) => {
  const [selectedDomainId, setSelectedDomainId] = useState<string>(initialDomainId || 'all');
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusFilter || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Track expanded criteria
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>(() => {
    // Expand first few by default
    const map: Record<string, boolean> = {};
    criteria.forEach((c, idx) => {
      map[c.id] = idx < 4;
    });
    return map;
  });

  const [activeIndicator, setActiveIndicator] = useState<Indicator | null>(null);

  const toggleCriterion = (criterionId: string) => {
    setExpandedCriteria((prev) => ({
      ...prev,
      [criterionId]: !prev[criterionId],
    }));
  };

  const expandAll = () => {
    const map: Record<string, boolean> = {};
    criteria.forEach((c) => {
      map[c.id] = true;
    });
    setExpandedCriteria(map);
  };

  const collapseAll = () => {
    setExpandedCriteria({});
  };

  // Filter criteria based on domain
  const availableCriteria = useMemo(() => {
    if (selectedDomainId === 'all') return criteria;
    return criteria.filter((c) => c.domainId === selectedDomainId);
  }, [criteria, selectedDomainId]);

  // Filter indicators
  const filteredIndicators = useMemo(() => {
    return indicators.filter((ind) => {
      // Domain filter
      if (selectedDomainId !== 'all' && ind.domainId !== selectedDomainId) {
        return false;
      }
      // Criterion filter
      if (selectedCriterionId !== 'all' && ind.criterionId !== selectedCriterionId) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'approved' && !ind.isApprovedByPrincipal) return false;
        if (selectedStatus !== 'approved' && ind.status !== selectedStatus) return false;
      }
      // Search query (code, name, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = ind.code.toLowerCase().includes(q);
        const matchesName = ind.name.toLowerCase().includes(q);
        const matchesDesc = ind.description?.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [indicators, selectedDomainId, selectedCriterionId, selectedStatus, searchQuery]);

  // Group filtered indicators by criterion
  const indicatorsByCriterion = useMemo(() => {
    const map: Record<string, Indicator[]> = {};
    filteredIndicators.forEach((ind) => {
      if (!map[ind.criterionId]) map[ind.criterionId] = [];
      map[ind.criterionId].push(ind);
    });
    return map;
  }, [filteredIndicators]);

  const getStatusBadge = (indicator: Indicator) => {
    if (indicator.isApprovedByPrincipal) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          معتمد من المديرة
        </span>
      );
    }
    switch (indicator.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" />
            مكتمل الشواهد
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            <Clock className="w-3.5 h-3.5" />
            قيد الاستكمال
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <AlertCircle className="w-3.5 h-3.5" />
            يحتاج إلى مراجعة
          </span>
        );
      case 'excluded':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            غير منطبق / مستثنى
          </span>
        );
      case 'not_started':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            لم تبدأ المراجعة
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* رأس الصفحة الرئيسي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            معايير التقويم الخارجي
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            المجالات الأربعة والمعايير والمؤشرات الرسمية المعتمدة من هيئة تقويم التعليم والتدريب ووزارة التعليم
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            توسيع كافة المعايير
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            طي الكل
          </button>
        </div>
      </div>

      {/* بطاقات المجالات الأربعة لاختيار وتصفية المجال */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {domains.map((domain) => {
          const isSelected = selectedDomainId === domain.id;
          const dIndicators = indicators.filter((i) => i.domainId === domain.id && !i.excluded);
          const dTotal = dIndicators.length;
          const dCompleted = dIndicators.filter((i) => i.status === 'completed' || i.status === 'approved').length;
          const dPercent = dTotal > 0 ? Math.round((dCompleted / dTotal) * 100) : 0;

          return (
            <div
              key={domain.id}
              onClick={() => {
                setSelectedDomainId(isSelected ? 'all' : domain.id);
                setSelectedCriterionId('all');
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  المجال {domain.code}
                </span>
                <span className="text-xs font-bold text-emerald-800 tabular-nums">
                  {dPercent}%
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 mt-2 truncate">
                {domain.name}
              </h2>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                {domain.description}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>{dCompleted} من {dTotal} مؤشر مكتمل</span>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  {isSelected ? 'المجال محدد' : 'عرض المعايير'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* شريط البحث والفلاتر المتقدمة */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* حقل البحث بالنص أو الرمز */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برمز المؤشر أو نصه..."
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>

          {/* فلتر المجال */}
          <div>
            <select
              value={selectedDomainId}
              onChange={(e) => {
                setSelectedDomainId(e.target.value);
                setSelectedCriterionId('all');
              }}
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

          {/* فلتر المعيار */}
          <div>
            <select
              value={selectedCriterionId}
              onChange={(e) => setSelectedCriterionId(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="all">كافة المعايير المندرجة</option>
              {availableCriteria.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر الحالة */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="all">كافة حالات المؤشرات</option>
              <option value="approved">معتمد من المديرة</option>
              <option value="completed">مكتمل الشواهد</option>
              <option value="in_progress">قيد الاستكمال</option>
              <option value="needs_review">يحتاج إلى مراجعة</option>
              <option value="not_started">لم تبدأ المراجعة</option>
              <option value="excluded">غير منطبق / مستثنى</option>
            </select>
          </div>

        </div>

        {/* مؤشر نتائج البحث */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            يتم عرض <strong className="text-slate-800">{filteredIndicators.length}</strong> مؤشر من إجمالي {indicators.length}
          </span>
          {(selectedDomainId !== 'all' || selectedCriterionId !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDomainId('all');
                setSelectedCriterionId('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              إلغاء التصفية واستعادة الكل
            </button>
          )}
        </div>
      </div>

      {/* قائمة المعايير والمؤشرات الشجرية المنظمة */}
      <div className="space-y-4">
        {availableCriteria.map((criterion) => {
          const criterionIndicators = indicatorsByCriterion[criterion.id] || [];
          const isExpanded = !!expandedCriteria[criterion.id];
          const criterionDomain = domains.find((d) => d.id === criterion.domainId);

          // If filtering yields 0 indicators in this criterion, hide if searching
          if (criterionIndicators.length === 0 && (searchQuery || selectedStatus !== 'all')) {
            return null;
          }

          const completedInCrit = criterionIndicators.filter((i) => i.status === 'completed' || i.status === 'approved').length;
          const critTotal = criterionIndicators.length;
          const critRate = critTotal > 0 ? Math.round((completedInCrit / critTotal) * 100) : 0;

          return (
            <div
              key={criterion.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all"
            >
              {/* شريط عنوان المعيار القابل للطي والتوسيع */}
              <div
                onClick={() => toggleCriterion(criterion.id)}
                className="p-4 bg-slate-50/80 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between gap-4 border-b border-slate-200 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs bg-emerald-900 text-white px-2 py-0.5 rounded">
                    {criterion.code}
                  </span>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      مجال {criterionDomain?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        معيار: {criterion.name}
                      </h3>
                      {criterion.id === 'crit_3_1_m' && (
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full">
                          المرحلة المتوسطة
                        </span>
                      )}
                      {criterion.id === 'crit_3_1_s' && (
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-full">
                          المرحلة الثانوية
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold text-slate-800 tabular-nums">
                      {completedInCrit}/{critTotal} مكتمل ({critRate}%)
                    </span>
                    <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-emerald-700 h-1.5 rounded-full"
                        style={{ width: `${critRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* قائمة المؤشرات التابعة للمعيار */}
              {isExpanded && (
                <div className="divide-y divide-slate-100 p-2 sm:p-3">
                  {criterionIndicators.length > 0 ? (
                    criterionIndicators.map((indicator) => {
                      const filesCount = indicator.evidenceFiles?.length || 0;
                      return (
                        <div
                          key={indicator.id}
                          className="p-3 sm:p-4 rounded-lg hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          {/* رمز المؤشر ونصه */}
                          <div className="flex items-start gap-2.5 flex-1">
                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-1 rounded shrink-0 mt-0.5">
                              {indicator.code}
                            </span>
                            {indicator.criterionId === 'crit_3_1_m' && (
                              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded shrink-0 mt-1">
                                متوسط
                              </span>
                            )}
                            {indicator.criterionId === 'crit_3_1_s' && (
                              <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded shrink-0 mt-1">
                                ثانوي
                              </span>
                            )}
                            <div className="space-y-1">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                                {indicator.name}
                              </p>
                              {indicator.description && (
                                <p className="text-[11px] sm:text-xs text-slate-600 bg-slate-50 border-r-2 border-emerald-600 pr-2.5 py-1.5 rounded-xs leading-relaxed mt-1">
                                  {indicator.description}
                                </p>
                              )}
                              {indicator.notes && (
                                <p className="text-xs text-slate-500 line-clamp-1 italic">
                                  ملاحظة المدرسة: {indicator.notes}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                                <span>آخر تحديث: {indicator.lastUpdated || 'مؤخرًا'}</span>
                                {indicator.approvedAt && (
                                  <>
                                    <span>·</span>
                                    <span className="text-emerald-700 font-medium">
                                      اعتمدت في: {indicator.approvedAt}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* حالة المؤشر وعدد الشواهد وزر المعاينة */}
                          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                            {/* شارة الحالة */}
                            <div>{getStatusBadge(indicator)}</div>

                            {/* عدد الشواهد المرفقة */}
                            <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md" title={`${filesCount} شواهد مرفوعة`}>
                              <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                              <span className="font-bold tabular-nums">{filesCount}</span>
                              <span className="hidden sm:inline">شواهد</span>
                            </div>

                            {/* زر فتح وتوثيق المؤشر */}
                            <button
                              onClick={() => setActiveIndicator(indicator)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-1.5 transition-colors shadow-2xs"
                            >
                              <span>توثيق الشواهد</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      لا توجد مؤشرات مطابقة لمعايير البحث الحالية داخل هذا المعيار.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* نافذة تفاصيل وتوثيق المؤشر عند الضغط */}
      {activeIndicator && (
        <IndicatorModal
          indicator={activeIndicator}
          criterion={criteria.find((c) => c.id === activeIndicator.criterionId)}
          domain={domains.find((d) => d.id === activeIndicator.domainId)}
          currentRole={currentRole}
          onClose={() => setActiveIndicator(null)}
          onUpdateIndicator={(updated) => {
            onUpdateIndicator(updated);
            setActiveIndicator(updated);
          }}
        />
      )}

    </div>
  );
};
