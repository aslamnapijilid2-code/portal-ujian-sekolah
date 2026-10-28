/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Award,
  Clock,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users,
  FileCheck,
} from 'lucide-react';

import { HeaderNav } from './components/HeaderNav';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamRoom } from './components/StudentExamRoom';
import { StudentResultView } from './components/StudentResultView';
import { TeacherLogin } from './components/TeacherLogin';
import { TeacherDashboard } from './components/TeacherDashboard';

import { EXAM_QUESTIONS, QuestionData, checkIsAnswerCorrect } from './data/questions';
import { StudentProfile, StudentSubmission, ExamSessionConfig } from './types/exam';

const STORAGE_SUBMISSIONS_KEY = 'edutest_submissions_cache';
const STORAGE_SESSION_KEY = 'edutest_session_cache';
const STORAGE_QUESTIONS_KEY = 'edutest_questions_cache';

const defaultSession: ExamSessionConfig = {
  id: 'sesi-1',
  sessionCode: 'LIT-NUM-2026',
  teacherName: 'Pak Aslam, S.Pd.',
  title: 'Ujian Literasi atau Numerasi SDN 4 Sojol Utara',
  durationMinutes: 30,
  passingScore: 70,
  createdAt: new Date().toISOString(),
  isActive: true,
};

const defaultSeedSubmissions: StudentSubmission[] = [];

