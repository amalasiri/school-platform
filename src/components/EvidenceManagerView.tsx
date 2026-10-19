import React, { useState, useMemo } from 'react';
import { Indicator, EvidenceFile, Domain, Criterion } from '../types';
import { storageService } from '../services/storageService';
import {
  FolderOpen,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Eye,
  ExternalLink,
  HardDrive,
  Calendar,
  CheckCircle,
  X,
} from 'lucide-react';

interface EvidenceManagerViewProps {
  indicators: Indicator[];
  domains: Domain[];
  criteria: Criterion[];
  onOpenIndicator: (indicatorId: string) => void;
  onRefreshIndicators: () => void;
}

export const EvidenceManagerView: React.FC<EvidenceManagerViewProps> = ({
  indicators,
  domains,
  criteria,
  onOpenIndicator,
  onRefreshIndicators,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string; openUrl?: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Flatten all evidence files across indicators with indicator metadata
  const allEvidence = useMemo(() => {
    const list: (EvidenceFile & { indicatorCode: string; indicatorName: string; domainId: string })[] = [];
    indicators.forEach((ind) => {
      (ind.evidenceFiles || []).forEach((ev) => {
        list.push({
          ...ev,
          indicatorCode: ind.code,
          indicatorName: ind.name,
          domainId: ind.domainId,
        });
      });
    });
    return list.sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''));
  }, [indicators]);

  const filteredEvidence = useMemo(() => {
    return allEvidence.filter((file) => {
      if (selectedDomainFilter !== 'all' && file.domainId !== selectedDomainFilter) return false;
      if (selectedTypeFilter !== 'all') {
        if (selectedTypeFilter === 'pdf' && !file.fileType.includes('pdf')) return false;
        if (selectedTypeFilter === 'image' && !file.fileType.includes('image')) return false;
        if (selectedTypeFilter === 'doc' && (!file.fileType.includes('word') && !file.fileType.includes('officedocument'))) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = file.fileName.toLowerCase().includes(q);
        const matchesCode = file.indicatorCode.toLowerCase().includes(q);
        const matchesDesc = (file.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [allEvidence, selectedDomainFilter, selectedTypeFilter, searchQuery]);

  const totalBytes = useMemo(() => {
    return allEvidence.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  }, [allEvidence]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-600" />;
    if (fileType.includes('image')) return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    return <File className="w-5 h-5 text-blue-600" />;
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const blob = await storageService.getFileBlob(fileId);
      if (!blob) {
        alert('الملف غير موجود في التخزين.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('فشل تنزيل الشاهد.');
    }
  };

  const handlePreview = async (fileId: string, fileName: string, fileType: string, drive?: { previewUrl?: string; viewUrl?: string }) => {
    try {
      if (drive?.previewUrl) {
        setPreviewFile({ url: drive.previewUrl, name: fileName, type: 'drive', openUrl: drive.viewUrl });
        return;
      }
      const blob = await storageService.getFileBlob(fileId);
      if (!blob) {
        alert('تعذر استخراج ملف الشاهد.');
        return;
      }
      const url = URL.createObjectURL(blob);
      setPreviewFile({
        url,
        name: fileName,
        type: fileType,
      });
    } catch (err) {
      alert('تعذر فتح المعاينة.');
    }
  };

  const handleDelete = async (fileId: string, indicatorId: string) => {
    try {
      await storageService.deleteFileBlob(fileId);
      const ind = indicators.find((i) => i.id === indicatorId);
      if (ind) {
        const remaining = ind.evidenceFiles.filter((f) => f.id !== fileId);
        const updated = {
          ...ind,
          evidenceFiles: remaining,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        const allInds = storageService.getIndicators().map((i) => (i.id === ind.id ? updated : i));
        storageService.saveIndicators(allInds);
        onRefreshIndicators();
      }
      setConfirmDeleteId(null);
    } catch (err) {
      alert('فشل حذف الملف.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            مستودع الشواهد والملفات المدرسية
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            سجل موحد لجميع الوثائق والمستندات المرفوعة لمؤشرات التقويم الخارجي
          </p>
        </div>

        {/* بطاقة إحصاء التخزين */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
          <HardDrive className="w-4 h-4 text-emerald-700" />
          <div className="text-xs">
            <span className="text-slate-500">إجمالي الشواهد: </span>
            <span className="font-bold text-slate-900 tabular-nums">{allEvidence.length} ملف</span>
            <span className="text-slate-400 mx-1">·</span>
            <span className="font-bold text-emerald-800 tabular-nums">{formatFileSize(totalBytes)}</span>
          </div>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الملف أو رمز المؤشر..."
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="all">كافة صيغ الملفات</option>
              <option value="pdf">مستندات PDF فقط</option>
              <option value="image">الصور التوثيقية فقط</option>
              <option value="doc">مستندات Word / Office</option>
            </select>
          </div>

          <div>
            <select
              value={selectedDomainFilter}
              onChange={(e) => setSelectedDomainFilter(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-hidden focus:ring-2 focus:ring-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="all">كافة المجالات</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* جدول الشواهد */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {filteredEvidence.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] sm:text-xs">
                <tr>
                  <th className="py-3 px-4 font-bold">اسم الملف والشاهد</th>
                  <th className="py-3 px-4 font-bold">المؤشر المرتبط</th>
                  <th className="py-3 px-4 font-bold">الحجم</th>
                  <th className="py-3 px-4 font-bold">تاريخ الرفع</th>
                  <th className="py-3 px-4 font-bold">المسؤول عن الرفع</th>
                  <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvidence.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                          {getFileIcon(file.fileType)}
                        </div>
                        <div className="max-w-xs sm:max-w-md">
                          <div className="font-bold text-slate-900 truncate" title={file.fileName}>
                            {file.fileName}
                          </div>
                          {file.description && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {file.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => onOpenIndicator(file.indicatorId)}
                        className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors"
                        title="الانتقال لبطاقة المؤشر"
                      >
                        <span>{file.indicatorCode}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                      {formatFileSize(file.fileSize)}
                    </td>

                    <td className="py-3 px-4 text-slate-600 text-xs tabular-nums">
                      {file.uploadDate}
                    </td>

                    <td className="py-3 px-4 text-slate-700 text-xs">
                      <div className="font-semibold text-slate-800">{file.uploadedBy}</div>
                      {file.driveFolderName && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono mt-0.5">
                          Drive: {file.driveFolderName}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handlePreview(file.id, file.fileName, file.fileType, { previewUrl: file.drivePreviewUrl, viewUrl: file.driveViewUrl })}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(file.id, file.fileName)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="تنزيل"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {confirmDeleteId === file.id ? (
                          <button
                            onClick={() => handleDelete(file.id, file.indicatorId)}
                            className="text-[10px] bg-rose-600 text-white px-2 py-1 rounded font-bold"
                          >
                            تأكيد
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(file.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs sm:text-sm">
            <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">لا توجد شواهد مطابقة لمعايير البحث</p>
            <p className="text-slate-400 mt-1">قم برفع شواهد للمؤشرات من خلال قسم التقويم المدرسي الخارجي.</p>
          </div>
        )}
      </div>

      {/* نافذة المعاينة */}
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
              {previewFile.type === 'drive' ? (
                <div className="w-full flex flex-col gap-2">
                  <iframe
                    src={previewFile.url}
                    title={previewFile.name}
                    className="w-full h-[70vh] border-0 rounded bg-white"
                  />
                  {previewFile.openUrl && (
                    <a href={previewFile.openUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-700 underline self-center">
                      فتح في Google Drive
                    </a>
                  )}
                </div>
              ) : previewFile.type.includes('image') ? (
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
                  <p className="mt-1">يمكنك تنزيل الملف لمعاينته على جهازك.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
