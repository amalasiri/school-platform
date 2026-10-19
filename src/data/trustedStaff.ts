/**
 * Trusted Staff & Teacher Registry - متوسطة وثانوية الدرب الأولى
 * Official application records for validating upload authorization and folder mapping.
 */

export interface AuthorizedTeacher {
  id: string;             // Teacher ID (e.g. AB1234)
  name: string;           // Canonical Arabic Name (e.g. أسماء محمد)
  department: string;     // Official Department
  subject: string;        // Specialty / Subject
  email?: string;
  isActive: boolean;
}

export interface AuthorizedAdmin {
  id: string;
  name: string;
  role: 'principal' | 'vice_principal';
  title: string;
}

export const AUTHORIZED_TEACHERS: AuthorizedTeacher[] = [
  {
    id: 'AB1234',
    name: 'أسماء محمد',
    department: 'شعبة اللغات والعلوم الإنسانية',
    subject: 'اللغة العربية والمهارات اللغوية',
    isActive: true,
  },
  {
    id: 'FM5678',
    name: 'فاطمة الشهري',
    department: 'شعبة المواد العلمية والرياضيات',
    subject: 'الرياضيات والإحصاء',
    isActive: true,
  },
  {
    id: 'NA9012',
    name: 'نورة الأحمري',
    department: 'شعبة المواد العلمية والرياضيات',
    subject: 'الفيزياء والعلوم العامة',
    isActive: true,
  },
  {
    id: 'HD3456',
    name: 'هدى العتيبي',
    department: 'شعبة التربية الإسلامية والاجتماعيات',
    subject: 'الدراسات الإسلامية والقرآن الكريم',
    isActive: true,
  },
  {
    id: 'SA7890',
    name: 'سارة القحطاني',
    department: 'شعبة اللغات والعلوم الإنسانية',
    subject: 'اللغة الإنجليزية',
    isActive: true,
  },
  {
    id: 'MN2345',
    name: 'منى الدوسري',
    department: 'شعبة المواد العلمية والرياضيات',
    subject: 'الكيمياء والأحياء',
    isActive: true,
  },
  {
    id: 'LA6789',
    name: 'لطيفة الغامدي',
    department: 'شعبة التربية الإسلامية والاجتماعيات',
    subject: 'التاريخ والجغرافيا والدراسات الاجتماعية',
    isActive: true,
  },
  {
    id: 'RA0123',
    name: 'ريم الحربي',
    department: 'شعبة المواد العلمية والرياضيات',
    subject: 'الحاسب وتقنية المعلومات والمهارات الرقمية',
    isActive: true,
  },
  {
    id: 'AM4567',
    name: 'أمل المطيري',
    department: 'شعبة اللغات والعلوم الإنسانية',
    subject: 'المهارات الحياتية والتربية الأسرية',
    isActive: true,
  },
  {
    id: 'ZK8901',
    name: 'زينب القرني',
    department: 'شعبة اللغات والعلوم الإنسانية',
    subject: 'الفنون والتصميم الإبداعي',
    isActive: true,
  },
];

export const AUTHORIZED_ADMINS: AuthorizedAdmin[] = [
  {
    id: 'ADM_01',
    name: 'إيمان الشعبي',
    role: 'principal',
    title: 'مديرة المدرسة (كامل الصلاحيات والاعتماد)',
  },
  {
    id: 'ADM_02',
    name: 'أ. صالحة القحطاني',
    role: 'vice_principal',
    title: 'وكيلة الشؤون التعليمية',
  },
  {
    id: 'ADM_03',
    name: 'أ. مريم عسيري',
    role: 'vice_principal',
    title: 'وكيلة الشؤون المدرسية',
  },
  {
    id: 'ADM_04',
    name: 'أ. فوزية النعمي',
    role: 'vice_principal',
    title: 'وكيلة شؤون الطالبات',
  },
];

/**
 * Validate teacher credentials against trusted school records.
 * Returns verified teacher record or null.
 */
export function getVerifiedTeacher(teacherId: string): AuthorizedTeacher | null {
  if (!teacherId || typeof teacherId !== 'string') return null;
  const normalized = teacherId.trim().toUpperCase();
  const found = AUTHORIZED_TEACHERS.find(
    (t) => t.id.toUpperCase() === normalized && t.isActive
  );
  return found || null;
}

/**
 * Generates the official Google Drive teacher subfolder name.
 * Format: {teacherName}-{first4CharactersOfTeacherId}
 * Example: أسماء محمد-AB12
 */
export function getTeacherFolderName(teacherName: string, teacherId: string): string {
  const cleanId = (teacherId || '').trim().toUpperCase();
  const prefix = cleanId.slice(0, 4) || '0000';
  const cleanName = (teacherName || 'معلمة').trim();
  return `${cleanName}-${prefix}`;
}
