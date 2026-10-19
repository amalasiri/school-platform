import { Domain, Criterion, Indicator, SystemSettings, AuditLog, TaskItem, EvidenceFile } from '../types';
import { initialDomains, initialCriteria, initialIndicators, initialSettings } from '../data/initialData';
import { firebaseService } from './firebaseService';

const DB_NAME = 'SchoolEvaluationDB_v1';
const STORE_NAME = 'evidence_blobs';
const STORAGE_PREFIX = 'moe_aldarb_v2_';

// Open IndexedDB database for local offline file storage
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB غير مدعوم في هذا المتصفح'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

import { AUTHORIZED_TEACHERS, AuthorizedTeacher } from '../data/trustedStaff';

export const storageService = {
  // --- GOOGLE DRIVE & LOCAL BACKUP UPLOAD PIPELINE ---
  async uploadFileToDrive(params: {
    file: File;
    indicatorId: string;
    category: 'director' | 'teacher';
    userRole: string;
    teacherId?: string;
    description?: string;
    onProgress?: (progress: number) => void;
  }): Promise<{ success: boolean; file: EvidenceFile; message: string }> {
    const { file, indicatorId, category, userRole, teacherId, description = '', onProgress } = params;
    const fileId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Convert file to Base64 data
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // 2. Transmit via XHR to Express endpoint with real progress reporting
    const payload = {
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileData: base64Data,
      category,
      userRole,
      teacherId,
      indicatorId,
      description,
    };

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-drive');
      xhr.setRequestHeader('Content-Type', 'application/json');

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = async () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && response.success) {
            const fileRecord: EvidenceFile = {
              ...response.file,
              blobKey: fileId,
            };

            // Save blob to IndexedDB for seamless client-side viewing/preview
            try {
              await storageService.saveFileBlob(fileId, file);
            } catch (e) {
              console.warn('IndexedDB cache note:', e);
            }

            resolve({
              success: true,
              file: fileRecord,
              message: response.message || 'تم الرفع بنجاح',
            });
          } else {
            reject(new Error(response.error || `فشل الرفع (رمز الاستجابة: ${xhr.status})`));
          }
        } catch (err) {
          reject(new Error('استجابة غير صالحة من خادم المنصة.'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('فشل الاتصال بالخادم. يرجى التحقق من اتصال الشبكة وإعادة المحاولة.'));
      };

      xhr.send(JSON.stringify(payload));
    });
  },

  // Backwards compatibility wrapper for existing callers
  async uploadFileToProject(
    file: File,
    indicatorId: string,
    description: string = '',
    uploadedBy: string = 'معلمة',
    category: 'director' | 'teacher' = 'teacher',
    userRole: string = 'teacher',
    teacherId?: string
  ): Promise<EvidenceFile> {
    try {
      const res = await this.uploadFileToDrive({
        file,
        indicatorId,
        category,
        userRole,
        teacherId,
        description,
      });
      return res.file;
    } catch (err) {
      console.warn('uploadFileToDrive returned error, attempting legacy save:', err);
      throw err;
    }
  },

  async getDriveStatus() {
    try {
      const res = await fetch('/api/drive/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {}
    return {
      isConfigured: false,
      hasUrl: false,
      hasSecret: false,
      maxFileSizeMb: 8,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx'],
    };
  },

  async getTeachersList(): Promise<AuthorizedTeacher[]> {
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        if (data.teachers && Array.isArray(data.teachers)) {
          return data.teachers;
        }
      }
    } catch {}
    return AUTHORIZED_TEACHERS;
  },

  // --- IndexedDB BLOB STORAGE ---
  async saveFileBlob(fileId: string, file: File): Promise<string> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = {
        id: fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        blob: file,
        uploadedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(fileId);
      req.onerror = () => reject(req.error);
    });
  },

  async getFileBlob(fileId: string): Promise<Blob | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(fileId);
        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            resolve(req.result.blob);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  async deleteFileBlob(fileId: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete(fileId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to delete blob from IndexedDB', e);
    }
  },

  async getFileObjectUrl(fileId: string): Promise<string | null> {
    const blob = await this.getFileBlob(fileId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },

  // --- STRUCTURE & METADATA STORAGE ---
  getSettings(): SystemSettings {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}settings`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...initialSettings, ...parsed };
      }
      return initialSettings;
    } catch {
      return initialSettings;
    }
  },

  saveSettings(settings: SystemSettings) {
    localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(settings));
  },

  // Teacher submissions deadline controls
  async getTeacherDeadline(): Promise<{ deadline: string; isManuallyLocked: boolean }> {
    // 1. Try Firebase if configured
    if (firebaseService.isConfigured()) {
      const fbData = await firebaseService.fetchTeacherDeadline();
      if (fbData) {
        return {
          deadline: fbData.deadline,
          isManuallyLocked: fbData.isManuallyLocked,
        };
      }
    }

    // 2. Try Server endpoint
    try {
      const res = await fetch('/api/deadline');
      if (res.ok) {
        const data = await res.json();
        return {
          deadline: data.deadline || '2026-10-15T23:59:59',
          isManuallyLocked: Boolean(data.isManuallyLocked),
        };
      }
    } catch {
      // ignore
    }

    // 3. Fallback to settings in localStorage
    const settings = this.getSettings();
    return {
      deadline: settings.teacherSubmissionDeadline || '2026-10-15T23:59:59',
      isManuallyLocked: Boolean(settings.teacherSubmissionsLocked),
    };
  },

  async updateTeacherDeadline(params: { deadline: string; isManuallyLocked: boolean; updatedBy?: string }): Promise<void> {
    return this.saveTeacherDeadline(params.deadline, params.isManuallyLocked, params.updatedBy);
  },

  async saveTeacherDeadline(deadline: string, isManuallyLocked: boolean, updatedBy: string = 'مديرة المدرسة/ إيمان الشعبي'): Promise<void> {
    // 1. Update settings locally
    const settings = this.getSettings();
    settings.teacherSubmissionDeadline = deadline;
    settings.teacherSubmissionsLocked = isManuallyLocked;
    this.saveSettings(settings);

    // 2. Persist to server backend (writes data/deadline.json)
    try {
      await fetch('/api/deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline, isManuallyLocked, updatedBy }),
      });
    } catch (err) {
      console.warn('Failed to update server deadline:', err);
    }

    // 3. Sync to Firebase if configured
    if (firebaseService.isConfigured()) {
      await firebaseService.saveTeacherDeadline(deadline, isManuallyLocked, updatedBy);
    }

    // Add audit log
    this.addAuditLog({
      userName: updatedBy,
      userRole: 'principal',
      action: isManuallyLocked ? 'إغلاق استقبال الشواهد يدوياً' : 'تحديث موعد إغلاق استقبال شواهد المعلمات',
      targetType: 'settings',
      targetId: 'deadline',
      details: `الموعد: ${deadline} | الحالة: ${isManuallyLocked ? 'مغلق' : 'مفتوح'}`,
    });
  },

  getDomains(): Domain[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}domains`);
      return raw ? JSON.parse(raw) : initialDomains;
    } catch {
      return initialDomains;
    }
  },

  saveDomains(domains: Domain[]) {
    localStorage.setItem(`${STORAGE_PREFIX}domains`, JSON.stringify(domains));
  },

  getCriteria(): Criterion[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}criteria`);
      if (raw) {
        const stored: Criterion[] = JSON.parse(raw);
        // If stored contains old undivided crit_3_1, refresh to new split criteria
        if (stored.some((c) => c.id === 'crit_3_1') || !stored.some((c) => c.id === 'crit_3_1_m')) {
          localStorage.setItem(`${STORAGE_PREFIX}criteria`, JSON.stringify(initialCriteria));
          return initialCriteria;
        }
        return stored;
      }
      return initialCriteria;
    } catch {
      return initialCriteria;
    }
  },

  saveCriteria(criteria: Criterion[]) {
    localStorage.setItem(`${STORAGE_PREFIX}criteria`, JSON.stringify(criteria));
  },

  // Ensure all indicators strictly match the official ETEC PDF and image reports
  getIndicators(): Indicator[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}indicators`);
      if (raw) {
        const stored: Indicator[] = JSON.parse(raw);
        const storedMap = new Map<string, Indicator>();
        stored.forEach((i) => {
          storedMap.set(i.id, i);
        });

        // Use canonical name, description, code, and criterionId from official initialIndicators
        const merged = initialIndicators.map((initInd) => {
          const existing = storedMap.get(initInd.id);
          if (existing) {
            return {
              ...initInd,
              status: existing.status || initInd.status,
              notes: existing.notes || initInd.notes,
              isApprovedByPrincipal: existing.isApprovedByPrincipal ?? initInd.isApprovedByPrincipal,
              approvedAt: existing.approvedAt || initInd.approvedAt,
              approvedBy: existing.approvedBy || initInd.approvedBy,
              excluded: existing.excluded ?? initInd.excluded,
              evidenceFiles: (existing.evidenceFiles && existing.evidenceFiles.length > 0)
                ? existing.evidenceFiles
                : initInd.evidenceFiles,
              lastUpdated: existing.lastUpdated || initInd.lastUpdated,
            };
          }
          return initInd;
        });
        return merged;
      }
      return initialIndicators;
    } catch {
      return initialIndicators;
    }
  },

  saveIndicators(indicators: Indicator[]) {
    const previous = this.getIndicators();
    localStorage.setItem(`${STORAGE_PREFIX}indicators`, JSON.stringify(indicators));
    this.pushIndicatorChanges(previous, indicators);
  },

  // Local cache only (used when data arrives from Firebase, so it is not pushed back)
  cacheIndicators(indicators: Indicator[]) {
    localStorage.setItem(`${STORAGE_PREFIX}indicators`, JSON.stringify(indicators));
  },

  // Push only what changed to Firebase so every browser/user sees the same data
  pushIndicatorChanges(previous: Indicator[], next: Indicator[]) {
    if (!firebaseService.isConfigured()) return;
    const metaOf = (i: Indicator) =>
      JSON.stringify([i.status, i.notes, i.isApprovedByPrincipal, i.approvedAt, i.approvedBy, i.excluded, i.lastUpdated]);
    const prevMap = new Map(previous.map((i) => [i.id, i]));
    next.forEach((ind) => {
      const prev = prevMap.get(ind.id);
      if (!prev || metaOf(prev) !== metaOf(ind)) {
        firebaseService.saveIndicatorMeta(ind).catch((e) => console.warn('Firebase meta sync failed:', e));
      }
      const prevFiles = new Map((prev?.evidenceFiles || []).map((f) => [f.id, f]));
      const nextFiles = new Map((ind.evidenceFiles || []).map((f) => [f.id, f]));
      nextFiles.forEach((f, id) => {
        const old = prevFiles.get(id);
        if (!old || JSON.stringify(old) !== JSON.stringify(f)) {
          firebaseService.putEvidence(ind.id, f).catch((e) => console.warn('Firebase evidence sync failed:', e));
        }
      });
      prevFiles.forEach((_f, id) => {
        if (!nextFiles.has(id)) {
          firebaseService.removeEvidence(ind.id, id).catch((e) => console.warn('Firebase evidence delete failed:', e));
        }
      });
    });
  },

  // One-time upload of what this browser already had locally (Drive files only)
  migrateLocalToFirebase(remoteMeta: Record<string, any>) {
    const flag = `${STORAGE_PREFIX}fb_migrated_v1`;
    if (localStorage.getItem(flag)) return;
    const local = this.getIndicators();
    local.forEach((ind) => {
      (ind.evidenceFiles || []).forEach((f) => {
        if (f.storageProvider === 'drive' && f.driveFileId) {
          firebaseService.putEvidence(ind.id, f).catch(() => {});
        }
      });
      if (!remoteMeta || !remoteMeta[ind.id]) {
        firebaseService.saveIndicatorMeta(ind).catch(() => {});
      }
    });
    localStorage.setItem(flag, '1');
  },

  // Merge Firebase data into the local indicator list (Firebase wins)
  applyRemoteIndicators(
    current: Indicator[],
    meta: Record<string, any>,
    evidence: Record<string, Record<string, EvidenceFile>>
  ): Indicator[] {
    const migrated = Boolean(localStorage.getItem(`${STORAGE_PREFIX}fb_migrated_v1`));
    return current.map((ind) => {
      const m = meta?.[ind.id] || {};
      const files = evidence?.[ind.id] ? Object.values(evidence[ind.id]) : [];
      files.sort((a, b) => String(a.uploadDate).localeCompare(String(b.uploadDate)) || String(a.id).localeCompare(String(b.id)));
      return {
        ...ind,
        ...(m.status ? { status: m.status } : {}),
        notes: m.notes ?? ind.notes,
        isApprovedByPrincipal: m.isApprovedByPrincipal ?? ind.isApprovedByPrincipal,
        approvedAt: m.approvedAt ?? undefined,
        approvedBy: m.approvedBy ?? undefined,
        excluded: m.excluded ?? ind.excluded,
        lastUpdated: m.lastUpdated ?? ind.lastUpdated,
        evidenceFiles: migrated ? files : ind.evidenceFiles,
      };
    });
  },

  getAuditLogs(): AuditLog[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}audit_logs`);
      return raw ? JSON.parse(raw) : [
        {
          id: 'log_init',
          timestamp: new Date().toISOString(),
          userName: 'مديرة المدرسة/ إيمان الشعبي',
          userRole: 'principal',
          action: 'تهيئة النظام وتعيين موعد الشواهد',
          targetType: 'settings',
          targetId: 'sys_init',
          details: 'بدء تشغيل منصة التقويم المدرسي الخارجي وضبط استقبال الشواهد حتى 15 أكتوبر 2026',
        }
      ];
    } catch {
      return [];
    }
  },

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    if (logs.length > 200) logs.pop();
    localStorage.setItem(`${STORAGE_PREFIX}audit_logs`, JSON.stringify(logs));
  },

  getTasks(): TaskItem[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}tasks`);
      return raw ? JSON.parse(raw) : [
        {
          id: 'task_1',
          title: 'استكمال شواهد الخطة التشغيلية وتقارير متابعة الربع الأول',
          description: 'تجميع بطاقات البرامج المنجزة ومحاضر فريق التخطيط والتقويم المدرسي',
          assignedTo: 'وكيلة الشؤون المدرسية',
          assignedToRole: 'vice_principal',
          assignedDate: '2026-10-05',
          dueDate: '2026-10-15',
          status: 'in_progress',
          relatedIndicatorId: 'ind_1_1_2',
          notes: 'التنسيق مع منسقة الجودة لتدقيق الشواهد قبل الموعد النهائي',
          completionRate: 65,
        },
        {
          id: 'task_2',
          title: 'توثيق شواهد خطة التدريب على اختبارات نافس الوطنية والقدرات',
          description: 'إرفاق جداول التدريب الأسبوعية وحضور الطالبات وتقارير الدرجات التجريبية',
          assignedTo: 'معلمات الشعب العلمية',
          assignedToRole: 'teacher',
          assignedDate: '2026-10-08',
          dueDate: '2026-10-15',
          status: 'in_progress',
          relatedIndicatorId: 'ind_3_1_2',
          notes: 'رفع نماذج الاختبارات المحاكية قبل إغلاق استقبال أعمال المعلمات',
          completionRate: 70,
        },
      ];
    } catch {
      return [];
    }
  },

  saveTasks(tasks: TaskItem[]) {
    localStorage.setItem(`${STORAGE_PREFIX}tasks`, JSON.stringify(tasks));
  },

  exportSystemData() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      domains: this.getDomains(),
      criteria: this.getCriteria(),
      indicators: this.getIndicators(),
      tasks: this.getTasks(),
      auditLogs: this.getAuditLogs(),
    };
  },

  resetToDefault() {
    localStorage.removeItem(`${STORAGE_PREFIX}settings`);
    localStorage.removeItem(`${STORAGE_PREFIX}domains`);
    localStorage.removeItem(`${STORAGE_PREFIX}criteria`);
    localStorage.removeItem(`${STORAGE_PREFIX}indicators`);
    localStorage.removeItem(`${STORAGE_PREFIX}tasks`);
    localStorage.removeItem(`${STORAGE_PREFIX}audit_logs`);
  }
};
