/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Domain, Criterion, Indicator, SystemSettings, AuditLog, TaskItem, UserRole } from './types';
import { storageService } from './services/storageService';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EvaluationView } from './components/EvaluationView';
import { TeachersWorkView } from './components/TeachersWorkView';
import { IndicatorModal } from './components/IndicatorModal';
import { Lock, Sparkles, X, ShieldAlert } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(() => storageService.getSettings());
  const [domains, setDomains] = useState<Domain[]>(() => storageService.getDomains());
  const [criteria, setCriteria] = useState<Criterion[]>(() => storageService.getCriteria());
  const [indicators, setIndicators] = useState<Indicator[]>(() => storageService.getIndicators());
  const [tasks, setTasks] = useState<TaskItem[]>(() => storageService.getTasks());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storageService.getAuditLogs());

  // Only 3 allowed active tabs: 'dashboard', 'evaluation', 'teachers'
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('principal');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Locked menu feedback modal
  const [lockedModalTitle, setLockedModalTitle] = useState<string | null>(null);

  // Deep linking / drill-down navigation state
  const [navDomainFilter, setNavDomainFilter] = useState<string | undefined>(undefined);
  const [navStatusFilter, setNavStatusFilter] = useState<string | undefined>(undefined);
  const [modalIndicatorId, setModalIndicatorId] = useState<string | null>(null);

  // Import and subscribe to realtime Firebase deadline updates
  useEffect(() => {
    import('./services/firebaseService').then(({ firebaseService }) => {
      firebaseService.fetchTeacherDeadline().then((remoteData) => {
        if (remoteData && remoteData.deadline) {
          setSettings((prev) => ({
            ...prev,
            teacherSubmissionDeadline: remoteData.deadline,
            teacherSubmissionsLocked: remoteData.isManuallyLocked,
          }));
        }
      });

      const unsubscribe = firebaseService.subscribeToDeadline((data) => {
        if (data && data.deadline) {
          setSettings((prev) => ({
            ...prev,
            teacherSubmissionDeadline: data.deadline,
            teacherSubmissionsLocked: data.isManuallyLocked,
          }));
        }
      });

      return () => unsubscribe();
    });
  }, []);

  // Shared indicators & evidence from Firebase (so every browser/user sees the same data)
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    import('./services/firebaseService').then(({ firebaseService }) => {
      if (!firebaseService.isConfigured()) return;
      unsubscribe = firebaseService.subscribeToIndicators((meta, evidence) => {
        storageService.migrateLocalToFirebase(meta);
        setIndicators((prev) => {
          const merged = storageService.applyRemoteIndicators(prev, meta, evidence);
          storageService.cacheIndicators(merged);
          return merged;
        });
      });
    });
    return () => unsubscribe();
  }, []);

  // Check if teacher submission window is currently open
  const isTeacherSubmissionOpen = useMemo(() => {
    if (settings.teacherSubmissionsLocked) return false;
    const deadline = settings.teacherSubmissionDeadline || '2026-10-15T23:59:59';
    return new Date() < new Date(deadline);
  }, [settings.teacherSubmissionsLocked, settings.teacherSubmissionDeadline]);

  // Sync state whenever storage updates
  const handleUpdateIndicator = (updated: Indicator) => {
    const newIndicators = indicators.map((ind) => (ind.id === updated.id ? updated : ind));
    setIndicators(newIndicators);
    storageService.saveIndicators(newIndicators);
    setAuditLogs(storageService.getAuditLogs());
  };

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  // Quantitative counts for sidebar & header
  const totalIndicatorsCount = indicators.filter((i) => !i.excluded).length;
  const completedIndicatorsCount = indicators.filter(
    (i) => !i.excluded && (i.status === 'completed' || i.status === 'approved')
  ).length;

  const totalFilesCount = useMemo(() => {
    return indicators.reduce((acc, curr) => acc + (curr.evidenceFiles?.length || 0), 0);
  }, [indicators]);

  const handleNavigateToEvaluation = (domainId?: string, statusFilter?: string) => {
    setNavDomainFilter(domainId);
    setNavStatusFilter(statusFilter);
    setActiveTab('evaluation');
  };

  const activeModalIndicator = useMemo(() => {
    if (!modalIndicatorId) return null;
    return indicators.find((i) => i.id === modalIndicatorId) || null;
  }, [modalIndicatorId, indicators]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans" dir="rtl">
      
      {/* الترويسة الرسمية لوزارة التعليم */}
      <Header
        settings={settings}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* مساحة العمل الرئيسية مع القائمة الجانبية */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* القائمة الجانبية: القفل مفعل على كافة الأقسام باستثناء الثلاثة المحددة */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setNavDomainFilter(undefined);
            setNavStatusFilter(undefined);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          totalIndicators={totalIndicatorsCount}
          completedIndicators={completedIndicatorsCount}
          totalFiles={totalFilesCount}
          isTeacherSubmissionOpen={isTeacherSubmissionOpen}
          onLockedMenuClick={(label) => setLockedModalTitle(label)}
        />

        {/* عرض المحتوى النشط */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          
          {/* 1. لوحة المؤشرات التفاعلية */}
          {activeTab === 'dashboard' && (
            <DashboardView
              domains={domains}
              criteria={criteria}
              indicators={indicators}
              tasks={tasks}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onNavigateToEvaluation={handleNavigateToEvaluation}
            />
          )}

          {/* 2. معايير التقويم الخارجي (الاسم الجديد المعتمد) */}
          {activeTab === 'evaluation' && (
            <EvaluationView
              domains={domains}
              criteria={criteria}
              indicators={indicators}
              currentRole={currentRole}
              initialDomainId={navDomainFilter}
              initialStatusFilter={navStatusFilter}
              onUpdateIndicator={handleUpdateIndicator}
            />
          )}

          {/* 3. أعمال المعلمات (في موضعه الحالي مع المؤقت وحفظ الشواهد في المشروع) */}
          {activeTab === 'teachers' && (
            <TeachersWorkView
              indicators={indicators}
              domains={domains}
              criteria={criteria}
              currentRole={currentRole}
              settings={settings}
              onUpdateIndicator={handleUpdateIndicator}
              onUpdateSettings={handleUpdateSettings}
              onNavigateToIndicator={(indId) => setModalIndicatorId(indId)}
            />
          )}

        </main>
      </div>

      {/* التذييل الرسمي الصريح: مديرة المدرسة/ إيمان الشعبي */}
      <Footer settings={settings} />

      {/* نافذة تفاعلية عند الضغط على أي قائمة مقفلة (ميزة مستقبلية) */}
      {lockedModalTitle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7 text-amber-700" />
            </div>

            <div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full inline-flex items-center gap-1 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> ميزة مستقبلية قادمة
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                قسم: {lockedModalTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                هذا القسم مقفل حالياً وغير متاح للفتح، ومبرمج ليكون ميزة مستقبلية ضمن خطة المراحل التطويرية القادمة للمنصة.
                الأقسام المتاحة للعمل حالياً هي: <strong>لوحة المؤشرات التفاعلية</strong>، و<strong>معايير التقويم الخارجي</strong>، و<strong>أعمال المعلمات</strong>.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setLockedModalTitle(null)}
                className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors shadow-xs"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة توثيق المؤشر عند طلبها */}
      {activeModalIndicator && (
        <IndicatorModal
          indicator={activeModalIndicator}
          criterion={criteria.find((c) => c.id === activeModalIndicator.criterionId)}
          domain={domains.find((d) => d.id === activeModalIndicator.domainId)}
          currentRole={currentRole}
          onClose={() => setModalIndicatorId(null)}
          onUpdateIndicator={(updated) => {
            handleUpdateIndicator(updated);
            setModalIndicatorId(null);
          }}
        />
      )}

    </div>
  );
}
