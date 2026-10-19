import React, { useState } from 'react';
import { TaskItem, Indicator, UserRole } from '../types';
import { storageService } from '../services/storageService';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Save,
  Trash2,
} from 'lucide-react';

interface TasksViewProps {
  tasks: TaskItem[];
  indicators: Indicator[];
  currentRole: UserRole;
  onUpdateTasks: (tasks: TaskItem[]) => void;
  onNavigateToIndicator?: (indicatorId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  indicators,
  currentRole,
  onUpdateTasks,
  onNavigateToIndicator,
}) => {
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('وكيلة الشؤون المدرسية');
  const [assignedRole, setAssignedRole] = useState<string>('vice_principal');
  const [dueDate, setDueDate] = useState<string>('2026-10-25');
  const [relatedIndicatorId, setRelatedIndicatorId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleCreateTask = () => {
    if (!title.trim()) {
      alert('يرجى كتابة عنوان المهمة.');
      return;
    }

    const newTask: TaskItem = {
      id: `task_${Date.now()}`,
      title,
      description,
      assignedTo,
      assignedToRole: assignedRole,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate,
      status: 'pending',
      relatedIndicatorId: relatedIndicatorId || undefined,
      notes,
      completionRate: 0,
    };

    const updated = [newTask, ...tasks];
    storageService.saveTasks(updated);
    onUpdateTasks(updated);
    setShowNewTaskModal(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setNotes('');
    setRelatedIndicatorId('');
  };

  const handleStatusChange = (taskId: string, newStatus: TaskItem['status']) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    storageService.saveTasks(updated);
    onUpdateTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;
    const updated = tasks.filter((t) => t.id !== taskId);
    storageService.saveTasks(updated);
    onUpdateTasks(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            الأعمال والمهام الإدارية المسندة
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            تكليف منسوبات المدرسة بمتطلبات التقويم ومتابعة الإنجاز والربط المباشر بالمؤشرات
          </p>
        </div>

        <button
          onClick={() => setShowNewTaskModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 px-3.5 py-2 rounded-lg transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء مهمة جديدة</span>
        </button>
      </div>

      {/* قائمة بطاقات المهام */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => {
          const relatedIndicator = indicators.find((i) => i.id === task.relatedIndicatorId);
          const isOverdue = task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'approved';

          return (
            <div
              key={task.id}
              className={`bg-white border rounded-xl p-4 shadow-2xs flex flex-col justify-between ${
                isOverdue ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {task.assignedTo}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    task.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : task.status === 'submitted'
                      ? 'bg-blue-100 text-blue-800'
                      : isOverdue
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {task.status === 'approved' ? 'معتمد' : task.status === 'submitted' ? 'مرفوع للاعتماد' : isOverdue ? 'متأخر' : 'قيد التنفيذ'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {task.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>

                {/* الربط المباشر بالمؤشر */}
                {relatedIndicator && (
                  <div className="mt-3 p-2 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs">
                    <div className="text-[10px] text-emerald-800 font-bold">مؤشر التقويم المرتبط:</div>
                    <div className="font-mono font-bold text-emerald-950 mt-0.5">
                      [{relatedIndicator.code}] {relatedIndicator.name.slice(0, 45)}...
                    </div>
                  </div>
                )}
              </div>

              {/* تذييل البطاقة */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  الموعد: {task.dueDate}
                </span>

                <div className="flex items-center gap-1">
                  {currentRole === 'principal' && (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                      className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5"
                    >
                      <option value="pending">قيد الانتظار</option>
                      <option value="in_progress">قيد العمل</option>
                      <option value="submitted">مرفوع</option>
                      <option value="approved">اعتماد المديرة</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* نافذة إنشاء مهمة جديدة */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4 text-right">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              إسناد مهمة جديدة لمنسوبة المدرسة
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">عنوان المهمة:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: إعداد تقرير الزيارات الصفية التبادلية"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">المكلفة بالمهمة:</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="اسم المعلمة أو الإدارية أو الفريق"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">تاريخ التسليم النهائي:</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ربط بمؤشر تقويم خارجي (اختياري):</label>
                <select
                  value={relatedIndicatorId}
                  onChange={(e) => setRelatedIndicatorId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="">بدون ربط مباشر بمؤشر</option>
                  {indicators.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      [{ind.code}] {ind.name.slice(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">وصف المهمة والشواهد المطلوبة:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب تفاصيل التكليف..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateTask}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs"
              >
                حفظ وإسناد المهمة
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
