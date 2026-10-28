import React from 'react';
import { GraduationCap, BookOpen, ShieldCheck, LogOut } from 'lucide-react';

interface HeaderNavProps {
  currentView: 'home' | 'student-login' | 'student-exam' | 'student-result' | 'teacher-login' | 'teacher-dashboard';
  onNavigate: (view: 'student-login' | 'teacher-login' | 'home') => void;
  activeRole: 'none' | 'student' | 'teacher';
  onLogout?: () => void;
  studentName?: string;
  teacherName?: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentView,
  onNavigate,
  activeRole,
  onLogout,
  studentName,
  teacherName,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            if (activeRole === 'none') onNavigate('home');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-sm sm:text-base leading-tight text-slate-900">
              Portal Ujian Online
            </span>
            <span className="text-[11px] font-bold text-blue-600 leading-none tracking-tight">
              SDN 4 Sojol Utara
            </span>
          </div>
        </button>

        {/* Zone 2: 3-4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('student-login')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentView.startsWith('student') ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Portal Siswa</span>
          </button>

          <button
            onClick={() => onNavigate('teacher-login')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentView.startsWith('teacher') ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Portal Guru</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {activeRole === 'student' && (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-slate-600">
                Siswa: <strong className="text-slate-800">{studentName || 'Peserta'}</strong>
              </span>
              {currentView === 'student-result' && (
                <button
                  onClick={onLogout}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Selesai</span>
                </button>
              )}
            </div>
          )}

          {activeRole === 'teacher' && (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-slate-600">
                Guru: <strong className="text-slate-800">{teacherName || 'Pengajar'}</strong>
              </span>
              <button
                onClick={onLogout}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Guru</span>
              </button>
            </div>
          )}

          {activeRole === 'none' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('student-login')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Mulai Ujian Siswa
              </button>
              <button
                onClick={() => onNavigate('teacher-login')}
                className="hidden sm:inline-block px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                Masuk Guru
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
