export type IndicatorStatus =
  | 'not_started'     // لم تبدأ مراجعة الشواهد
  | 'in_progress'     // الشواهد قيد الاستكمال
  | 'completed'       // مكتمل الشواهد
  | 'needs_review'    // يحتاج إلى مراجعة
  | 'approved'        // معتمد من المديرة
  | 'excluded';       // غير منطبق / مستثنى

export type UserRole =
  | 'principal'       // مديرة المدرسة
  | 'vice_principal'  // وكيلة المدرسة
  | 'teacher'         // معلمة
  | 'admin_staff';    // موظفة إدارية

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  email: string;
}

export interface EvidenceFile {
  id: string;
  indicatorId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  uploadedBy: string;
  uploadedByRole: string;
  description: string;
  status: 'valid' | 'under_review' | 'needs_update';
  blobKey?: string;
  previewUrl?: string;
  serverUrl?: string;
  // Google Drive Integration fields
  driveFileId?: string;
  driveCategory?: 'director' | 'teacher';
  driveFolderName?: string;
  teacherId?: string;
  storageProvider?: 'drive' | 'local';
}

export interface Indicator {
  id: string;
  criterionId: string;
  domainId: string;
  code: string;
  name: string;
  description?: string;
  order: number;
  status: IndicatorStatus;
  notes: string;
  lastUpdated: string;
  isApprovedByPrincipal: boolean;
  approvedAt?: string;
  approvedBy?: string;
  excluded?: boolean;
  evidenceFiles: EvidenceFile[];
}

export interface Criterion {
  id: string;
  domainId: string;
  code: string;
  name: string;
  description?: string;
  order: number;
}

export interface Domain {
  id: string;
  code: string;
  name: string;
  description?: string;
  order: number;
  color?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToRole: string;
  assignedDate: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'overdue';
  relatedIndicatorId?: string;
  notes?: string;
  completionRate: number;
}

export interface SystemSettings {
  ministryName: string;
  educationDept: string;
  schoolName: string;
  principalName: string;
  academicYear: string;
  schoolType: string;
  teacherSubmissionDeadline?: string;
  teacherSubmissionsLocked?: boolean;
  firebaseSyncEnabled?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  targetType: 'indicator' | 'evidence' | 'task' | 'settings' | 'domain';
  targetId: string;
  details: string;
}
