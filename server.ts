import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  AUTHORIZED_TEACHERS,
  getVerifiedTeacher,
  getTeacherFolderName,
} from './src/data/trustedStaff';
import { registerAuthRoutes, requireAuth, logAuthConfigWarnings } from './server/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const DATA_DIR = path.resolve(__dirname, 'data');
const DEADLINE_FILE = path.join(DATA_DIR, 'deadline.json');

// Ensure storage directories exist beside project files
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default deadline: 15 October 2026
if (!fs.existsSync(DEADLINE_FILE)) {
  fs.writeFileSync(
    DEADLINE_FILE,
    JSON.stringify(
      {
        deadline: '2026-10-15T23:59:59',
        isManuallyLocked: false,
        updatedBy: 'مديرة المدرسة/ إيمان الشعبي',
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Maximum file size: configurable via env, default 8 MB
const MAX_FILE_SIZE_MB = parseInt(process.env.GOOGLE_DRIVE_MAX_FILE_SIZE_MB || '8', 10) || 8;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
]);

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'docx',
  'xlsx',
  'doc',
  'xls',
]);

function isValidFile(fileName: string, mimeType: string): { valid: boolean; reason?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, reason: 'اسم الملف غير صالح أو مفقود.' };
  }

  const parts = fileName.split('.');
  if (parts.length < 2) {
    return { valid: false, reason: 'الملف لا يحتوي على امتداد محدد.' };
  }

  const ext = (parts.pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: `امتداد الملف (.${ext}) غير مدعوم. الأنواع المسموحة فقط: PDF, JPEG, PNG, WebP, DOCX, XLSX.`,
    };
  }

  const normalizedMime = (mimeType || '').toLowerCase();
  if (
    normalizedMime &&
    normalizedMime !== 'application/octet-stream' &&
    !ALLOWED_MIME_TYPES.has(normalizedMime)
  ) {
    return {
      valid: false,
      reason: `صيغة MIME للملف (${mimeType}) غير معتمدة. الأنواع المسموحة فقط: PDF, JPEG, PNG, WebP, DOCX, XLSX.`,
    };
  }

  return { valid: true };
}

function isGoogleDriveConfigured(): boolean {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_DRIVE_API_SECRET;
  return Boolean(
    url &&
    url.trim() !== '' &&
    !url.includes('PASTE_YOUR_APPS_SCRIPT_EXEC_URL') &&
    secret &&
    secret.trim() !== '' &&
    !secret.includes('PASTE_YOUR_GOOGLE_DRIVE_API_SECRET')
  );
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PUBLIC_DIR = path.resolve(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Public assets (logo, etc.) are needed by the login page
app.use(express.static(PUBLIC_DIR));

// Authentication: login/logout/me routes are public, everything below requires a director session
registerAuthRoutes(app);
app.use(requireAuth);

// Evidence files are served only to authenticated users
app.use('/uploads', express.static(UPLOADS_DIR));

// API: Authorized Teachers List (for frontend dropdown / verification)
app.get('/api/teachers', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    teachers: AUTHORIZED_TEACHERS,
  });
});

// API: Google Drive Integration Status Diagnostic
app.get('/api/drive/status', (_req: Request, res: Response) => {
  const hasUrl = Boolean(
    process.env.GOOGLE_APPS_SCRIPT_URL &&
    !process.env.GOOGLE_APPS_SCRIPT_URL.includes('PASTE_YOUR_APPS_SCRIPT_EXEC_URL')
  );
  const hasSecret = Boolean(
    process.env.GOOGLE_DRIVE_API_SECRET &&
    !process.env.GOOGLE_DRIVE_API_SECRET.includes('PASTE_YOUR_GOOGLE_DRIVE_API_SECRET')
  );

  return res.json({
    isConfigured: isGoogleDriveConfigured(),
    hasUrl,
    hasSecret,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    allowedExtensions: Array.from(ALLOWED_EXTENSIONS),
    folders: {
      director: 'director-files',
      teachers: 'teachers-files',
      teacherFormat: '{teacherName}-{first4CharactersOfTeacherId}',
    },
  });
});

