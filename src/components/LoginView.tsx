import React, { useState } from 'react';
import { ShieldCheck, GraduationCap, User, KeyRound, LogIn, Loader2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storageService';
import { authService, AuthUser } from '../services/authService';

type LoginTab = 'director' | 'teacher';

interface LoginViewProps {
  onLoggedIn: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoggedIn }) => {
  const settings = storageService.getSettings();
  const [tab, setTab] = useState<LoginTab>('director');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = await authService.login('director', username, password);
    setIsSubmitting(false);
    if (result.user) {
      onLoggedIn(result.user);
    } else {
      setError(result.error || 'تعذر تسجيل الدخول.');
      setPassword('');
    }
  };

  const tabs: { id: LoginTab; label: string; icon: React.ReactNode }[] = [
    { id: 'director', label: 'مديرة المدرسة', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'teacher', label: 'المعلمات', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans" dir="rtl">
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          {/* الترويسة الرسمية: الشعار وبيانات الجهة */}
          <div className="flex flex-col items-center gap-4">
            <img
              src="/moe-logo.svg"
              alt="شعار وزارة التعليم - المملكة العربية السعودية"
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-xs"
              loading="eager"
            />
            <div className="text-right flex flex-col justify-center border-r-2 border-emerald-700 pr-3">
              <span className="text-sm font-bold text-emerald-900 tracking-tight leading-tight">
                {settings.ministryName || 'وزارة التعليم'}
              </span>
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {settings.educationDept || 'إدارة التعليم بجازان'}
              </span>
              <span className="text-sm font-medium text-slate-700 leading-tight">
                {settings.schoolName || 'متوسطة وثانوية الدرب الأولى'}
              </span>
            </div>
          </div>

          {/* بطاقة تسجيل الدخول */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 pt-6 pb-4 text-center border-b border-slate-100">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">تسجيل الدخول إلى المنصة</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">منصة الإدارة المدرسية والتقويم الخارجي</p>
            </div>

            {/* تبويبات نوع المستخدم */}
            <div className="p-4 pb-0">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 border border-slate-200/80 rounded-xl p-1" role="tablist">
                {tabs.map((t) => {
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setTab(t.id);
                        setError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        isActive ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-900 hover:bg-white'
                      }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {tab === 'director' ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-xs sm:text-sm font-semibold text-slate-700">
                    اسم المستخدم
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      dir="ltr"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg pr-9 pl-3 py-2.5 text-left outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-slate-700">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg pr-9 pl-3 py-2.5 text-left outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-800 text-white rounded-xl text-sm font-bold hover:bg-emerald-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {isSubmitting ? 'جارٍ التحقق...' : 'دخول'}
                </button>
              </form>
            ) : (
              <div className="p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-7 h-7 text-amber-700" />
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" /> ميزة مستقبلية قادمة
                </span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  بوابة دخول المعلمات قيد التطوير حالياً وستتاح قريباً. الدخول متاح الآن لمديرة المدرسة فقط.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
          <span className="text-sm sm:text-base font-bold text-slate-900">
            مديرة المدرسة/ {settings.principalName || 'إيمان الشعبي'}
          </span>
        </div>
      </footer>
    </div>
  );
};
