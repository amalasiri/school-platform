import React, { useState, useRef } from 'react';
import { Indicator, Criterion, Domain, EvidenceFile, UserRole, IndicatorStatus } from '../types';
import { storageService } from '../services/storageService';
import {
  X,
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Eye,
  Edit3,
  Calendar,
  Save,
  Ban,
} from 'lucide-react';

interface IndicatorModalProps {
  indicator: Indicator;
  criterion?: Criterion;
  domain?: Domain;
  currentRole: UserRole;
  onClose: () => void;
  onUpdateIndicator: (updated: Indicator) => void;
}

export const IndicatorModal: React.FC<IndicatorModalProps> = ({
  indicator,
  criterion,
  domain,
  currentRole,
  onClose,
  onUpdateIndicator,
}) => {
  const [currentIndicator, setCurrentIndicator] = useState<Indicator>(indicator);
  const [status, setStatus] = useState<IndicatorStatus>(indicator.status);
  const [notes, setNotes] = useState<string>(indicator.notes || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileDescription, setFileDescription] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Allowed MIME types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.بايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.بايت`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-600" />;
    if (fileType.includes('image')) return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    return <File className="w-5 h-5 text-blue-600" />;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsUploading(true);

    const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx'];
    const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

    try {
      const newEvidenceList: EvidenceFile[] = [...(currentIndicator.evidenceFiles || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Size check: max 8MB
        if (file.size > MAX_SIZE_BYTES) {
          throw new Error(`حجم الملف "${file.name}" يتجاوز الحد الأقصى المسموح به (8 ميجابايت).`);
        }

        // Extension check
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) {
          throw new Error(`امتداد الملف (.${ext}) غير مدعوم. الأنواع المعتمدة فقط: PDF, JPEG, PNG, WebP, DOCX, XLSX.`);
        }

        // Determine category: Director evidence if principal or vice_principal
        const isDirector = currentRole === 'principal' || currentRole === 'vice_principal';
        const category: 'director' | 'teacher' = isDirector ? 'director' : 'teacher';

        const result = await storageService.uploadFileToDrive({
          file,
          indicatorId: currentIndicator.id,
          category,
          userRole: currentRole,
          teacherId: isDirector ? undefined : 'AB1234',
          description: fileDescription.trim() || (isDirector ? 'شاهد قيادي معتمد للمديرة' : 'شاهد توثيقي'),
        });

        const newEvidence = result.file;
        newEvidenceList.push(newEvidence);

        const targetFolder = isDirector ? 'director-files' : 'teachers-files';
        storageService.addAuditLog({
          userName: currentRole === 'principal' ? 'مديرة المدرسة/ إيمان الشعبي' : 'منسقة المدرسة',
          userRole: currentRole,
          action: isDirector ? 'رفع شاهد للمديرة في Google Drive' : 'رفع شاهد للمؤشر',
          targetType: 'evidence',
          targetId: newEvidence.id,
          details: `تم رفع الشاهد "${file.name}" للمؤشر [${currentIndicator.code}] وتخزينه في Google Drive بمجلد [${newEvidence.driveFolderName || targetFolder}]`,
        });
      }

      // Auto update status to in_progress if was not_started
      let nextStatus = status;
      if (status === 'not_started') {
        nextStatus = 'in_progress';
        setStatus('in_progress');
      }

      const updated = {
        ...currentIndicator,
        status: nextStatus,
        evidenceFiles: newEvidenceList,
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      setCurrentIndicator(updated);
      onUpdateIndicator(updated);
      setFileDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err.message || 'حدث خطأ أثناء حفظ الملف.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = async (file: EvidenceFile) => {
    try {
      const blob = await storageService.getFileBlob(file.id);
      if (!blob) {
        alert('تعذر استرجاع ملف الشاهد من التخزين المحلي.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('فشل تنزيل الملف.');
    }
  };

  const handlePreviewFile = async (file: EvidenceFile) => {
    try {
      if (file.serverUrl) {
        setPreviewFile({
          url: file.serverUrl,
          name: file.fileName,
          type: file.fileType,
        });
        return;
      }
      const blob = await storageService.getFileBlob(file.id);
      if (!blob) {
        alert('تعذر استخراج المعاينة.');
        return;
      }
      const url = URL.createObjectURL(blob);
      setPreviewFile({
        url,
        name: file.fileName,
        type: file.fileType,
      });
    } catch (err) {
      console.error(err);
      alert('تعذر فتح معاينة الملف.');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await storageService.deleteFileBlob(fileId);
      const remaining = currentIndicator.evidenceFiles.filter((f) => f.id !== fileId);
      const updated = {
        ...currentIndicator,
        evidenceFiles: remaining,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      setCurrentIndicator(updated);
      onUpdateIndicator(updated);
      setConfirmDeleteId(null);

      storageService.addAuditLog({
        userName: currentRole === 'principal' ? 'مديرة المدرسة/ إيمان الشعبي' : 'منسقة المدرسة',
        userRole: currentRole,
        action: 'حذف شاهد',
        targetType: 'evidence',
        targetId: fileId,
        details: `تم حذف الشاهد من المؤشر [${currentIndicator.code}]`,
      });
    } catch (err) {
      console.error(err);
      alert('فشل حذف الملف.');
    }
  };

  const handleSaveDetails = () => {
    const isNowApproved = status === 'approved' || currentIndicator.isApprovedByPrincipal;
    const updated: Indicator = {
      ...currentIndicator,
      status: status,
      notes: notes,
      isApprovedByPrincipal: isNowApproved,
      approvedAt: isNowApproved ? currentIndicator.approvedAt || new Date().toISOString().split('T')[0] : undefined,
      approvedBy: isNowApproved ? 'إيمان الشعبي' : undefined,
      excluded: status === 'excluded',
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    setCurrentIndicator(updated);
    onUpdateIndicator(updated);

    storageService.addAuditLog({
      userName: currentRole === 'principal' ? 'مديرة المدرسة/ إيمان الشعبي' : 'منسقة المدرسة',
      userRole: currentRole,
      action: 'تحديث بيانات المؤشر',
      targetType: 'indicator',
      targetId: indicator.id,
      details: `تحديث حالة وملاحظات المؤشر [${indicator.code}] إلى: ${status}`,
    });

    onClose();
  };

  const togglePrincipalApproval = () => {
    if (currentRole !== 'principal') {
      alert('عذرًا، اعتماد المؤشر هو صلاحية حصرية لمديرة المدرسة.');
      return;
    }

    const nextApproved = !currentIndicator.isApprovedByPrincipal;
    const updated: Indicator = {
      ...currentIndicator,
      isApprovedByPrincipal: nextApproved,
      status: nextApproved ? 'approved' : 'completed',
      approvedAt: nextApproved ? new Date().toISOString().split('T')[0] : undefined,
      approvedBy: nextApproved ? 'إيمان الشعبي' : undefined,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    setStatus(nextApproved ? 'approved' : 'completed');
    setCurrentIndicator(updated);
    onUpdateIndicator(updated);

    storageService.addAuditLog({
      userName: 'مديرة المدرسة/ إيمان الشعبي',
      userRole: 'principal',
      action: nextApproved ? 'اعتماد مؤشر رسمي' : 'إلغاء اعتماد مؤشر',
      targetType: 'indicator',
      targetId: indicator.id,
      details: `${nextApproved ? 'تم اعتماد' : 'تم سحب اعتماد'} المؤشر [${indicator.code}] رسمياً من قبل المديرة`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        
        {/* شريط العنوان الترويسي */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-xs bg-emerald-800 text-white px-2.5 py-1 rounded-md">
              {currentIndicator.code}
            </span>
            <div>
              <span className="text-xs text-slate-500 font-medium">
                {domain?.name} / {criterion?.name}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                بطاقة المؤشر وتوثيق الشواهد
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* جسم البطاقة القابل للتمرير */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* نص المؤشر الكامل */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
            <div className="text-xs font-bold text-emerald-900 mb-1">نص المؤشر الرسمي:</div>
            <p className="text-sm sm:text-base text-slate-900 font-semibold leading-relaxed">
              {currentIndicator.name}
            </p>
            {currentIndicator.description && (
              <p className="text-xs text-slate-700 mt-2 pt-2 border-t border-emerald-100 leading-relaxed">
                <span className="font-bold text-emerald-950">التوجيه المعتمد ولاستدامة التميز (تقرير هيئة التقويم): </span>
                {currentIndicator.description}
              </p>
            )}
          </div>

          {/* حالة المؤشر واعتماد المديرة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* اختيار الحالة */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">حالة استكمال المؤشر:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IndicatorStatus)}
                className="w-full text-xs sm:text-sm font-semibold bg-white border border-slate-300 rounded-lg p-2.5 outline-hidden focus:ring-2 focus:ring-emerald-600"
              >
                <option value="not_started">لم تبدأ مراجعة الشواهد</option>
                <option value="in_progress">الشواهد قيد الاستكمال والجمع</option>
                <option value="completed">مكتمل الشواهد وجاهز للتدقيق</option>
                <option value="needs_review">يحتاج إلى مراجعة وتعديل</option>
                <option value="approved">معتمد رسمياً من مديرة المدرسة</option>
                <option value="excluded">غير منطبق / مستثنى</option>
              </select>
              <div className="text-[11px] text-slate-500">
                تاريخ آخر تحديث: {currentIndicator.lastUpdated || 'اليوم'}
              </div>
            </div>

            {/* بطاقة اعتماد المديرة الرسمي المنفصل */}
            <div className="bg-white border-2 border-dashed border-emerald-300 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    الاعتماد القيادي من مديرة المدرسة
                  </span>
                  {currentIndicator.isApprovedByPrincipal && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      معتمد رسميًا
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  اعتماد المديرة هو إجراء مستقل يؤكد استيفاء الشواهد نظامًا قبل زيارة فريق التقويم الخارجي.
                </p>
                {currentIndicator.approvedAt && (
                  <div className="text-[11px] text-emerald-800 font-medium mt-1">
                    اعتمدت بتاريخ: {currentIndicator.approvedAt} بواسطة: {currentIndicator.approvedBy || 'إيمان الشعبي'}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={togglePrincipalApproval}
                  disabled={currentRole !== 'principal'}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                    currentIndicator.isApprovedByPrincipal
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-emerald-800 text-white hover:bg-emerald-900 shadow-xs'
                  } ${currentRole !== 'principal' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {currentIndicator.isApprovedByPrincipal
                    ? 'إلغاء الاعتماد لإعادة التدقيق'
                    : 'اعتماد المؤشر رسميًا (مديرة المدرسة)'}
                </button>
              </div>
            </div>

          </div>

          {/* قسم إرفاق الشواهد والملفات */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                الشواهد والوثائق المرفوعة ({currentIndicator.evidenceFiles?.length || 0})
              </h3>
              <span className="text-[11px] text-slate-500">
                يدعم صيغ PDF، Word، Excel، والصور (حتى 25 م.ب للملف)
              </span>
            </div>

            {/* منطقة السحب والإفلات والرفع */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                isDragOver
                  ? 'border-emerald-600 bg-emerald-50/70'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-900 hover:underline"
                  >
                    اضغط هنا لاختيار ملفات الشواهد من جهازك
                  </button>
                  <span className="text-xs text-slate-500"> أو اسحب وأفلت الملفات مباشرة هنا</span>
                </div>

                <div className="w-full max-w-md mt-2">
                  <input
                    type="text"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    placeholder="وصف مختصر للشاهد (اختياري - مثال: محضر اجتماع، خطة تدريب، كشف معتمد)"
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-hidden focus:ring-1 focus:ring-emerald-600 text-right"
                  />
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold mt-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>جاري رفع وتخزين الشاهد في الذاكرة المدرسية...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="text-xs text-rose-600 font-medium mt-1">
                    {uploadError}
                  </div>
                )}
              </div>
            </div>

            {/* قائمة الشواهد الحالية */}
            {currentIndicator.evidenceFiles && currentIndicator.evidenceFiles.length > 0 ? (
              <div className="space-y-2">
                {currentIndicator.evidenceFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-slate-50 rounded-lg shrink-0">
                        {getFileIcon(file.fileType)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={file.fileName}>
                          {file.fileName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>·</span>
                          <span>{file.uploadDate}</span>
                          <span>·</span>
                          <span>بواسطة: {file.uploadedBy}</span>
                          {file.description && (
                            <>
                              <span>·</span>
                              <span className="text-slate-700 italic">"{file.description}"</span>
                            </>
                          )}
                          {file.driveFolderName && (
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                              Drive: {file.driveFolderName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* زر المعاينة */}
                      <button
                        onClick={() => handlePreviewFile(file)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="معاينة الشاهد"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* زر التنزيل */}
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="تنزيل الملف"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* زر الحذف مع التأكيد */}
                      {confirmDeleteId === file.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 p-1 rounded">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] text-slate-600 px-1"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(file.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف الشاهد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-slate-100 rounded-xl bg-slate-50 text-slate-400 text-xs">
                لا توجد شواهد مرفقة لهذا المؤشر حتى الآن. يمكنك سحب وإفلات الملفات أعلاه للبدء في توثيقه.
              </div>
            )}

          </div>

          {/* ملاحظات وتوجيهات مديرة المدرسة */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              ملاحظات وتوجيهات مديرة المدرسة:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب التوجيهات أو الملاحظات حول جودة الشاهد ونقاط الاستكمال المطلوبة..."
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg p-3 outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

        </div>

        {/* أزرار الإجراءات السفلية */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handleSaveDetails}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            حفظ التغييرات
          </button>
        </div>

      </div>

      {/* نافذة المعاينة السريعة للملفات (PDF أو صور) */}
      {previewFile && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-3 bg-slate-800 text-white flex items-center justify-between text-xs">
              <span className="font-bold truncate">{previewFile.name}</span>
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewFile.url);
                  setPreviewFile(null);
                }}
                className="text-white hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 min-h-[400px]">
              {previewFile.type.includes('image') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[75vh] max-w-full object-contain rounded"
                />
              ) : previewFile.type.includes('pdf') ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[75vh] border-0 rounded bg-white"
                />
              ) : (
                <div className="text-center p-8 text-slate-600 text-xs">
                  <File className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                  <p className="font-bold">المعاينة المباشرة متاحة للصور وملفات PDF.</p>
                  <p className="mt-1">يمكنك تنزيل الملف لمعاينته على جهازك بواسطة التطبيق المخصص.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