export default function App() {
  const [currentView, setCurrentView] = useState<
    'home' | 'student-login' | 'student-exam' | 'student-result' | 'teacher-login' | 'teacher-dashboard'
  >('home');

  const [activeRole, setActiveRole] = useState<'none' | 'student' | 'teacher'>('none');
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<StudentSubmission | null>(null);
  const [teacherName, setTeacherName] = useState<string>('Pak Aslam, S.Pd.');
  const [sessionConfig, setSessionConfig] = useState<ExamSessionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      return saved ? JSON.parse(saved) : defaultSession;
    } catch {
      return defaultSession;
    }
  });

  const [questions, setQuestions] = useState<QuestionData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUESTIONS_KEY);
      return saved ? JSON.parse(saved) : EXAM_QUESTIONS;
    } catch {
      return EXAM_QUESTIONS;
    }
  });

  // Start with empty submissions; only real student submissions will be displayed
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove any previous sample dummy students from cache
          const realSubs = parsed.filter(
            (s: StudentSubmission) => s && s.id && !['sub-1', 'sub-2', 'sub-3', 'sub-4', 'sub-5'].includes(s.id)
          );
          return realSubs;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Sync with server on initial load
  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch('/api/exam/session');
        if (sessionRes.ok) {
          const sData = await sessionRes.json();
          if (sData.success && sData.session) {
            setSessionConfig(sData.session);
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sData.session));
          }
        }

        const subRes = await fetch('/api/exam/submissions');
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.success && Array.isArray(subData.submissions)) {
            const realSubs = subData.submissions.filter(
              (s: StudentSubmission) => s && s.id && !['sub-1', 'sub-2', 'sub-3', 'sub-4', 'sub-5'].includes(s.id)
            );
            setSubmissions(realSubs);
            localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(realSubs));
          }
        }

        const qRes = await fetch('/api/exam/questions');
        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.success && qData.questions && qData.questions.length > 0) {
            setQuestions(qData.questions);
            localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(qData.questions));
          }
        }
      } catch (e) {
        console.warn('Working with client cached state:', e);
      }
    }
    loadData();
  }, []);

  // Sync submissions to local cache whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch (e) {
      console.warn(e);
    }
  }, [submissions]);

  // Handler: Start exam after student filled profile
  const handleStartExam = (profile: StudentProfile) => {
    setStudentProfile(profile);
    setActiveRole('student');
    setCurrentView('student-exam');
  };

  // Handler: Student finishes exam (Score scale 0-100 dynamically calculated)
  const handleSubmitExam = async (answers: Record<number, string>, timeSpentSeconds: number) => {
    if (!studentProfile) return;

    let correctCount = 0;
    const totalQuestions = questions.length;
    for (const q of questions) {
      if (checkIsAnswerCorrect(answers[q.id], q.correctAnswer, q.type, q.statements)) {
        correctCount++;
      }
    }

    // Maximum score is always 100
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100 * 10) / 10 : 0;

    const newSub: StudentSubmission = {
      id: 'sub-' + Date.now(),
      name: studentProfile.name,
      gender: studentProfile.gender,
      birthPlace: studentProfile.birthPlace,
      birthDate: studentProfile.birthDate,
      submittedAt: new Date().toISOString(),
      timeSpentSeconds,
      answers,
      score,
      correctCount,
      totalQuestions,
      sessionId: sessionConfig.id,
    };

    // Update local state first
    setSubmissions((prev) => [newSub, ...prev]);
    setLatestSubmission(newSub);
    setCurrentView('student-result');

    // Notify server
    try {
      await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentProfile,
          answers,
          timeSpentSeconds,
        }),
      });
    } catch (e) {
      console.warn('Server offline, saved to browser storage:', e);
    }
  };

  // Handler: Teacher updates questions (Add, Edit, Delete)
  const handleUpdateQuestions = async (newQuestions: QuestionData[]) => {
    setQuestions(newQuestions);
    try {
      localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(newQuestions));
    } catch (e) {
      console.warn(e);
    }
    try {
      await fetch('/api/exam/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: newQuestions }),
      });
    } catch (e) {
      console.warn('Questions server sync failed:', e);
    }
  };

  // Handler: Teacher resets questions to default 6 questions
  const handleResetQuestions = async () => {
    setQuestions(EXAM_QUESTIONS);
    try {
      localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(EXAM_QUESTIONS));
    } catch (e) {
      console.warn(e);
    }
    try {
      await fetch('/api/exam/questions/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Questions reset failed:', e);
    }
  };

  // Handler: Teacher successfully logs in
  const handleTeacherLoginSuccess = (name: string) => {
    setTeacherName(name);
    setActiveRole('teacher');
    setCurrentView('teacher-dashboard');
  };

  // Handler: Teacher creates a new session
  const handleNewSession = async (
    configUpdates: Partial<ExamSessionConfig>,
    resetSubmissions: boolean
  ) => {
    const updated: ExamSessionConfig = {
      ...sessionConfig,
      ...configUpdates,
      id: 'sesi-' + Date.now(),
      sessionCode: 'MTK-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
    };

    setSessionConfig(updated);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updated));

    if (resetSubmissions) {
      setSubmissions([]);
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify([]));
    }

    try {
      await fetch('/api/exam/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName,
          title: updated.title,
          durationMinutes: updated.durationMinutes,
          passingScore: updated.passingScore,
          resetSubmissions,
        }),
      });
    } catch (e) {
      console.warn('Server sync error:', e);
    }
  };

  // Handler: Teacher updates exam duration directly (10m - 120m)
  const handleUpdateDuration = async (durationMinutes: number) => {
    const clamped = Math.min(120, Math.max(10, durationMinutes));
    const updated: ExamSessionConfig = {
      ...sessionConfig,
      durationMinutes: clamped,
    };
    setSessionConfig(updated);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updated));

    try {
      await fetch('/api/exam/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherName,
          title: updated.title,
          durationMinutes: clamped,
          passingScore: updated.passingScore,
          resetSubmissions: false,
        }),
      });
    } catch (e) {
      console.warn('Server sync error:', e);
    }
  };

  // Handler: Seed sample student data
  const handleSeedSample = async () => {
    setSubmissions(defaultSeedSubmissions);
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(defaultSeedSubmissions));
    try {
      await fetch('/api/exam/seed-sample', { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
  };

  // Handler: Clear all submissions
  const handleClearSubmissions = async () => {
    setSubmissions([]);
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify([]));
    try {
      await fetch('/api/exam/clear', { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleLogout = () => {
    setActiveRole('none');
    setStudentProfile(null);
    setLatestSubmission(null);
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Top Bar Navigation */}
      <HeaderNav
        currentView={currentView}
        onNavigate={(view) => {
          setActiveRole('none');
          setCurrentView(view);
        }}
        activeRole={activeRole}
        onLogout={handleLogout}
        studentName={studentProfile?.name}
        teacherName={teacherName}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW: HOME / LANDING SELECTION */}
        {currentView === 'home' && (
          <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 space-y-12">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 tracking-wider uppercase shadow-2xs">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>SDN 4 Sojol Utara</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Portal Ujian Online SDN 4 Sojol Utara
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                Ujian Literasi atau Numerasi SDN 4 Sojol Utara
              </p>
            </div>

            {/* Schoolyard Visual Banner */}
            <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-white group">
              <div className="relative aspect-16/9 sm:aspect-21/9 max-h-[380px] w-full overflow-hidden">
                <img
                  src="/assets/aistudio/Lively_Indonesian_Schoolyard_Adventure_38642518.png"
                  alt="Suasana Ceria Belajar di SDN 4 Sojol Utara"
                  className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 backdrop-blur-md text-[11px] font-semibold text-white w-fit mb-1.5 border border-white/30 shadow-xs">
                    <GraduationCap className="w-3.5 h-3.5 text-yellow-300" />
                    <span>SDN 4 Sojol Utara</span>
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-white drop-shadow-sm">
                    Selamat Datang di Portal Ujian Online Siswa & Pendidik
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 drop-shadow-sm line-clamp-2 max-w-2xl">
                    Lingkungan belajar aktif dan ramah siswa dengan fasilitas ujian terstandar, navigasi soal bergambar interaktif, serta rekapitulasi penilaian real-time.
                  </p>
                </div>
              </div>
            </div>

            {/* Two Primary Portals: Siswa & Guru */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {/* Card 1: Portal Siswa */}
              <div
                onClick={() => setCurrentView('student-login')}
                className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-600 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Menu Siswa
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                      Ruang Ujian Siswa
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Masuk dengan identitas (Nama, Jenis Kelamin, Tempat & Tanggal Lahir). Kerjakan 6 butir soal pilihan ganda bergambar dengan countdown waktu, menu navigasi, dan perolehan nilai instan.
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Alokasi Waktu: {sessionConfig.durationMinutes} Menit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Skor Tertinggi: 100 Poin</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="w-full py-3 px-4 bg-blue-600 group-hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2">
                    <span>Masuk ke Portal Siswa</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Card 2: Portal Guru */}
              <div
                onClick={() => setCurrentView('teacher-login')}
                className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-800 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Menu Guru
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                      Dasbor Pengajar & Analisis
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Otentikasi khusus pendidik dengan Nama Guru & Kode Akses Rahasia. Akses lembar rekapitulasi nilai, analisis butir soal per nomor, pengaturan durasi, manajemen soal, dan evaluasi hasil belajar.
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>Rekapitulasi Siswa & Lembar Pengerjaan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Analisis Butir & Miskonsepsi Pecahan</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button className="w-full py-3 px-4 bg-slate-900 group-hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2">
                    <span>Masuk ke Dasbor Guru</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900">Soal Gambar Asli Lengkap</h3>
                  <p className="mt-0.5 text-slate-500">Dilengkapi visual pecahan dan konteks soal cerita yang jelas dan dapat diperbesar.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900">Waktu Pengerjaan Terintegrasi</h3>
                  <p className="mt-0.5 text-slate-500">Countdown timer dinamis dengan status navigasi soal (sudah, belum, ragu-ragu).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900">Analisis Per Butir & AI</h3>
                  <p className="mt-0.5 text-slate-500">Mendeteksi soal tersulit dan rekomendasi tindakan remedial terarah untuk guru.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: STUDENT LOGIN */}
        {currentView === 'student-login' && (
          <StudentLogin
            sessionConfig={sessionConfig}
            totalQuestions={questions.length}
            onStartExam={handleStartExam}
            onSwitchToTeacher={() => setCurrentView('teacher-login')}
          />
        )}

        {/* VIEW: STUDENT EXAM ROOM */}
        {currentView === 'student-exam' && studentProfile && (
          <StudentExamRoom
            profile={studentProfile}
            sessionConfig={sessionConfig}
            questions={questions}
            onSubmitExam={handleSubmitExam}
          />
        )}

        {/* VIEW: STUDENT RESULT */}
        {currentView === 'student-result' && latestSubmission && (
          <StudentResultView
            submission={latestSubmission}
            sessionConfig={sessionConfig}
            questions={questions}
            onResetToLogin={() => {
              setActiveRole('none');
              setCurrentView('student-login');
            }}
          />
        )}

        {/* VIEW: TEACHER LOGIN */}
        {currentView === 'teacher-login' && (
          <TeacherLogin
            onLoginSuccess={handleTeacherLoginSuccess}
            onSwitchToStudent={() => setCurrentView('student-login')}
          />
        )}

        {/* VIEW: TEACHER DASHBOARD */}
        {currentView === 'teacher-dashboard' && (
          <TeacherDashboard
            teacherName={teacherName}
            sessionConfig={sessionConfig}
            submissions={submissions}
            questions={questions}
            onNewSession={handleNewSession}
            onUpdateDuration={handleUpdateDuration}
            onUpdateQuestions={handleUpdateQuestions}
            onResetQuestions={handleResetQuestions}
            onSeedSample={handleSeedSample}
            onClearSubmissions={handleClearSubmissions}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 text-center text-xs text-slate-400 no-print">
        <p>Portal Ujian Online SDN 4 Sojol Utara · Penilaian Harian Matematika · Hak Cipta Terpelihara</p>
      </footer>
    </div>
  );
}
