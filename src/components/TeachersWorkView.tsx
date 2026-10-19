import React, { useState, useEffect, useMemo } from 'react';
import { Domain, Criterion, Indicator, UserRole, EvidenceFile, SystemSettings } from '../types';
import { storageService } from '../services/storageService';
import { AUTHORIZED_TEACHERS, AuthorizedTeacher, getTeacherFolderName } from '../data/trustedStaff';
import {
  GraduationCap,
  Clock,
  Lock,
  Unlock,
  Upload,
  FileCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  Download,
  Eye,
  ShieldCheck,
  X,
  Sparkles,
  Cloud,
  FolderSync,
  HelpCircle,
  Info,
  Check,
} from 'lucide-react';

interface TeachersWorkViewProps {
  indicators: Indicator[];
  domains: Domain[];
  criteria: Criterion[];
  currentRole: UserRole;
  settings: SystemSettings;
  onUpdateIndicator: (updated: Indicator) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onNavigateToIndicator?: (indicatorId: string) => void;
}

export const TeachersWorkView: React.FC<TeachersWorkViewProps> = ({
  indicators,
  domains,
  criteria,
  currentRole,
  settings,
  onUpdateIndicator,
  onUpdateSettings,
}) => {
  // Deadline state
  const deadlineDateStr = settings.teacherSubmissionDeadline || '2026-10-15T23:59:59';
  const isManuallyLocked = Boolean(settings.teacherSubmissionsLocked);

  // Live countdown calculation
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>(() => calculateTimeLeft(deadlineDateStr));

  function calculateTimeLeft(deadline: string) {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds, isExpired: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadlineDateStr));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadlineDateStr]);

  const isSubmissionsClosed = isManuallyLocked || timeLeft.isExpired;

  // Trusted Teachers List & Drive Status
  const [authorizedTeachers, setAuthorizedTeachers] = useState<AuthorizedTeacher[]>(AUTHORIZED_TEACHERS);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('AB1234');
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState<boolean>(false);

  useEffect(() => {
    storageService.getTeachersList().then((list) => {
      if (list && list.length > 0) {
        setAuthorizedTeachers(list);
      }
    });
    storageService.getDriveStatus().then((status) => {
      setDriveStatus(status);
    });
  }, []);

  // Selected teacher details
  const currentSelectedTeacher = useMemo(() => {
    return authorizedTeachers.find((t) => t.id === selectedTeacherId) || authorizedTeachers[0];
  }, [authorizedTeachers, selectedTeacherId]);

  // Expected Google Drive folder name: teachers-files/{teacherName}-{first4CharactersOfTeacherId}
  const expectedSubfolderName = useMemo(() => {
    if (!currentSelectedTeacher) return 'teachers-files';
    return getTeacherFolderName(currentSelectedTeacher.name, currentSelectedTeacher.id);
  }, [currentSelectedTeacher]);

  // Upload Form State
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>('');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>('');
  const [evidenceTitle, setEvidenceTitle] = useState<string>('');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);

  // Filter criteria for selected domain
  const availableCriteria = useMemo(() => {
    if (!selectedDomainId) return [];
    return criteria.filter((c) => c.domainId === selectedDomainId);
  }, [criteria, selectedDomainId]);

  // Filter indicators for selected criterion
  const availableIndicators = useMemo(() => {
    if (!selectedCriterionId) return [];
    return indicators.filter((i) => i.criterionId === selectedCriterionId && !i.excluded);
  }, [indicators, selectedCriterionId]);

  // All uploaded evidence from teachers
  const allTeacherEvidence = useMemo(() => {
    const list: { indicator: Indicator; evidence: EvidenceFile }[] = [];
    indicators.forEach((ind) => {
      (ind.evidenceFiles || []).forEach((ev) => {
        list.push({ indicator: ind, evidence: ev });
      });
    });
    return list;
  }, [indicators]);

  // Filtered evidence list
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvidenceList = useMemo(() => {
    return allTeacherEvidence.filter(({ indicator, evidence }) => {
      const matchSearch =
        searchQuery === '' ||
        evidence.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evidence.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evidence.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evidence.driveFolderName && evidence.driveFolderName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [allTeacherEvidence, searchQuery]);

  // Allowed file extensions
  const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx'];
  const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadErrorMessage(`حجم الملف (${(file.size / (1024 * 1024)).toFixed(2)} م.ب) يتجاوز الحد الأقصى المسموح به (8 ميجابايت).`);
        e.target.value = '';
        setSelectedFile(null);
        return;
      }

      // Validate extension
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        setUploadErrorMessage(`امتداد الملف (.${ext}) غير معتمد. يرجى اختيار ملف من الأنواع: PDF, JPEG, PNG, WebP, DOCX, XLSX.`);
        e.target.value = '';
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      if (!evidenceTitle) {
        setEvidenceTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Upload submission through Express to Google Drive
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmissionsClosed && currentRole !== 'principal') {
      setUploadErrorMessage('عذراً، موعد استقبال شواهد المعلمات مغلق حالياً بأمر مديرة المدرسة.');
      return;
    }

    if (!selectedIndicatorId || !selectedFile) {
      setUploadErrorMessage('يرجى اختيار المؤشر المرتبط وإرفاق ملف الشاهد.');
      return;
    }

    if (!currentSelectedTeacher) {
      setUploadErrorMessage('يرجى اختيار المعلمة صاحبة الشاهد من السجلات المعتمدة.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    try {
      const fullDesc = `${evidenceTitle ? evidenceTitle + ': ' : ''}${evidenceDescription}`.trim();

      // Upload to Google Drive through Express server
      const result = await storageService.uploadFileToDrive({
        file: selectedFile,
        indicatorId: selectedIndicatorId,
        category: 'teacher',
        userRole: currentRole,
        teacherId: currentSelectedTeacher.id,
        description: fullDesc,
        onProgress: (percent) => setUploadProgress(percent),
      });

      const evidenceRecord = result.file;

      // Update indicator in storage
      const targetInd = indicators.find((i) => i.id === selectedIndicatorId);
      if (targetInd) {
        const updatedFiles = [...(targetInd.evidenceFiles || []), evidenceRecord];
        const updatedInd: Indicator = {
          ...targetInd,
          evidenceFiles: updatedFiles,
          status: targetInd.status === 'not_started' ? 'in_progress' : targetInd.status,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        onUpdateIndicator(updatedInd);
      }

      setUploadSuccessMessage(
        result.message ||
        `تم رفع الشاهد بنجاح وتخزينه في Google Drive بمجلد [teachers-files/${expectedSubfolderName}].`
      );
      setSelectedFile(null);
      setEvidenceTitle('');
      setEvidenceDescription('');
      setUploadProgress(100);
    } catch (err: any) {
      console.error('Teacher upload error:', err);
      setUploadErrorMessage(`تعذر رفع الملف: ${err.message || 'خطأ غير متوقع أثناء الاتصال بالخادم.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Principal quick date extension
  const [showDeadlineEditor, setShowDeadlineEditor] = useState<boolean>(false);
  const [newDeadlineInput, setNewDeadlineInput] = useState<string>(
    deadlineDateStr.includes('T') ? deadlineDateStr.slice(0, 16) : '2026-10-15T23:59'
  );

  const handleSaveNewDeadline = async () => {
    try {
      const formatted = newDeadlineInput.length === 16 ? `${newDeadlineInput}:00` : newDeadlineInput;
      await storageService.updateTeacherDeadline({
        deadline: formatted,
        isManuallyLocked: false,
        updatedBy: 'مديرة المدرسة/ إيمان الشعبي',
      });
      onUpdateSettings({
        ...settings,
        teacherSubmissionDeadline: formatted,
        teacherSubmissionsLocked: false,
      });
      setShowDeadlineEditor(false);
      setUploadSuccessMessage('تم تحديث موعد استقبال أعمال المعلمات بنجاح ومزامنته.');
    } catch (err: any) {
      alert('فشل حفظ الموعد: ' + err.message);
    }
  };

  const handleToggleManualLock = async () => {
    const nextLocked = !isManuallyLocked;
    try {
      await storageService.updateTeacherDeadline({
        deadline: deadlineDateStr,
        isManuallyLocked: nextLocked,
        updatedBy: 'مديرة المدرسة/ إيمان الشعبي',
      });
      onUpdateSettings({
        ...settings,
        teacherSubmissionsLocked: nextLocked,
      });
    } catch (err: any) {
      alert('فشل تغيير حالة القفل: ' + err.message);
    }
  };

  // Preview or download evidence
  const [previewEvidence, setPreviewEvidence] = useState<{ url: string; name: string; isDrive?: boolean; openUrl?: string } | null>(null);

  const handleOpenEvidence = async (file: EvidenceFile) => {
    if (file.drivePreviewUrl) {
      setPreviewEvidence({ url: file.drivePreviewUrl, name: file.fileName, isDrive: true, openUrl: file.driveViewUrl });
      return;
    }
    if (file.serverUrl) {
      setPreviewEvidence({ url: file.serverUrl, name: file.fileName });
      return;
    }
    const blob = await storageService.getFileBlob(file.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewEvidence({ url, name: file.fileName });
    } else {
      alert('الملف غير متاح حالياً للمعاينة المباشرة.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH STATS AND GOOGLE DRIVE BADGE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <GraduationCap className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  بوابة أعمال وشواهد المعلمات
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  متوسطة وثانوية الدرب الأولى - التوثيق الرقمي المباشر لمؤشرات التقويم المدرسي الخارجي
                </p>
              </div>
            </div>
          </div>

          {/* GOOGLE DRIVE INTEGRATION STATUS BADGE */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="p-2 bg-emerald-700 text-white rounded-lg">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>تخزين Google Drive السحابي</span>
                {driveStatus?.isConfigured ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> متصل
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    بانتظار إعداد .env
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                المجلد: teachers-files / director-files
              </div>
            </div>
            <button
              onClick={() => setShowAppsScriptModal(true)}
              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors mr-2"
              title="دليل إعداد Google Apps Script"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TIMER & DEADLINE ALERT CARD */}
        <div className="mt-5 p-4 rounded-xl border transition-all bg-gradient-to-r from-emerald-50/60 to-slate-50 border-emerald-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Countdown info */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isSubmissionsClosed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-600 text-white animate-pulse'}`}>
                {isSubmissionsClosed ? <Lock className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">الموعد النهائي لاستقبال الشواهد:</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                    {deadlineDateStr.replace('T', ' ')}
                  </span>
                  {isSubmissionsClosed ? (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      مغلق حالياً
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      مفتوح للاستقبال
                    </span>
                  )}
                </div>
                
                {/* Live Countdown Display */}
                {!isSubmissionsClosed ? (
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-emerald-900 font-bold">
                    <span>الوقت المتبقي لانتهاء الاستقبال:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800 shadow-2xs">
                      {timeLeft.days} يوم و {timeLeft.hours} ساعة و {timeLeft.minutes} دقيقة و {timeLeft.seconds} ثانية
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    انتهت المهلة المحددة أو تم تعليق الاستقبال. لا يمكن للمعلمات رفع شواهد جديدة حالياً.
                  </p>
                )}
              </div>
            </div>

            {/* Principal Controls */}
            {currentRole === 'principal' && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowDeadlineEditor((prev) => !prev)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تعديل الموعد</span>
                </button>
                <button
                  onClick={handleToggleManualLock}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 ${
                    isManuallyLocked
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {isManuallyLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>فتح الاستقبال الآن</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>إغلاق فوري</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Principal Deadline Edit Form */}
          {showDeadlineEditor && currentRole === 'principal' && (
            <div className="mt-4 pt-3 border-t border-emerald-200 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-800">حدد موعد الإغلاق الجديد:</span>
              <input
                type="datetime-local"
                value={newDeadlineInput}
                onChange={(e) => setNewDeadlineInput(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                onClick={handleSaveNewDeadline}
                className="px-4 py-1.5 bg-emerald-800 text-white text-xs font-bold rounded-lg hover:bg-emerald-900 transition-colors shadow-xs"
              >
                حفظ الموعد
              </button>
              <button
                onClick={() => setShowDeadlineEditor(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ACCESS RESTRICTION BANNER FOR TEACHERS IF CLOSED */}
      {isSubmissionsClosed && currentRole === 'teacher' && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-rose-900">
            تم إيقاف استقبال أعمال وشواهد المعلمات
          </h2>
          <p className="text-xs sm:text-sm text-rose-700 max-w-xl mx-auto leading-relaxed">
            وفقاً لتعليمات إدارة المدرسة، انتهى موعد رفع الشواهد بتاريخ ({deadlineDateStr.replace('T', ' ')}).
            يمكنك الاطلاع على الشواهد التي تم رفعها مسبقاً في الجدول أدناه، مع تعليق إمكانية إرفاق ملفات جديدة.
          </p>
        </div>
      )}

      {/* UPLOAD EVIDENCE FORM (Active if not closed or if Principal) */}
      {(!isSubmissionsClosed || currentRole === 'principal') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-700" />
                رفع شاهد تعليمي جديد إلى Google Drive
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يتم رفع الملف عبر خادم المنصة الآمن وحفظه في مجلد المعلمة المخصص: [teachers-files/{expectedSubfolderName}]
              </p>
            </div>
            <div className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-2.5 py-1">
              الحد الأقصى: 8 ميجابايت (PDF, Word, Excel, صور)
            </div>
          </div>

          {/* Success / Error Alerts */}
          {uploadSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                {uploadSuccessMessage}
              </span>
              <button onClick={() => setUploadSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploadErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                {uploadErrorMessage}
              </span>
              <button onClick={() => setUploadErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitEvidence} className="space-y-4">
            
            {/* ROW 1: Teacher Selection (From Authorized School Directory) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  المعلمة صاحبة الشاهد (السجلات المعتمدة للمدرسة) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  رمز المعلمة يحدد مجلد Google Drive تلقائياً
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {authorizedTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.id}) - {teacher.subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">مجلد Google Drive المستهدف:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      teachers-files/{expectedSubfolderName}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    رمز: {currentSelectedTeacher?.id}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 2: Cascading Domain, Criterion, Indicator Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المجال <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDomainId}
                  onChange={(e) => {
                    setSelectedDomainId(e.target.value);
                    setSelectedCriterionId('');
                    setSelectedIndicatorId('');
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                >
                  <option value="">-- اختر المجال --</option>
                  {domains.map((dom) => (
                    <option key={dom.id} value={dom.id}>
                      [{dom.code}] {dom.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المعيار <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCriterionId}
                  onChange={(e) => {
                    setSelectedCriterionId(e.target.value);
                    setSelectedIndicatorId('');
                  }}
                  disabled={!selectedDomainId}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white disabled:opacity-50"
                >
                  <option value="">-- اختر المعيار --</option>
                  {availableCriteria.map((crit) => (
                    <option key={crit.id} value={crit.id}>
                      [{crit.code}] {crit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المؤشر المستهدف <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedIndicatorId}
                  onChange={(e) => setSelectedIndicatorId(e.target.value)}
                  disabled={!selectedCriterionId}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white disabled:opacity-50 font-medium"
                >
                  <option value="">-- اختر المؤشر --</option>
                  {availableIndicators.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      [{ind.code}] {ind.name.slice(0, 75)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 3: File Title and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان الشاهد
                </label>
                <input
                  type="text"
                  placeholder="مثال: خطة التدريس المتمايز ومحاضر حل المشكلات للصف الأول ثانوي"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو وصف توضيحي للشاهد
                </label>
                <input
                  type="text"
                  placeholder="مثال: تم إرفاق أوراق العمل ونماذج تقييم الطالبات الفصلية"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* ROW 4: File Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملف الشاهد المعتمد (PDF، Word، صور، Excel) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={handleFileChange}
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="block w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>
              {selectedFile && (
                <div className="mt-1 text-[11px] text-slate-600 flex items-center gap-2">
                  <span>اسم الملف: <strong>{selectedFile.name}</strong></span>
                  <span>|</span>
                  <span>الحجم: {(selectedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت</span>
                  <span>|</span>
                  <span>النوع: {selectedFile.type || 'مستند'}</span>
                </div>
              )}
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 animate-bounce text-emerald-700" />
                    جاري رفع الشاهد عبر Express وتخزينه في Google Drive...
                  </span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(uploadProgress, 10)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUploading || !selectedFile || !selectedIndicatorId}
                className="px-6 py-2.5 bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-emerald-900 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الرفع إلى Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>رفع الشاهد وتخزينه في Google Drive</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* SAMPLES & UPLOADED EVIDENCE SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-700" />
              سجل الشواهد والملفات المرفوعة من المعلمات
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إجمالي الشواهد المرفوعة حالياً: {allTeacherEvidence.length} شاهد توثيقي
            </p>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث باسم المعلمة، الملف، أو المجلد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {filteredEvidenceList.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>لا توجد شواهد مرفوعة تطابق معايير البحث.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">اسم الملف والشاهد</th>
                  <th className="py-2.5 px-3 font-bold">المؤشر المرتبط</th>
                  <th className="py-2.5 px-3 font-bold">المعلمة / الرمز</th>
                  <th className="py-2.5 px-3 font-bold">تاريخ الرفع</th>
                  <th className="py-2.5 px-3 font-bold">مجلد Google Drive</th>
                  <th className="py-2.5 px-3 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredEvidenceList.map(({ indicator, evidence }) => (
                  <tr key={evidence.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{evidence.fileName}</div>
                      {evidence.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {evidence.description}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] ml-1">
                        {indicator.code}
                      </span>
                      <span className="text-slate-700 line-clamp-1">{indicator.name}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800">{evidence.uploadedBy}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {evidence.uploadDate}
                    </td>
                    <td className="py-2.5 px-3">
                      {evidence.driveFolderName ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-mono font-medium">
                            <Cloud className="w-3 h-3 text-emerald-700" />
                            {evidence.driveFolderName}
                          </span>
                          {evidence.driveFileId && (
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5" title={`معرف الملف السحابي: ${evidence.driveFileId}`}>
                              ID: {evidence.driveFileId.slice(0, 12)}...
                            </div>
                          )}
                        </div>
                      ) : evidence.serverUrl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">
                          مجلد المشروع ({evidence.serverUrl})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          تخزين محلي (IndexedDB)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEvidence(evidence)}
                          title="معاينة الشاهد"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {evidence.serverUrl && (
                          <a
                            href={evidence.serverUrl}
                            download={evidence.fileName}
                            title="تنزيل الملف"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Preview File */}
      {previewEvidence && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">{previewEvidence.name}</h3>
              <button onClick={() => setPreviewEvidence(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              {previewEvidence.isDrive ? (
                <div className="w-full flex flex-col gap-2">
                  <iframe src={previewEvidence.url} title={previewEvidence.name} className="w-full h-[60vh] rounded-lg border border-slate-200" />
                  {previewEvidence.openUrl && (
                    <a href={previewEvidence.openUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 underline self-center">
                      فتح في Google Drive
                    </a>
                  )}
                </div>
              ) : previewEvidence.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img src={previewEvidence.url} alt={previewEvidence.name} className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-xs" />
              ) : (
                <iframe src={previewEvidence.url} title={previewEvidence.name} className="w-full h-[60vh] rounded-lg border border-slate-200" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Google Apps Script Setup Guide */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  دليل إعداد ونشر Google Apps Script لربط Google Drive
                </h3>
              </div>
              <button onClick={() => setShowAppsScriptModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-3 overflow-y-auto leading-relaxed">
              <p>
                تم تجهيز خادم المنصة (Express) ليعمل كوسيط آمن يرسل الشواهد مباشرة إلى تطبيق <strong>Google Apps Script</strong> ومنه إلى مجلدات <strong>Google Drive</strong> الرسمية:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                <div>• شواهد المديرة: يتم حفظها في مجلد <strong>director-files</strong></div>
                <div>• شواهد المعلمات: يتم حفظها في <strong>teachers-files/{'{teacherName}-{first4CharactersOfTeacherId}'}</strong></div>
                <div>• مثال: <strong>teachers-files/أسماء محمد-AB12</strong></div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900">خطوات تفعيل الرابط:</div>
                <ol className="list-decimal list-inside space-y-1 mr-2">
                  <li>افتح <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold">script.google.com</a> وأنشئ مشروعاً جديداً.</li>
                  <li>انسخ الكود الجاهز الموجود في ملف المشروع: <code>scripts/google-apps-script-code.js</code> والصقه في <code>Code.gs</code>.</li>
                  <li>اضغط <strong>نشر (Deploy)</strong> &gt; <strong>نشر جديد (New deployment)</strong> &gt; اختر نوع <strong>تطبيق ويب (Web app)</strong>.</li>
                  <li>اضبط خيار <strong>تنفيذ التطبيق باسم: أنا (Execute as: Me)</strong> وخيار <strong>من يملك حق الوصول: أي شخص (Who has access: Anyone)</strong>.</li>
                  <li>انسخ رابط تطبيق الويب (Web App URL) وضعه في ملف <code>.env</code> بالخادم للمتغير <code>GOOGLE_APPS_SCRIPT_URL</code>.</li>
                  <li>ضع المفتاح السري المعتمد في <code>GOOGLE_DRIVE_API_SECRET</code>.</li>
                </ol>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                <strong>تنبيه أمني:</strong> المفتاح السري <code>GOOGLE_DRIVE_API_SECRET</code> مخزن حصرياً في خادم Express ولا يظهر نهائياً في المتصفح أو في كود الواجهة الأمامية.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
