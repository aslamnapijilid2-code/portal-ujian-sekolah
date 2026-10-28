import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
  Calendar,
  MapPin,
  User,
} from 'lucide-react';
import { EXAM_QUESTIONS, QuestionData, checkIsAnswerCorrect } from '../data/questions';
import { StudentSubmission, ExamSessionConfig } from '../types/exam';

interface StudentResultViewProps {
  submission: StudentSubmission;
  sessionConfig: ExamSessionConfig;
  questions?: QuestionData[];
  onResetToLogin: () => void;
}

export const StudentResultView: React.FC<StudentResultViewProps> = ({
  submission,
  sessionConfig,
  questions,
  onResetToLogin,
}) => {
  const activeQuestions = questions && questions.length > 0 ? questions : EXAM_QUESTIONS;
  const [expandedSolutions, setExpandedSolutions] = useState<Record<number, boolean>>({
    1: true,
  });

  const toggleExpand = (id: number) => {
    setExpandedSolutions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isPassed = submission.score >= sessionConfig.passingScore;
  const minutesSpent = Math.floor(submission.timeSpentSeconds / 60);
  const secondsSpent = submission.timeSpentSeconds % 60;

  const handlePrint = () => {
    window.print();
  };

  const formatAnswerText = (ans: string | undefined, type?: string, q?: QuestionData) => {
    if (!ans) return 'Tidak dijawab';
    if (type === 'true_false') {
      if (q?.statements && q.statements.length > 0) {
        return 'Tabel Benar/Salah (Lihat Rincian)';
      }
      return ans;
    }
    if (type === 'complex') return `Pilihan ${ans.split(',').join(', ')}`;
    return `Pilihan ${ans}`;
  };

  const parseStudentStatementMap = (raw: string | undefined): Record<string, string> => {
    if (!raw) return {};
    try {
      if (raw.startsWith('{')) return JSON.parse(raw);
      const map: Record<string, string> = {};
      raw.split('|').forEach((p) => {
        const [id, val] = p.split(':');
        if (id && val) map[id.trim()] = val.trim();
      });
      return map;
    } catch {
      return {};
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Top Banner / Hero Score Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-blue-50 to-transparent opacity-70 pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
              <Award className="w-4 h-4" />
              Hasil Akhir Ujian Online · SDN 4 Sojol Utara
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {submission.name}
            </h1>
            <p className="text-xs text-slate-500">
              {sessionConfig.title} · Nilai Tertinggi: 100 Poin
            </p>
          </div>

          {/* Primary Score Box */}
          <div className="text-center bg-slate-50 border border-slate-200/80 rounded-2xl px-6 py-4 min-w-[180px] shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Skor Perolehan
            </span>
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums my-1">
              {submission.score}
              <span className="text-lg font-bold text-slate-400">/100</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md mt-1">
              {isPassed ? (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ TUNTAS (Memenuhi KKM {sessionConfig.passingScore})
                </span>
              ) : (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  ⚠ PERLU REMEDIAL (KKM {sessionConfig.passingScore})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Identity & Exam Details Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 block flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Jenis Kelamin
            </span>
            <span className="font-semibold text-slate-800">{submission.gender}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Tempat Lahir
            </span>
            <span className="font-semibold text-slate-800">{submission.birthPlace}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Tanggal Lahir
            </span>
            <span className="font-semibold text-slate-800">{submission.birthDate}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Waktu Pengerjaan
            </span>
            <span className="font-semibold text-slate-800 font-mono">
              {minutesSpent}m {secondsSpent}d
            </span>
          </div>
        </div>

        {/* Score Statistics Strip */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center">
            <span className="text-[11px] text-emerald-800 font-medium block">Jawaban Benar</span>
            <span className="text-lg font-bold text-emerald-700 tabular-nums">
              {submission.correctCount} Soal
            </span>
          </div>

          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-center">
            <span className="text-[11px] text-rose-800 font-medium block">Jawaban Salah</span>
            <span className="text-lg font-bold text-rose-700 tabular-nums">
              {submission.totalQuestions - submission.correctCount} Soal
            </span>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-center">
            <span className="text-[11px] text-blue-800 font-medium block">Akurasi Nilai</span>
            <span className="text-lg font-bold text-blue-700 tabular-nums">
              {((submission.correctCount / submission.totalQuestions) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Actions Button Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak / Unduh Hasil Ujian</span>
          </button>

          <button
            onClick={onResetToLogin}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda Ujian</span>
          </button>
        </div>
      </div>

      {/* Question Breakdown and Educational Explanations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Lembar Pembahasan Soal & Kunci Jawaban</span>
          </h2>
          <span className="text-xs text-slate-500">
            Klik nomor butir untuk membuka atau menutup pembahasan
          </span>
        </div>

        <div className="space-y-4">
          {activeQuestions.map((q) => {
            const studentChoice = submission.answers[q.id];
            const isCorrect = checkIsAnswerCorrect(studentChoice, q.correctAnswer, q.type, q.statements);
            const isExpanded = !!expandedSolutions[q.id];
            const pointsPerQ = Math.round((100 / activeQuestions.length) * 10) / 10;
            const studentStmtMap = parseStudentStatementMap(studentChoice);

            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(q.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {q.number}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {q.topicTitle}
                        </p>
                        {q.type === 'complex' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Kompleks
                          </span>
                        )}
                        {q.type === 'true_false' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Benar/Salah
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Jawaban Anda: <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>{formatAnswerText(studentChoice, q.type, q)}</strong> · Kunci: <strong className="text-slate-700">{formatAnswerText(q.correctAnswer, q.type, q)}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isCorrect ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Benar (+{pointsPerQ} pt)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Salah (0 pt)</span>
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/40">
                    {/* Multi-statement True/False Comparison Table */}
                    {q.type === 'true_false' && q.statements && q.statements.length > 0 && (
                      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Evaluasi Naskah Pernyataan:
                        </span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                              <tr>
                                <th className="py-2 px-3 w-8 text-center">No</th>
                                <th className="py-2 px-3">Naskah Pernyataan</th>
                                <th className="py-2 px-3 text-center">Jawaban Anda</th>
                                <th className="py-2 px-3 text-center">Kunci Jawaban</th>
                                <th className="py-2 px-3 text-center">Hasil</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {q.statements.map((stmt, sIdx) => {
                                const stAns = studentStmtMap[stmt.id];
                                const isStmtMatch = stAns?.toLowerCase() === stmt.correctAnswer.toLowerCase();
                                return (
                                  <tr key={stmt.id || sIdx}>
                                    <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                      {sIdx + 1}
                                    </td>
                                    <td className="py-2.5 px-3 font-medium text-slate-800">
                                      {stmt.text}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                          stAns === 'Benar'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : stAns === 'Salah'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        {stAns || '-'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                          stmt.correctAnswer === 'Benar'
                                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                            : 'bg-rose-50 border border-rose-200 text-rose-800'
                                        }`}
                                      >
                                        {stmt.correctAnswer}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {isStmtMatch ? (
                                        <span className="text-emerald-600 font-bold">✓ Tepat</span>
                                      ) : (
                                        <span className="text-rose-600 font-bold">✗ Keliru</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {/* Question image preview (if exists) */}
                    {q.imagePath ? (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                        <img
                          src={q.imagePath}
                          alt={`Soal ${q.number}`}
                          className="max-h-36 w-auto object-contain rounded border border-slate-100"
                        />
                        <div className="text-xs text-slate-700 space-y-1">
                          <p className="font-semibold text-slate-900">{q.questionPrompt}</p>
                          <p className="text-slate-500">Kategori: {q.category}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                        <p className="font-semibold text-slate-900">{q.questionPrompt}</p>
                        <p className="text-slate-500">Kategori: {q.category}</p>
                      </div>
                    )}

                      {/* Step-by-step Math Explanation */}
                      {q.explanation && (
                        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2.5 text-xs">
                          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-blue-700 uppercase tracking-wider">
                            <span>💡 Langkah Pembahasan Rinci</span>
                          </h4>
                          {q.explanation.summary && (
                            <p className="text-slate-600 font-medium">{q.explanation.summary}</p>
                          )}
                          {q.explanation.steps && q.explanation.steps.length > 0 && (
                            <ul className="space-y-1.5 text-slate-700">
                              {q.explanation.steps.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {q.explanation.finalResult && (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-semibold text-emerald-800">
                              <span>Kesimpulan Jawaban Benar:</span>
                              <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {q.explanation.finalResult}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