// API: Core Google Drive Upload Handler
async function handleDriveUpload(req: Request, res: Response) {
  try {
    const {
      fileName,
      fileType,
      fileData,
      fileSize,
      category,
      userRole,
      teacherId,
      teacherName: clientTeacherName,
      indicatorId,
      description,
      simulate,
    } = req.body;

    // 1. Basic field checks
    if (!fileName || !fileData) {
      return res.status(400).json({
        success: false,
        error: 'بيانات غير مكتملة: يرجى تحديد اسم الملف وبيانات المحتوى (fileData).',
      });
    }

    // 2. Validate Category
    if (category !== 'director' && category !== 'teacher') {
      return res.status(400).json({
        success: false,
        error: "تصنيف غير صالح: يجب أن يكون التصنيف إما 'director' لشواهد المديرة أو 'teacher' لشواهد المعلمات.",
      });
    }

    // 3. Authenticate & Authorize User based on category
    let verifiedTeacher: ReturnType<typeof getVerifiedTeacher> = null;
    let targetFolderName = '';
    let officialUploader = '';

    if (category === 'director') {
      // Must have principal or vice_principal role
      if (userRole !== 'principal' && userRole !== 'vice_principal') {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح: رفع شواهد المديرة (director-files) مقتصر حصراً على مديرة أو وكيلة المدرسة.',
        });
      }
      targetFolderName = 'director-files';
      officialUploader = userRole === 'principal' ? 'مديرة المدرسة/ إيمان الشعبي' : 'وكيلة المدرسة';
    } else if (category === 'teacher') {
      // Must validate teacher ID against trusted school records
      if (!teacherId || typeof teacherId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'يرجى تزويد رمز المعلمة (Teacher ID) للتحقق من هويتها وسجلاتها.',
        });
      }

      verifiedTeacher = getVerifiedTeacher(teacherId);
      if (!verifiedTeacher) {
        return res.status(403).json({
          success: false,
          error: `رمز المعلمة (${teacherId}) غير مسجل في السجلات المعتمدة للمدرسة. لا يمكن رفع الشاهد دون التحقق من الهوية.`,
        });
      }

      // Format teacher folder: {teacherName}-{first4CharactersOfTeacherId}
      // e.g. أسماء محمد-AB12
      const subfolderName = getTeacherFolderName(verifiedTeacher.name, verifiedTeacher.id);
      targetFolderName = `teachers-files/${subfolderName}`;
      officialUploader = `${verifiedTeacher.name} (${verifiedTeacher.department} - ${verifiedTeacher.id})`;
    }

    // 4. Validate file type and extension
    const fileValidation = isValidFile(fileName, fileType);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        error: fileValidation.reason,
      });
    }

    // 5. Extract and validate Base64 payload & size
    let cleanBase64 = fileData;
    if (fileData.includes(',')) {
      cleanBase64 = fileData.split(',')[1];
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({
        success: false,
        error: `حجم الملف (${(buffer.length / (1024 * 1024)).toFixed(2)} م.ب) يتجاوز الحد الأقصى المسموح به (${MAX_FILE_SIZE_MB} ميجابايت).`,
      });
    }

    // 6. Preserve original file extension and sanitize name
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const rawBaseName = fileName.replace(/\.[^/.]+$/, '');
    const sanitizedBase = rawBaseName.replace(/[^a-zA-Z0-9.\u0600-\u06FF_-]/g, '_');
    const sanitizedFileName = `${sanitizedBase}.${ext}`;
    const uniqueLocalFileName = `${Date.now()}_${sanitizedFileName}`;

    // 7. Save local backup copy in ./uploads
    const localDestination = path.join(UPLOADS_DIR, uniqueLocalFileName);
    fs.writeFileSync(localDestination, buffer);
    const localFileUrl = `/uploads/${uniqueLocalFileName}`;

    // 8. Forward file to Google Apps Script Web App
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.GOOGLE_DRIVE_API_SECRET;
    const isConfigured = isGoogleDriveConfigured();

    let driveFileId = '';
    let driveUploadedAt = new Date().toISOString();
    let driveResultFolder = targetFolderName;
    let driveViewUrl: string | undefined;
    let drivePreviewUrl: string | undefined;
    let driveThumbnailUrl: string | undefined;
    let driveShared: boolean | undefined;
    let storageProvider: 'drive' | 'local' = 'local';
    let responseMessage = '';

    if (isConfigured && !simulate) {
      const appsScriptPayload = {
        secret: appsScriptSecret,
        category: category,
        fileName: sanitizedFileName,
        mimeType: fileType || 'application/octet-stream',
        base64: cleanBase64,
        teacherName: verifiedTeacher ? verifiedTeacher.name : undefined,
        teacherId: verifiedTeacher ? verifiedTeacher.id : undefined,
      };

      try {
        const appsScriptRes = await fetch(appsScriptUrl!, {
          method: 'POST',
          headers: {
            // text/plain avoids Apps Script CORS/preflight issues; the body is still JSON
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(appsScriptPayload),
          redirect: 'follow',
        });

        const rawText = await appsScriptRes.text();
        const looksLikeHtml = /^\s*<(!doctype|html)/i.test(rawText);
        if (looksLikeHtml) {
          console.error('Apps Script returned HTML, status', appsScriptRes.status);
          throw new Error('خدمة التخزين غير متاحة، تحقق من إعدادات نشر Google Apps Script (Execute as: Me / Who has access: Anyone).');
        }

        let driveJson: any;
        try {
          driveJson = JSON.parse(rawText);
        } catch {
          throw new Error('استجابة غير صالحة من تطبيق Google Apps Script.');
        }

        if (!appsScriptRes.ok || !driveJson.success) {
          const reason = driveJson.message || driveJson.error || 'فشلت معالجة الملف في تطبيق Google Apps Script.';
          throw new Error(reason === 'Unauthorized' ? 'المفتاح السري غير مطابق بين الخادم و Google Apps Script (Unauthorized).' : reason);
        }

        driveFileId = driveJson.fileId;
        driveViewUrl = driveJson.viewUrl;
        drivePreviewUrl = driveJson.previewUrl;
        driveThumbnailUrl = driveJson.thumbnailUrl;
        driveShared = driveJson.shared;
        driveUploadedAt = driveJson.uploadedAt || new Date().toISOString();
        driveResultFolder = driveJson.folderName || targetFolderName;
        storageProvider = 'drive';
        responseMessage = `تم رفع الشاهد بنجاح وتخزينه في Google Drive بمجلد [${driveResultFolder}].`;
      } catch (driveErr: any) {
        console.error('Apps Script forwarding error:', driveErr);
        return res.status(502).json({
          success: false,
          error: `تعذر إتمام الرفع إلى Google Drive: ${driveErr.message || driveErr}`,
          localBackupUrl: localFileUrl,
        });
      }
    } else {
      // When Google Apps Script is not yet configured with real URL/Secret in .env
      if (!simulate && !isConfigured) {
        return res.status(400).json({
          success: false,
          error:
            'خدمة Google Drive غير مهيأة بعد: يرجى نشر تطبيق Google Apps Script ووضع رابط النشر (GOOGLE_APPS_SCRIPT_URL) والمفتاح السري (GOOGLE_DRIVE_API_SECRET) في ملف .env.',
          isConfigured: false,
        });
      }

      // Simulation mode
      driveFileId = `drive_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      storageProvider = 'local';
      responseMessage = `تم حفظ الشاهد محلياً بنجاح في مجلد شواهد المشروع (محاكاة Google Drive: [${targetFolderName}]).`;
    }

    const fileRecord = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      indicatorId: indicatorId || '',
      fileName: fileName,
      savedFileName: uniqueLocalFileName,
      fileType: fileType || 'application/octet-stream',
      fileSize: buffer.length,
      fileUrl: localFileUrl,
      uploadDate: driveUploadedAt.split('T')[0],
      uploadedBy: officialUploader,
      uploadedByRole: category === 'director' ? 'principal' : 'teacher',
      description: description || '',
      status: 'valid',
      driveFileId: driveFileId,
      driveViewUrl,
      drivePreviewUrl,
      driveThumbnailUrl,
      driveShared,
      driveCategory: category,
      driveFolderName: driveResultFolder,
      teacherId: verifiedTeacher ? verifiedTeacher.id : undefined,
      storageProvider: storageProvider,
    };

    return res.status(200).json({
      success: true,
      message: responseMessage,
      file: fileRecord,
    });
  } catch (err: any) {
    console.error('Upload handler exception:', err);
    return res.status(500).json({
      success: false,
      error: `حدث خطأ أثناء معالجة رفع الملف: ${err.message}`,
    });
  }
}

// API: Direct Google Drive Upload endpoint
app.post('/api/upload-drive', handleDriveUpload);

// API: Standard upload endpoint (backwards compatible and redirects to Google Drive handler if category provided)
app.post('/api/upload', (req: Request, res: Response) => {
  if (req.body.category) {
    return handleDriveUpload(req, res);
  }

  // Fallback for simple local upload if category is omitted
  try {
    const { fileName, fileType, fileData, indicatorId, uploadedBy, description } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Missing fileName or fileData' });
    }

    let base64Payload = fileData;
    if (fileData.includes(',')) {
      base64Payload = fileData.split(',')[1];
    }

    const buffer = Buffer.from(base64Payload, 'base64');
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\u0600-\u06FF_-]/g, '_');
    const uniqueFileName = `${Date.now()}_${sanitizedName}`;
    const destinationPath = path.join(UPLOADS_DIR, uniqueFileName);

    fs.writeFileSync(destinationPath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;
    const fileRecord = {
      id: `ev_srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      indicatorId: indicatorId || '',
      fileName: fileName,
      savedFileName: uniqueFileName,
      fileType: fileType || 'application/octet-stream',
      fileSize: buffer.length,
      fileUrl: fileUrl,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: uploadedBy || 'معلمة',
      uploadedByRole: 'teacher',
      description: description || '',
      status: 'valid',
      storageProvider: 'local',
    };

    return res.status(200).json({
      success: true,
      message: 'تم حفظ الشاهد بنجاح في مجلد شواهد المشروع',
      file: fileRecord,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to save file: ' + error.message });
  }
});

