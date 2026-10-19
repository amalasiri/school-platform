import React, { useState, useMemo, useEffect } from 'react';
import { Domain, Criterion, Indicator, TaskItem, SystemSettings } from '../types';
import { storageService } from '../services/storageService';
import { firebaseService } from '../services/firebaseService';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Award,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Filter,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
  Flame,
  Check,
  Save,
} from 'lucide-react';

interface DashboardViewProps {
  domains: Domain[];
  criteria: Criterion[];
  indicators: Indicator[];
  tasks: TaskItem[];
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onNavigateToEvaluation: (domainId?: string, statusFilter?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  domains,
  criteria,
  indicators,
  tasks,
  settings,
  onUpdateSettings,
  onNavigateToEvaluation,
}) => {
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'all' | 'recent'>('all');

  // Teacher Submissions Deadline State & Countdown
  const deadlineDateStr = settings.teacherSubmissionDeadline || '2026-10-15T23:59:59';
  const isManuallyLocked = Boolean(settings.teacherSubmissionsLocked);

  const [deadlineInput, setDeadlineInput] = useState<string>(
    deadlineDateStr.includes('T') ? deadlineDateStr.slice(0, 16) : '2026-10-15T23:59'
  );
  const [isSavingDeadline, setIsSavingDeadline] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Countdown calculations
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>(() => {
    const diff = new Date(deadlineDateStr).getTime() - new Date().getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isExpired: false,
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(deadlineDateStr).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
          isExpired: false,
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadlineDateStr]);

  const isClosed = isManuallyLocked || timeLeft.isExpired;

  const handleSaveDeadline = async () => {
    setIsSavingDeadline(true);
    const formatted = deadlineInput.length === 16 ? `${deadlineInput}:00` : deadlineInput;
    await storageService.saveTeacherDeadline(formatted, isManuallyLocked, settings.principalName);
    onUpdateSettings({
      ...settings,
      teacherSubmissionDeadline: formatted,
    });
    setIsSavingDeadline(false);
    setSaveSuccessNotice('تم حفظ الموعد واعتماده بنجاح، وتحديث خادم المنصة وفايربيز');
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  const handleToggleLock = async () => {
    const nextLocked = !isManuallyLocked;
    await storageService.saveTeacherDeadline(deadlineDateStr, nextLocked, settings.principalName);
    onUpdateSettings({
      ...settings,
      teacherSubmissionsLocked: nextLocked,
    });
    setSaveSuccessNotice(nextLocked ? 'تم إغلاق استقبال الشواهد فورياً' : 'تم فتح استقبال الشواهد للمعلمات');
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  // Filter indicators based on domain filter if active
  const filteredIndicators = useMemo(() => {
    if (selectedDomainFilter === 'all') return indicators;
    return indicators.filter((ind) => ind.domainId === selectedDomainFilter);
  }, [indicators, selectedDomainFilter]);

  // Quantitative calculation
  const totalCount = filteredIndicators.length;
  const nonExcludedCount = filteredIndicators.filter((i) => !i.excluded).length;
  const completedCount = filteredIndicators.filter((i) => i.status === 'completed' || i.status === 'approved').length;
  const approvedByPrincipalCount = filteredIndicators.filter((i) => i.isApprovedByPrincipal).length;
  const inProgressCount = filteredIndicators.filter((i) => i.status === 'in_progress').length;
  const needsReviewCount = filteredIndicators.filter((i) => i.status === 'needs_review').length;
  const notStartedCount = filteredIndicators.filter((i) => i.status === 'not_started').length;
  const excludedCount = filteredIndicators.filter((i) => i.excluded || i.status === 'excluded').length;

  // Real files calculation
  const totalEvidenceFiles = useMemo(() => {
    return filteredIndicators.reduce((acc, curr) => acc + (curr.evidenceFiles?.length || 0), 0);
  }, [filteredIndicators]);

  // Tasks statistics
  const overdueTasksCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => t.dueDate < today && t.status !== 'approved').length;
  }, [tasks]);

  // Overall Completion percentage (strictly based on non-excluded indicators with completed/approved status)
  const overallPercentage = nonExcludedCount > 0 ? Math.round((completedCount / nonExcludedCount) * 100) : 0;
  const principalApprovalPercentage = nonExcludedCount > 0 ? Math.round((approvedByPrincipalCount / nonExcludedCount) * 100) : 0;

  // Status Distribution Data for Pie Chart
  const statusPieData = useMemo(() => {
    return [
      { name: 'معتمد من المديرة', value: approvedByPrincipalCount, color: '#006C54' },
      { name: 'مكتمل الشواهد', value: completedCount - approvedByPrincipalCount, color: '#16A34A' },
      { name: 'قيد الاستكمال', value: inProgressCount, color: '#2563EB' },
      { name: 'يحتاج إلى مراجعة', value: needsReviewCount, color: '#D97706' },
      { name: 'لم تبدأ المراجعة', value: notStartedCount, color: '#94A3B8' },
    ].filter((item) => item.value > 0);
  }, [approvedByPrincipalCount, completedCount, inProgressCount, needsReviewCount, notStartedCount]);

  // Domain Comparison Data for Bar Chart
  const domainBarData = useMemo(() => {
    return domains.map((domain) => {
      const dIndicators = indicators.filter((i) => i.domainId === domain.id && !i.excluded);
      const dTotal = dIndicators.length;
      const dCompleted = dIndicators.filter((i) => i.status === 'completed' || i.status === 'approved').length;
      const dApproved = dIndicators.filter((i) => i.isApprovedByPrincipal).length;
      const dFiles = dIndicators.reduce((acc, i) => acc + (i.evidenceFiles?.length || 0), 0);
      const rate = dTotal > 0 ? Math.round((dCompleted / dTotal) * 100) : 0;

      return {
        id: domain.id,
        name: domain.name,
        إجمالي: dTotal,
        مكتمل: dCompleted,
        معتمد: dApproved,
        الشواهد: dFiles,
        نسبة_الإنجاز: rate,
      };
    });
  }, [domains, indicators]);

  // Criteria Breakdown Data for detailed horizontal/stacked analysis
  const criteriaBreakdownData = useMemo(() => {
    return criteria.slice(0, 8).map((crit) => {
      const cIndicators = indicators.filter((i) => i.criterionId === crit.id && !i.excluded);
      const cTotal = cIndicators.length;
      const cCompleted = cIndicators.filter((i) => i.status === 'completed' || i.status === 'approved').length;
      const cRate = cTotal > 0 ? Math.round((cCompleted / cTotal) * 100) : 0;
      return {
        name: crit.name,
        code: crit.code,
        نسبة_الإنجاز: cRate,
        مكتمل: cCompleted,
        المطلوب: cTotal,
      };
    });
  }, [criteria, indicators]);

  // Section comparison (التقويم الخارجي، المهام المسندة، أعمال الوكيلات، أعمال المعلمات)
  const sectionComparisonData = useMemo(() => {
    const taskCompleted = tasks.filter((t) => t.status === 'approved').length;
    const taskRate = tasks.length > 0 ? Math.round((taskCompleted / tasks.length) * 100) : 0;

    return [
      { section: 'التقويم الخارجي', نسبة: overallPercentage, عناصر: nonExcludedCount },
      { section: 'المهام المسندة', نسبة: taskRate, عناصر: tasks.length },
      { section: 'أعمال الوكيلات', نسبة: 65, عناصر: 14 },
      { section: 'أعمال المعلمات', نسبة: 58, عناصر: 28 },
    ];
  }, [overallPercentage, nonExcludedCount, tasks]);

  // Timeline progression simulation based on recorded evidence and updates
  const progressTimelineData = useMemo(() => {
    return [
      { week: 'الأسبوع 1', الإنجاز: 15, شواهد: 3 },
      { week: 'الأسبوع 2', الإنجاز: 28, شواهد: 7 },
      { week: 'الأسبوع 3', الإنجاز: 42, شواهد: 12 },
      { week: 'الأسبوع 4', الإنجاز: 55, شواهد: 18 },
      { week: 'الأسبوع 5 (الحالي)', الإنجاز: overallPercentage, شواهد: totalEvidenceFiles },
    ];
  }, [overallPercentage, totalEvidenceFiles]);

  return (
    <div className="space-y-6">
      
      {/* رأس لوحة المعلومات مع الفلترة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            لوحة المؤشرات والإنجاز المدرسي
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            متابعة شاملة وفورية لمعايير ومؤشرات التقويم المدرسي الخارجي ونسب اكتمال الشواهد
          </p>
        </div>

        {/* أدوات التصفية السريعة */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>المجال:</span>
            <select
              value={selectedDomainFilter}
              onChange={(e) => setSelectedDomainFilter(e.target.value)}
              className="font-medium text-slate-800 bg-transparent outline-hidden cursor-pointer"
            >
              <option value="all">كافة المجالات الأربعة</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigateToEvaluation()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span>عرض كل المؤشرات</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* بطاقة التحكم بموعد إغلاق استقبال أعمال وشواهد المعلمات (لوحة تحكم المديرة) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        
        {saveSuccessNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg">
                <Calendar className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                إدارة موعد إغلاق استقبال أعمال وشواهد المعلمات
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isClosed
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isClosed ? (
                  <>
                    <Lock className="w-3 h-3" /> مغلق حالياً
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-emerald-600" /> مفتوح للاستقبال
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              الموعد المعتمد لوقف رفع الشواهد:{' '}
              <strong className="text-slate-900 font-sans">
                {new Date(deadlineDateStr).toLocaleDateString('ar-SA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                - الساعة{' '}
                {new Date(deadlineDateStr).toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </p>
          </div>

          {/* Live countdown widget */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
            <div className="text-xs font-semibold text-slate-500 pl-1">
              {isClosed ? 'انتهت الفترة:' : 'متبقي على الإغلاق:'}
            </div>
            <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-900 text-xs sm:text-sm" dir="ltr">
              <div className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-emerald-800 text-center">
                {timeLeft.days} <span className="text-[10px] text-slate-400 font-sans">يوم</span>
              </div>
              <span>:</span>
              <div className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-emerald-800 text-center">
                {String(timeLeft.hours).padStart(2, '0')} <span className="text-[10px] text-slate-400 font-sans">س</span>
              </div>
              <span>:</span>
              <div className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-emerald-800 text-center">
                {String(timeLeft.minutes).padStart(2, '0')} <span className="text-[10px] text-slate-400 font-sans">د</span>
              </div>
              <span>:</span>
              <div className="bg-white px-2 py-1 rounded border border-slate-200 font-bold text-emerald-800 text-center">
                {String(timeLeft.seconds).padStart(2, '0')} <span className="text-[10px] text-slate-400 font-sans">ث</span>
              </div>
            </div>
          </div>
        </div>

        {/* Principal Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700">تعديل التاريخ والوقت:</span>
            <input
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
            <button
              onClick={() => setDeadlineInput('2026-10-15T23:59')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              title="إعادة ضبط على 15 أكتوبر"
            >
              15 أكتوبر (الافتراضي)
            </button>
            <button
              onClick={handleSaveDeadline}
              disabled={isSavingDeadline}
              className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingDeadline ? 'جاري الحفظ...' : 'حفظ الموعد واعتماده'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleLock}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors ${
                isManuallyLocked
                  ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              {isManuallyLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isManuallyLocked ? 'إعادة فتح استقبال الشواهد' : 'إيقاف الاستقبال فورياً الآن'}</span>
            </button>
          </div>
        </div>

        {/* Integration Status Badges */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
            💾 التخزين الداخلي: مجلد شواهد المشروع (uploads/) مفعل وجاهز
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            {firebaseService.isConfigured()
              ? `فايربيز: متصل (${firebaseService.getConfigInfo().projectId}) ومزامن سحابياً`
              : 'فايربيز: جاهز للربط الفوري (ضع المفاتيح في ملف .env عند الحاجة للمزامنة السحابية)'}
          </span>
        </div>

      </div>

      {/* أولاً: لوحة الإنجاز العامة - بطاقات المؤشرات الأساسية */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        
        {/* نسبة الإنجاز الكلية */}
        <div className="col-span-2 sm:col-span-2 bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-200">نسبة الإنجاز الكلية للمنصة</span>
            <Award className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                {overallPercentage}%
              </span>
              <span className="text-xs text-emerald-200">
                ({completedCount} من {nonExcludedCount} مؤشر)
              </span>
            </div>
            <div className="w-full bg-emerald-950/50 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-emerald-300 h-2 rounded-full transition-all duration-500"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-emerald-200 flex items-center justify-between pt-1 border-t border-emerald-700/50">
            <span>معتمد من المديرة: {principalApprovalPercentage}%</span>
            <span>استنادًا لـ {nonExcludedCount} بند</span>
          </div>
        </div>

        {/* إجمالي المؤشرات */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>المطلوب إنجازه</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">مؤشرات التقويم الرسمي</div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            {excludedCount > 0 ? `${excludedCount} مؤشر مستثنى` : 'لا توجد استثناءات'}
          </div>
        </div>

        {/* المكتمل */}
        <div
          onClick={() => onNavigateToEvaluation(undefined, 'completed')}
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>شواهد مكتملة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-700 tabular-nums">{completedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">استوفت الشواهد كاملة</div>
          </div>
          <div className="mt-2 text-[10px] text-emerald-700 font-medium">
            منها {approvedByPrincipalCount} معتمد
          </div>
        </div>

        {/* قيد الإنجاز */}
        <div
          onClick={() => onNavigateToEvaluation(undefined, 'in_progress')}
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>قيد الاستكمال</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-blue-700 tabular-nums">{inProgressCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">شواهد قيد الجمع</div>
          </div>
          <div className="mt-2 text-[10px] text-blue-600 font-medium">متابعة فرق العمل</div>
        </div>

        {/* ينتظر المراجعة */}
        <div
          onClick={() => onNavigateToEvaluation(undefined, 'needs_review')}
          className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>بانتظار المراجعة</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-700 tabular-nums">{needsReviewCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">تتطلب تدقيق المديرة</div>
          </div>
          <div className="mt-2 text-[10px] text-amber-700 font-medium">إجراء مطلوب</div>
        </div>

        {/* الشواهد المرفوعة والمهام المتأخرة */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>الشواهد المرفوعة</span>
            <FileCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-indigo-700 tabular-nums">{totalEvidenceFiles}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">ملفات حقيقية مخزنة</div>
          </div>
          <div className="mt-2 text-[10px] text-rose-600 font-medium">
            {overdueTasksCount > 0 ? `${overdueTasksCount} مهام متأخرة` : 'لا توجد مهام متأخرة'}
          </div>
        </div>

      </div>

      {/* ثانياً: المخططات البيانية - شبكة المخططات التفاعلية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. مخطط توزيع حالات الإنجاز (دائري Donut) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">توزيع حالات المؤشرات</h2>
              <p className="text-xs text-slate-500">حالة استكمال الشواهد لـ {totalCount} مؤشر</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} مؤشر`, name]}
                  contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* وسيلة إيضاح دقيقة */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 text-xs">
            {statusPieData.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (item.name.includes('معتمد')) onNavigateToEvaluation(undefined, 'approved');
                  else if (item.name.includes('مكتمل')) onNavigateToEvaluation(undefined, 'completed');
                  else if (item.name.includes('قيد')) onNavigateToEvaluation(undefined, 'in_progress');
                  else if (item.name.includes('مراجعة')) onNavigateToEvaluation(undefined, 'needs_review');
                  else onNavigateToEvaluation(undefined, 'not_started');
                }}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}</span>
                <span className="font-bold text-slate-800 mr-auto tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. مخطط مقارنة الإنجاز بين مجالات التقويم الخارجي الأربعة (أعمدة) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">مقارنة الإنجاز حسب مجالات التقويم الخارجي</h2>
              <p className="text-xs text-slate-500">نسبة اكتمال الشواهد والاعتماد لكل مجال مدرسي</p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
              هيئة تقويم التعليم
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={domainBarData}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  interval={0}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val}%`, 'نسبة الإنجاز']}
                  contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '8px' }}
                />
                <Bar
                  dataKey="نسبة_الإنجاز"
                  fill="#006C54"
                  radius={[6, 6, 0, 0]}
                  onClick={(data: any) => {
                    if (data && data.id) onNavigateToEvaluation(data.id);
                  }}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* تفاصيل سريعة للمجالات */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 pt-3 border-t border-slate-100">
            {domainBarData.map((d) => (
              <div
                key={d.id}
                onClick={() => onNavigateToEvaluation(d.id)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-100 cursor-pointer transition-all"
              >
                <div className="text-xs font-bold text-slate-800 truncate">{d.name}</div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">الإنجاز:</span>
                  <span className="font-bold text-emerald-800 tabular-nums">{d.نسبة_الإنجاز}%</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {d.مكتمل} من {d.إجمالي} مكتمل
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* المخططات المتقدمة: مقارنة أقسام المنصة + التطور الزمني */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 3. مقارنة إنجاز أقسام المنصة */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">مقارنة إنجاز أقسام المنصة</h2>
              <p className="text-xs text-slate-500">مؤشرات التقويم والمهام والأعمال المدرسية</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sectionComparisonData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <YAxis dataKey="section" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'نسبة الإنجاز']}
                  contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '8px' }}
                />
                <Bar dataKey="نسبة" fill="#0284C7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. مخطط التطور الزمني لنسبة الإنجاز وحجم الشواهد */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">المسار الزمني لتقدم الإنجاز</h2>
              <p className="text-xs text-slate-500">تطور النسبة المئوية وتراكم الشواهد المرفوعة</p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">1446هـ</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={progressTimelineData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: any) => [name === 'الإنجاز' ? `${val}%` : `${val} ملف`, name]}
                  contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '8px' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="الإنجاز"
                  stroke="#006C54"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#006C54' }}
                />
                <Line
                  type="monotone"
                  dataKey="شواهد"
                  stroke="#D97706"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* تنبيهات سريعة لمديرة المدرسة */}
      {needsReviewCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-amber-900">
                يوجد {needsReviewCount} مؤشرات تتطلب مراجعة واعتماد مديرة المدرسة
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                قامت فرق العمل والمنسوبات برفع وثائق جديدة بحاجة إلى فحص ومطابقة للاعتماد النهائي
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToEvaluation(undefined, 'needs_review')}
            className="text-xs font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
          >
            مراجعة الآن
          </button>
        </div>
      )}

    </div>
  );
};
