import React, { useState, useMemo } from 'react';
import {
  Users,
  BarChart3,
  Sparkles,
  Settings,
  Download,
  Printer,
  Search,
  Filter,
  Eye,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  X,
  FileSpreadsheet,
  FileText,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { EXAM_QUESTIONS, QuestionData, checkIsAnswerCorrect } from '../data/questions';
import { StudentSubmission, ExamSessionConfig, QuestionStat } from '../types/exam';
import { QuestionEditorModal } from './QuestionEditorModal';

const DURATION_PRESETS = [10, 20, 30, 40, 50, 60, 75, 90, 100, 120] as const;

interface TeacherDashboardProps {
  teacherName: string;
  sessionConfig: ExamSessionConfig;
  submissions: StudentSubmission[];
  questions?: QuestionData[];
  onNewSession: (config: Partial<ExamSessionConfig>, resetSubmissions: boolean) => void;
  onUpdateDuration?: (minutes: number) => void;
  onUpdateQuestions?: (newQuestions: QuestionData[]) => void;
  onResetQuestions?: () => void;
  onSeedSample: () => void;
  onClearSubmissions: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherName,
  sessionConfig,
  submissions,
  questions,
  onNewSession,
  onUpdateDuration,
  onUpdateQuestions,
  onResetQuestions,
  onSeedSample,
  onClearSubmissions,
}) => {
  const activeQuestions = questions && questions.length > 0 ? questions : EXAM_QUESTIONS;

  const [activeTab, setActiveTab] = useState<'submissions' | 'questions-manage' | 'item-analysis' | 'ai-insights' | 'settings'>('submissions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'remedial'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentSubmission | null>(null);

  // Question CRUD modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<QuestionData | null>(null);

  // Quick notification for duration or question update
  const [durationNotice, setDurationNotice] = useState<string>('');

  // New session modal state
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(sessionConfig.title);
  const [newDuration, setNewDuration] = useState(sessionConfig.durationMinutes);
  const [newPassingScore, setNewPassingScore] = useState(sessionConfig.passingScore);
  const [resetDataOnNewSession, setResetDataOnNewSession] = useState(false);

  // Dedicated settings duration state
  const [settingsDuration, setSettingsDuration] = useState<number>(sessionConfig.durationMinutes);

  // AI Analysis state
  const [aiReport, setAiReport] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiCustomQuestion, setAiCustomQuestion] = useState('');

  // Overall Statistics Calculation
  const totalStudents = submissions.length;
  const averageScore = useMemo(() => {
    if (totalStudents === 0) return 0;
    const total = submissions.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round((total / totalStudents) * 10) / 10;
  }, [submissions, totalStudents]);

  const highestScore = useMemo(() => {
    if (totalStudents === 0) return 0;
    return Math.max(...submissions.map((s) => s.score));
  }, [submissions, totalStudents]);

  const lowestScore = useMemo(() => {
    if (totalStudents === 0) return 0;
    return Math.min(...submissions.map((s) => s.score));
  }, [submissions, totalStudents]);

  const passedCount = useMemo(() => {
    return submissions.filter((s) => s.score >= sessionConfig.passingScore).length;
  }, [submissions, sessionConfig.passingScore]);

  const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;

  // Question-by-question analysis (Item Analysis)
  const questionStats: Record<number, QuestionStat> = useMemo(() => {
    const stats: Record<number, QuestionStat> = {};

    activeQuestions.forEach((q) => {
      let correctCount = 0;
      const optionCounts: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 };

      submissions.forEach((sub) => {
        const studentAns = sub.answers[q.id];
        if (studentAns) {
          if (studentAns in optionCounts) {
            optionCounts[studentAns as 'A' | 'B' | 'C' | 'D']++;
          }
          if (checkIsAnswerCorrect(studentAns, q.correctAnswer, q.type, q.statements)) {
            correctCount++;
          }
        }
      });

      const totalAnswered = submissions.filter((s) => !!s.answers[q.id]).length;
      const correctPct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

      // Find most chosen option
      let mostChosen: string = q.correctAnswer;
      let maxCount = -1;
      (Object.keys(optionCounts) as ('A' | 'B' | 'C' | 'D')[]).forEach((key) => {
        if (optionCounts[key] > maxCount) {
          maxCount = optionCounts[key];
          mostChosen = key;
        }
      });

      let difficultyTag: 'Mudah' | 'Sedang' | 'Tantangan' = 'Sedang';
      if (correctPct >= 75) difficultyTag = 'Mudah';
      else if (correctPct < 50) difficultyTag = 'Tantangan';

      stats[q.id] = {
        questionId: q.id,
        totalAnswered,
        correctCount,
        correctPct,
        optionCounts,
        mostChosenOption: mostChosen,
        difficultyTag,
      };
    });

    return stats;
  }, [submissions, activeQuestions]);

  // Filtered student list
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.birthPlace.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'passed') return s.score >= sessionConfig.passingScore;
      if (statusFilter === 'remedial') return s.score < sessionConfig.passingScore;
      return true;
    });
  }, [submissions, searchQuery, statusFilter, sessionConfig.passingScore]);

  // Export to CSV
  const handleExportCSV = () => {
    if (submissions.length === 0) return;

    const questionHeaders = activeQuestions.map((q) => `Jawaban Soal ${q.number}`);
    const headers = [
      'No',
      'Nama Siswa',
      'Jenis Kelamin',
      'Tempat Lahir',
      'Tanggal Lahir',
      'Waktu Pengerjaan (detik)',
      ...questionHeaders,
      'Nilai Akhir (Skor)',
      'Status Kelulusan',
    ];

    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.name}"`,
      s.gender,
      `"${s.birthPlace}"`,
      s.birthDate,
      s.timeSpentSeconds,
      ...activeQuestions.map((q) => s.answers[q.id] || '-'),
      s.score,
      s.score >= sessionConfig.passingScore ? 'Tuntas' : 'Remedial',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_Ujian_${sessionConfig.sessionCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Question CRUD Handlers
  const handleSaveQuestion = (savedQ: QuestionData) => {
    let updated: QuestionData[];
    const exists = activeQuestions.some((q) => q.id === savedQ.id);
    if (exists) {
      updated = activeQuestions.map((q) => (q.id === savedQ.id ? savedQ : q));
    } else {
      updated = [...activeQuestions, savedQ];
    }
    updated = updated.map((q, idx) => ({ ...q, number: idx + 1 }));
    if (onUpdateQuestions) {
      onUpdateQuestions(updated);
    }
    setDurationNotice(`Soal nomor ${savedQ.number} berhasil ${exists ? 'diperbarui' : 'ditambahkan ke bank soal'}.`);
    setTimeout(() => setDurationNotice(''), 4000);
  };

  const handleDeleteQuestion = (qId: number, qNum: number) => {
    if (activeQuestions.length <= 1) {
      alert('Ujian harus memiliki minimal 1 butir soal. Tidak dapat menghapus butir terakhir.');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus Soal Nomor ${qNum}?`)) {
      const updated = activeQuestions
        .filter((q) => q.id !== qId)
        .map((q, idx) => ({ ...q, number: idx + 1 }));
      if (onUpdateQuestions) {
        onUpdateQuestions(updated);
      }
      setDurationNotice(`Soal nomor ${qNum} berhasil dihapus.`);
      setTimeout(() => setDurationNotice(''), 4000);
    }
  };

  // Run Gemini AI Analysis
  const handleRunAiAnalysis = async (customQueryText?: string) => {
    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallStats: {
            totalStudents,
            averageScore,
            highestScore,
            lowestScore,
            passRate,
          },
          questionStats,
          customQuery: customQueryText || aiCustomQuestion,
        }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAiReport(data.analysis);
      } else {
        setAiReport('Maaf, tidak dapat memuat analisis otomatis saat ini.');
      }
    } catch (err) {
      console.error(err);
      setAiReport('Gagal menghubungi server analitik cerdas.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleApplyDuration = (minutes: number) => {
    const clamped = Math.min(120, Math.max(10, Number(minutes)));
    setSettingsDuration(clamped);
    setNewDuration(clamped);
    if (onUpdateDuration) {
      onUpdateDuration(clamped);
    }
    setDurationNotice(`Durasi pengerjaan siswa berhasil diatur menjadi ${clamped} Menit.`);
    setTimeout(() => setDurationNotice(''), 4000);
  };

  const handleCreateNewSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNewSession(
      {
        title: newTitle,
        durationMinutes: Number(newDuration),
        passingScore: Number(newPassingScore),
      },
      resetDataOnNewSession
    );
    setIsNewSessionModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Toast Notification when Duration is changed */}
      {durationNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{durationNotice}</span>
          </div>
          <button
            onClick={() => setDurationNotice('')}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner / Session Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <span>Dasbor Guru · SDN 4 Sojol Utara</span>
            <span>·</span>
            <span>Kode Sesi: {sessionConfig.sessionCode}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {sessionConfig.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengampu: <strong className="text-slate-800">{teacherName}</strong> · KKM: {sessionConfig.passingScore} Poin
          </p>

          {/* Quick Duration Selector Bar directly in header */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Waktu Ujian:</span>
            </span>

            {/* Quick Presets for 10m to 120m */}
            <div className="flex flex-wrap items-center gap-1">
              {([10, 20, 30, 40, 50, 60, 90, 120] as const).map((m) => {
                const isActive = sessionConfig.durationMinutes === m;
                return (
                  <button
                    key={m}
                    onClick={() => handleApplyDuration(m)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={`Atur waktu pengerjaan menjadi ${m} menit`}
                  >
                    {m} Menit
                  </button>
                );
              })}

              <select
                value={sessionConfig.durationMinutes}
                onChange={(e) => handleApplyDuration(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {DURATION_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p} Menit {p === 30 ? '(Standar)' : p === 60 ? '(1 Jam)' : p === 120 ? '(2 Jam)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsNewSessionModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Mulai Sesi Ujian Baru</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Total Siswa
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums flex items-baseline gap-1">
            {totalStudents}
            <span className="text-xs font-normal text-slate-400">peserta</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {totalStudents > 0 ? 'Sesi aktif' : 'Belum ada pengerjaan'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Rata-rata Nilai
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1 tabular-nums flex items-baseline gap-1">
            {averageScore}
            <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Skala standar 0-100
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Nilai Tertinggi
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1 tabular-nums flex items-baseline gap-1">
            {highestScore}
            <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            Skor Max: 100
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Nilai Terendah
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1 tabular-nums flex items-baseline gap-1">
            {lowestScore}
            <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Perlu tindak lanjut
          </span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
            Ketuntasan Belajar
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums flex items-baseline gap-1">
            {passRate}%
            <span className="text-xs font-semibold text-emerald-600">({passedCount} tuntas)</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Target KKM: {sessionConfig.passingScore}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'submissions'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Hasil Pekerjaan Siswa ({totalStudents})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions-manage')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'questions-manage'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Kelola Soal Ujian ({activeQuestions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('item-analysis')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'item-analysis'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analisis Per Soal ({activeQuestions.length} Butir)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('ai-insights');
            if (!aiReport && totalStudents > 0) {
              handleRunAiAnalysis();
            }
          }}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'ai-insights'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Wawasan Cerdas AI Guru</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Sesi & Data</span>
        </button>
      </div>

      {/* Tab 1: Submissions Table */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Controls: Search, Filter & Quick Sample Data */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau kota siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semua ({totalStudents})
                </button>
                <button
                  onClick={() => setStatusFilter('passed')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    statusFilter === 'passed' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Tuntas ({passedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('remedial')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    statusFilter === 'remedial' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Remedial ({totalStudents - passedCount})
                </button>
              </div>

            </div>
          </div>

          {/* Submissions Table */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  {submissions.length === 0
                    ? 'Belum Ada Siswa yang Mengerjakan Ujian'
                    : 'Tidak Ditemukan Siswa'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {submissions.length === 0
                    ? 'Daftar hasil ujian masih kosong. Nama dan perolehan nilai siswa akan otomatis tampil di tabel ini seketika setelah siswa menyelesaikan dan mengirim ujian melalui Portal Siswa.'
                    : 'Tidak ada data siswa yang cocok dengan kriteria pencarian saat ini.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">JK</th>
                      <th className="py-3 px-4">TTL (Tempat, Tanggal Lahir)</th>
                      {activeQuestions.map((q) => (
                        <th key={q.id} className="py-3 px-3 text-center whitespace-nowrap">
                          Soal {q.number}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center">Nilai Akhir</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub, index) => {
                      const isPassed = sub.score >= sessionConfig.passingScore;
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {sub.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {sub.gender === 'Laki-laki' ? 'L' : 'P'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {sub.birthPlace}, {sub.birthDate}
                          </td>
                          {/* Dynamic answers for each question */}
                          {activeQuestions.map((q) => {
                            const ans = sub.answers[q.id];
                            const isCorrect = checkIsAnswerCorrect(ans, q.correctAnswer, q.type, q.statements);

                            let cellLabel = ans || '-';
                            if (ans && q.type === 'true_false' && q.statements && q.statements.length > 0) {
                              cellLabel = isCorrect ? '✓ B/S' : '✗ B/S';
                            } else if (ans && q.type === 'complex') {
                              cellLabel = ans;
                            }

                            return (
                              <td key={q.id} className="py-3.5 px-2 text-center">
                                <span
                                  className={`inline-block px-1.5 min-w-[24px] h-6 rounded font-bold text-[11px] leading-6 ${
                                    ans
                                      ? isCorrect
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                  title={`Jawaban: ${ans || 'Kosong'} (Kunci: ${q.correctAnswer})`}
                                >
                                  {cellLabel}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3.5 px-4 text-center font-bold text-sm tabular-nums text-slate-900">
                            {sub.score}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isPassed ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Tuntas
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Remedial
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedStudent(sub)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Kelola Soal Ujian (CRUD: Tambah, Edit, Hapus) */}
      {activeTab === 'questions-manage' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>Bank Soal & Manajemen Soal Ujian</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Kelola Butir Soal Ujian ({activeQuestions.length} Soal Aktif)
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Anda dapat menambah butir soal baru, mengedit teks soal, opsi jawaban (A, B, C, D), kunci jawaban resmi, gambar, dan pembahasan, atau menghapus butir soal. Skor maksimal siswa otomatis terdistribusi dengan total 100 poin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {onResetQuestions && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Kembalikan seluruh bank soal ke 6 butir soal pecahan bawaan awal?')) {
                      onResetQuestions();
                      setDurationNotice('Bank soal berhasil di-reset ke 6 butir soal pecahan bawaan.');
                      setTimeout(() => setDurationNotice(''), 4000);
                    }
                  }}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Reset ke 6 butir soal pecahan bawaan"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Soal Bawaan</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setQuestionToEdit(null);
                  setIsQuestionModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Soal Baru</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Jumlah Soal Saat Ini</span>
              <span className="text-base font-extrabold text-slate-900">{activeQuestions.length} Butir</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Bobot Nilai per Soal</span>
              <span className="text-base font-extrabold text-blue-600">
                {(100 / activeQuestions.length).toFixed(1)} Poin
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Skor Tertinggi Maksimum</span>
              <span className="text-base font-extrabold text-emerald-600">100 Poin</span>
            </div>
          </div>

          {/* Question List Cards */}
          <div className="space-y-4">
            {activeQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
              >
                {/* Header bar of each card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-extrabold text-xs">
                      Soal #{q.number}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs">
                      {q.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 ml-1">
                      {q.topicTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionToEdit(q);
                        setIsQuestionModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Soal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id, q.number)}
                      disabled={activeQuestions.length <= 1}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={activeQuestions.length <= 1 ? 'Minimal harus ada 1 butir soal' : 'Hapus soal ini'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>

                {/* Content body */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Optional Question Image */}
                  {q.imagePath && (
                    <div className="lg:col-span-4 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                      <img
                        src={q.imagePath}
                        alt={`Soal ${q.number}`}
                        className="max-h-48 w-auto object-contain rounded-lg bg-white border border-slate-200"
                      />
                      <span className="text-[10px] text-slate-400 mt-2">Lampiran Gambar Soal #{q.number}</span>
                    </div>
                  )}

                  {/* Center / Right: Question prompt, context & choices */}
                  <div className={q.imagePath ? 'lg:col-span-8 space-y-3' : 'lg:col-span-12 space-y-3'}>
                    {q.contextStory && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 leading-relaxed font-serif">
                        <strong className="block text-[10px] font-sans font-bold text-amber-800 uppercase tracking-wider mb-1">
                          {q.contextHeader || 'Konteks Soal / Cerita'}:
                        </strong>
                        {q.contextStory}
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Pertanyaan:
                      </span>
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                        {q.questionPrompt}
                      </p>
                    </div>

                    {/* Choices Grid or Multi-statement Rows */}
                    {q.type === 'true_false' && q.statements && q.statements.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Naskah Pernyataan ({q.statements.length} Baris Naskah) & Kunci:
                        </span>
                        <div className="space-y-2 border border-emerald-100 rounded-xl p-3 bg-emerald-50/30">
                          {q.statements.map((st, sIdx) => (
                            <div
                              key={st.id || sIdx}
                              className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                  {sIdx + 1}
                                </span>
                                <span className="font-semibold text-slate-800">{st.text}</span>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] shrink-0 self-start sm:self-auto flex items-center gap-1 ${
                                  st.correctAnswer === 'Benar'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {st.correctAnswer === 'Benar' ? '✓ BENAR' : '✗ SALAH'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Pilihan Jawaban & Kunci:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt) => {
                            const isCorrect =
                              q.type === 'complex'
                                ? q.correctAnswer
                                    .split(',')
                                    .map((k) => k.trim())
                                    .includes(opt.key)
                                : opt.key === q.correctAnswer;
                            return (
                              <div
                                key={opt.key}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-400/40'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-md font-extrabold flex items-center justify-center shrink-0 ${
                                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {opt.key}
                                  </span>
                                  <span className="leading-snug">{opt.text}</span>
                                </div>
                                {isCorrect && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200 text-emerald-900 shrink-0 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                    Kunci Jawaban
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1.5">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                          Pembahasan & Langkah Solusi:
                        </span>
                        {typeof q.explanation === 'string' ? (
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                            {q.explanation}
                          </p>
                        ) : (
                          <div className="space-y-1 text-slate-700 font-mono text-[11px]">
                            {q.explanation.summary && <p className="font-semibold">{q.explanation.summary}</p>}
                            {q.explanation.steps && (
                              <ul className="list-decimal list-inside space-y-0.5">
                                {q.explanation.steps.map((st, i) => (
                                  <li key={i}>{st}</li>
                                ))}
                              </ul>
                            )}
                            {q.explanation.finalResult && (
                              <p className="font-bold text-emerald-800 pt-1">
                                Hasil Akhir: {q.explanation.finalResult}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Item Analysis (Analisis Per Soal) */}
      {activeTab === 'item-analysis' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Analisis Butir Soal & Daya Pembeda Pengujian</span>
            </h2>
            <p className="text-xs text-slate-500">
              Evaluasi persentase ketuntasan per butir soal, identifikasi soal yang paling sulit, serta distribusi pengecoh (distractor) jawaban siswa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeQuestions.map((q) => {
              const stat = questionStats[q.id];
              const correctPct = stat?.correctPct || 0;

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
                >
                  {/* Item Title & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-blue-600">
                        Soal Nomor {q.number} · {q.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {q.topicTitle}
                      </h3>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                        stat?.difficultyTag === 'Mudah'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : stat?.difficultyTag === 'Tantangan'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      Kategori: {stat?.difficultyTag}
                    </span>
                  </div>

                  {/* Thumbnail of question */}
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex items-center gap-3">
                    {q.imagePath ? (
                      <img
                        src={q.imagePath}
                        alt={`Soal ${q.number}`}
                        className="h-16 w-20 object-contain rounded border border-slate-100 bg-white shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-20 rounded bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-xs">
                        Teks Soal
                      </div>
                    )}
                    <div className="text-xs text-slate-600 truncate flex-1">
                      <p className="font-semibold text-slate-800 line-clamp-1">{q.questionPrompt}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Kunci Jawaban Resmi: <strong className="text-emerald-700">{q.correctAnswer}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Ketuntasan Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium">Persentase Menjawab Benar</span>
                      <strong className="text-slate-900 tabular-nums">{correctPct}% ({stat?.correctCount || 0}/{totalStudents} Siswa)</strong>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          correctPct >= 70
                            ? 'bg-emerald-500'
                            : correctPct >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${correctPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Distribution of Choices A, B, C, D */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Distribusi Jawaban Siswa (Pilihan A, B, C, D)
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {(['A', 'B', 'C', 'D'] as const).map((key) => {
                        const count = stat?.optionCounts[key] || 0;
                        const isCorrectKey = key === q.correctAnswer;
                        const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;

                        return (
                          <div
                            key={key}
                            className={`p-2 rounded-lg border text-center transition-colors ${
                              isCorrectKey
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1 font-bold">
                              <span>{key}</span>
                              {isCorrectKey && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            </div>
                            <div className="text-base font-extrabold mt-0.5 tabular-nums">
                              {count}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {pct}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: AI Assistant Insights */}
      {activeTab === 'ai-insights' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Asisten Pedagogis Cerdas untuk Pengajar</span>
              </div>
              <button
                onClick={() => handleRunAiAnalysis()}
                disabled={isLoadingAi}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
                <span>{isLoadingAi ? 'Menganalisis...' : 'Perbarui Analisis Kelas'}</span>
              </button>
            </div>
            <p className="text-xs text-blue-950 leading-relaxed">
              Menganalisis hasil tes siswa secara komprehensif: memetakan konsep pecahan yang sudah dipahami, mendeteksi miskonsepsi siswa pada operasi pecahan, dan memberikan rekomendasi strategi pengajaran remedial.
            </p>
          </div>

          {/* AI Report Output */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            {isLoadingAi ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Sedang menyusun analisis pedagogis hasil pengerjaan kelas...
                </p>
                <p className="text-xs text-slate-400">
                  Memeriksa distribusi butir soal dan miskonsepsi matematika siswa
                </p>
              </div>
            ) : aiReport ? (
              <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {aiReport}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm text-slate-700 font-semibold">
                  Klik tombol di bawah untuk menghasilkan analisis diagnostik kelas secara cerdas.
                </p>
                <button
                  onClick={() => handleRunAiAnalysis()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Jalankan Analisis Hasil Ujian
                </button>
              </div>
            )}
          </div>

          {/* Custom Question to AI */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Tanyakan Saran Khusus ke Asisten Pengajar
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiCustomQuestion}
                onChange={(e) => setAiCustomQuestion(e.target.value)}
                placeholder="Contoh: Berikan ide game/alat peraga konkret untuk mengajarkan pengurangan pecahan campuran..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && aiCustomQuestion.trim()) {
                    handleRunAiAnalysis(aiCustomQuestion);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (aiCustomQuestion.trim()) {
                    handleRunAiAnalysis(aiCustomQuestion);
                  }
                }}
                disabled={isLoadingAi || !aiCustomQuestion.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Tanyakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Settings & Exam Session Management */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl space-y-6">
          {/* Card: Dedicated Exam Duration Configuration (10m - 120m) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Pengaturan Waktu Ujian Siswa
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Atur Durasi Waktu Pengerjaan Ujian (10 s/d 120 Menit)
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pilih waktu yang dialokasikan bagi siswa untuk menyelesaikan 6 butir soal pecahan. Timer pada layar siswa akan menghitung mundur dari durasi yang Anda tetapkan di bawah.
                </p>
              </div>

              <div className="text-right shrink-0 bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-xl">
                <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider block">
                  Durasi Aktif Saat Ini
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-900 font-mono tabular-nums">
                  {sessionConfig.durationMinutes} <span className="text-xs font-sans font-semibold text-blue-700">Menit</span>
                </span>
              </div>
            </div>

            {/* Quick Presets Buttons: 10m, 20m, 30m, 40m, 50m, 60m s/d 120m */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                Pilihan Cepat Durasi Ujian:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {DURATION_PRESETS.map((m) => {
                  const isSelected = sessionConfig.durationMinutes === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleApplyDuration(m)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-bold ring-2 ring-blue-500/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold tabular-nums">{m} Menit</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {m === 10
                          ? 'Kuis Cepat'
                          : m === 20
                          ? 'Ujian Kilat'
                          : m === 30
                          ? 'Standar (Default)'
                          : m === 40
                          ? '1 Jam Pelajaran'
                          : m === 50
                          ? 'Format Reguler'
                          : m === 60
                          ? '1 Jam Penuh'
                          : m === 75
                          ? 'Format Intensif'
                          : m === 90
                          ? '1,5 Jam Semester'
                          : m === 100
                          ? 'Format Khusus'
                          : '2 Jam (Maksimum)'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider & Custom Input */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Geser Slider Durasi (Rentang 10 - 120 Menit):
                </span>
                <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {settingsDuration} Menit ({Math.floor(settingsDuration / 60)}j {settingsDuration % 60}m)
                </span>
              </div>

              <div className="space-y-1">
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={settingsDuration}
                  onChange={(e) => setSettingsDuration(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>10 Menit</span>
                  <span>30 Menit</span>
                  <span>60 Menit</span>
                  <span>90 Menit</span>
                  <span>120 Menit (Max)</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 font-medium">Input Manual:</span>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={settingsDuration}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSettingsDuration(val);
                    }}
                    className="w-20 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
                  />
                  <span className="text-slate-500">Menit</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyDuration(settingsDuration)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Durasi {settingsDuration} Menit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card: Session Metadata & Reset Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                Informasi & Manajemen Data Sesi
              </h2>
              <p className="text-xs text-slate-500">
                Detail kode unik akses pengajar dan pembersihan data rekaman siswa.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Kode Akses Unik Guru:</span>
                <code className="bg-white px-2.5 py-1 rounded border border-slate-200 font-mono font-bold text-slate-900">
                  @04051993Aslam
                </code>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Kode Sesi Ujian Aktif:</span>
                <span className="font-mono font-semibold text-blue-700">{sessionConfig.sessionCode}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Durasi Pengerjaan:</span>
                <span className="font-semibold text-slate-800 tabular-nums">{sessionConfig.durationMinutes} Menit</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Batas Kriteria Ketuntasan (KKM):</span>
                <span className="font-semibold text-slate-800">{sessionConfig.passingScore} Poin</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3">
              <button
                onClick={() => setIsNewSessionModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Buka Sesi Pengujian Baru</span>
              </button>

              <button
                onClick={onSeedSample}
                className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Isi Ulang Data Contoh</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin mengosongkan seluruh data siswa pada sesi ini?')) {
                    onClearSubmissions();
                  }
                }}
                className="px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Bersihkan Seluruh Data Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Student Detailed Submission Sheet */}
      {selectedStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Lembar Jawaban Siswa: {selectedStudent.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStudent.gender} · TTL: {selectedStudent.birthPlace}, {selectedStudent.birthDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
                <div>
                  <span className="text-slate-400 block">Skor Akhir:</span>
                  <strong className="text-base font-extrabold text-blue-700 tabular-nums">
                    {selectedStudent.score} / 100
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Benar:</span>
                  <strong className="text-base font-extrabold text-emerald-700 tabular-nums">
                    {selectedStudent.correctCount} / {activeQuestions.length} Soal
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  <strong className={`text-xs font-bold ${selectedStudent.score >= sessionConfig.passingScore ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedStudent.score >= sessionConfig.passingScore ? 'Tuntas' : 'Remedial'}
                  </strong>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Rincian Butir Soal ({activeQuestions.length} Butir)
                </h4>
                {activeQuestions.map((q) => {
                  const studentAns = selectedStudent.answers[q.id];
                  const isCorrect = checkIsAnswerCorrect(studentAns, q.correctAnswer, q.type, q.statements);

                  let parsedStmtMap: Record<string, string> = {};
                  if (studentAns && q.type === 'true_false' && q.statements) {
                    try {
                      if (studentAns.startsWith('{')) parsedStmtMap = JSON.parse(studentAns);
                      else {
                        studentAns.split('|').forEach((p) => {
                          const [id, val] = p.split(':');
                          if (id && val) parsedStmtMap[id.trim()] = val.trim();
                        });
                      }
                    } catch {}
                  }

                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-md font-bold flex items-center justify-center shrink-0 ${
                              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {q.number}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{q.topicTitle}</p>
                            <p className="text-slate-500 text-[11px]">
                              {q.type === 'true_false' && q.statements && q.statements.length > 0
                                ? 'Tipe: Benar / Salah Majemuk'
                                : `Jawaban Siswa: ${studentAns || 'Tidak diisi'} · Kunci: ${q.correctAnswer}`}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isCorrect ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Benar</span>
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              <span>Salah</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Multi-statement row breakdown if applicable */}
                      {q.type === 'true_false' && q.statements && q.statements.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 bg-slate-50 p-2 rounded-lg">
                          {q.statements.map((st, idx) => {
                            const ansGiven = parsedStmtMap[st.id];
                            const match = ansGiven?.toLowerCase() === st.correctAnswer.toLowerCase();
                            return (
                              <div key={st.id || idx} className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-700 font-medium truncate max-w-[280px]">
                                  {idx + 1}. {st.text}
                                </span>
                                <span className={match ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                  {ansGiven || '-'} (Kunci: {st.correctAnswer})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Session */}
      {isNewSessionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                <span>Mulai Sesi Pengujian Baru</span>
              </h3>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Sesi Penilaian
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Durasi Ujian Selection (10m - 120m) */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Waktu Pengerjaan Ujian (10 - 120 Menit)
                  </span>
                  <span className="font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                    {newDuration} Menit
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {([10, 20, 30, 40, 50, 60, 75, 90, 100, 120] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNewDuration(m)}
                      className={`px-2 py-0.5 text-[11px] rounded border font-semibold transition-all cursor-pointer ${
                        newDuration === m
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>

                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>10m</span>
                    <span>30m</span>
                    <span>60m</span>
                    <span>90m</span>
                    <span>120m (Max)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nilai KKM (Kriteria Ketuntasan Minimal: 0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={newPassingScore}
                  onChange={(e) => setNewPassingScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resetData"
                  checked={resetDataOnNewSession}
                  onChange={(e) => setResetDataOnNewSession(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="resetData" className="text-xs text-slate-700 cursor-pointer">
                  Bersihkan data hasil pengerjaan sebelumnya untuk sesi baru ini
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  Buat Sesi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Question Editor (Add / Edit) */}
      <QuestionEditorModal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setQuestionToEdit(null);
        }}
        onSave={handleSaveQuestion}
        questionToEdit={questionToEdit}
        nextNumber={activeQuestions.length + 1}
      />
    </div>
  );
};