// API: List stored files
app.get('/api/uploads', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const details = files.map((name) => {
      const stats = fs.statSync(path.join(UPLOADS_DIR, name));
      return {
        fileName: name,
        fileUrl: `/uploads/${name}`,
        fileSize: stats.size,
        modifiedAt: stats.mtime,
      };
    });
    return res.json({ success: true, files: details });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Get teacher submissions deadline
app.get('/api/deadline', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(DEADLINE_FILE)) {
      const raw = fs.readFileSync(DEADLINE_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json({
      deadline: '2026-10-15T23:59:59',
      isManuallyLocked: false,
      updatedBy: 'مديرة المدرسة/ إيمان الشعبي',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Update teacher submissions deadline (Principal permission)
app.post('/api/deadline', (req: Request, res: Response) => {
  try {
    const { deadline, isManuallyLocked, updatedBy } = req.body;
    const payload = {
      deadline: deadline || '2026-10-15T23:59:59',
      isManuallyLocked: Boolean(isManuallyLocked),
      updatedBy: updatedBy || 'مديرة المدرسة/ إيمان الشعبي',
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(DEADLINE_FILE, JSON.stringify(payload, null, 2));

    // Optional Firebase Realtime Database sync if URL configured
    const fbUrl = process.env.VITE_FIREBASE_DATABASE_URL;
    if (fbUrl) {
      const cleanUrl = fbUrl.replace(/\/$/, '');
      fetch(`${cleanUrl}/settings/teacherDeadline.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('Server Firebase sync notice:', e));
    }

    return res.json({ success: true, data: payload });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Firebase readiness status check
app.get('/api/firebase-config', (_req: Request, res: Response) => {
  const hasConfig = Boolean(
    process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_PROJECT_ID
  );
  return res.json({
    configured: hasConfig,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || null,
    databaseUrl: process.env.VITE_FIREBASE_DATABASE_URL || null,
  });
});

// Start dev or production server
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  logAuthConfigWarnings();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
