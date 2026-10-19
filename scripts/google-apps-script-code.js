/**
 * ==============================================================================
 * كود تطبيق Google Apps Script (Web App) لربط شواهد منصة الإدارة المدرسية بـ Google Drive
 * ==============================================================================
 *
 * تعليمات النشر والتهيئة:
 * 1. افتح https://script.google.com وأنشئ مشروعاً جديداً.
 * 2. الصق هذا الكود كاملاً في ملف Code.gs.
 * 3. في إعدادات المشروع (Project Settings) > خصائص البرنامج النصي (Script Properties):
 *    أضف خاصية باسم: GOOGLE_DRIVE_API_SECRET وضع فيها نفس المفتاح السري الذي ستضعه في خادم Express.
 *    (أو يمكنك تعديل القيمة الافتراضية في FALLBACK_SECRET بالأسفل كخيار بديل).
 * 4. اضغط على "نشر" (Deploy) > "نشر جديد" (New deployment).
 * 5. اختر نوع النشر: "تطبيق ويب" (Web app).
 *    - الوصف: School Platform Google Drive File Uploader
 *    - تنفيذ التطبيق باسم (Execute as): "أنا" (Me / مالك الحساب).
 *    - من يملك حق الوصول (Who has access): "أي شخص" (Anyone).
 * 6. اضغط "نشر" (Deploy) وانسخ رابط تطبيق الويب (Web App URL) وضعه في .env بخادم المنصة.
 */

// المفتاح السري الاحتياطي في حال عدم تعيين Script Properties
const FALLBACK_SECRET = "REPLACE_WITH_YOUR_STRONG_SECRET";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "لم يتم استلام أي بيانات في الطلب (Empty post data)." }, 400);
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, error: "تعذر تحليل صيغة JSON للبيانات المرسلة." }, 400);
    }

    // 1. التحقق من الرمز السري من Script Properties أو القيمة المحددة
    const scriptProperties = PropertiesService.getScriptProperties();
    const configuredSecret = scriptProperties.getProperty("GOOGLE_DRIVE_API_SECRET") || FALLBACK_SECRET;

    if (!payload.secret || payload.secret !== configuredSecret) {
      return createJsonResponse({
        success: false,
        error: "فشل التحقق الأمني: الرمز السري (API Secret) غير متطابق أو غير مصرح به."
      }, 401);
    }

    // 2. التحقق من الحقول الإجبارية
    const { category, fileName, mimeType, base64, teacherName, teacherId } = payload;

    if (!category || !fileName || !base64) {
      return createJsonResponse({
        success: false,
        error: "بيانات غير مكتملة: يجب توفير category و fileName و base64."
      }, 400);
    }

    // 3. فك تشفير Base64 وإنشاء كائن الملف (Blob)
    let cleanBase64 = base64;
    if (cleanBase64.indexOf(',') > -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const targetMimeType = mimeType || "application/octet-stream";
    const fileBlob = Utilities.newBlob(decodedBytes, targetMimeType, fileName);

    // 4. تحديد مجلد الوجهة وفق قواعد النظام
    let targetFolder;
    let targetFolderName = "";

    if (category === "director") {
      // شواهد المديرة: الحفظ في مجلد director-files الرئيسي
      targetFolder = getOrCreateFolder("director-files");
      targetFolderName = "director-files";
    } else if (category === "teacher") {
      // شواهد المعلمات: الحفظ في مجلد teachers-files ثم مجلد فرعي لكل معلمة
      const teachersRootFolder = getOrCreateFolder("teachers-files");
      
      // التسمية الرسمية: {teacherName}-{first4CharactersOfTeacherId}
      // مثال: أسماء محمد-AB12
      const safeId = (teacherId || "0000").trim().toUpperCase();
      const idPrefix = safeId.substring(0, 4);
      const safeName = (teacherName || "معلمة").trim();
      const subfolderName = safeName + "-" + idPrefix;

      targetFolder = getOrCreateSubFolder(teachersRootFolder, subfolderName);
      targetFolderName = "teachers-files/" + subfolderName;
    } else {
      return createJsonResponse({
        success: false,
        error: "تصنيف غير صالح: يجب أن يكون إما 'director' أو 'teacher'."
      }, 400);
    }

    // 5. حفظ الملف داخل المجلد المحدد
    const createdFile = targetFolder.createFile(fileBlob);
    
    // إضافة وصف توثيقي على الملف في Drive
    const desc = "منصة الإدارة المدرسية | التصنيف: " + category + 
      (category === "teacher" ? " | المعلمة: " + teacherName + " (" + teacherId + ")" : "") +
      " | تاريخ الرفع: " + new Date().toISOString();
    createdFile.setDescription(desc);

    // 6. الرد بنجاح العملية مع بيانات الملف
    return createJsonResponse({
      success: true,
      message: "تم رفع الملف بنجاح إلى Google Drive",
      fileId: createdFile.getId(),
      fileName: createdFile.getName(),
      mimeType: createdFile.getMimeType(),
      fileSize: createdFile.getSize(),
      category: category,
      folderName: targetFolderName,
      uploadedAt: new Date().toISOString()
    }, 200);

  } catch (globalErr) {
    return createJsonResponse({
      success: false,
      error: "خطأ داخلي أثناء حفظ الملف في Google Drive: " + globalErr.toString()
    }, 500);
  }
}

// اختبار اتصال بسيط عبر المتصفح (GET)
function doGet(e) {
  return createJsonResponse({
    status: "online",
    service: "School Platform Google Drive Uploader",
    timestamp: new Date().toISOString()
  }, 200);
}

/**
 * الحصول على مجلد رئيسي بالاسم أو إنشاؤه في حال عدم وجوده
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * الحصول على مجلد فرعي داخل مجلد أب أو إنشاؤه (إعادة استخدام الموجود لمنع التكرار)
 */
function getOrCreateSubFolder(parentFolder, subFolderName) {
  const folders = parentFolder.getFoldersByName(subFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subFolderName);
}

/**
 * دالة مساعدة لتوليد مخرجات JSON نظيفة
 */
function createJsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
