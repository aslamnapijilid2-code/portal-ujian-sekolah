import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  ZoomIn,
  LayoutGrid,
  Send,
  X,
  Check,
  CheckSquare,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { EXAM_QUESTIONS, QuestionData } from '../data/questions';
import { StudentProfile, ExamSessionConfig } from '../types/exam';
import { ImageModal } from './ImageModal';

interface StudentExamRoomProps {
  profile: StudentProfile;
  sessionConfig: ExamSessionConfig;
  questions?: QuestionData[];
  onSubmitExam: (answers: Record<number, string>, timeSpentSeconds: number) => void;
}

export const StudentExamRoom: React.FC<StudentExamRoomProps> = ({
  profile,
  sessionConfig,
  questions,
  onSubmitExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hesitantQuestions, setHesitantQuestions] = useState<Record<number, boolean>>({});
  const [totalSeconds, setTotalSeconds] = useState(sessionConfig.durationMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; title: string } | null>(null);

  // References to preserve latest state inside timer interval callback
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const elapsedSecondsRef = useRef(elapsedSeconds);
  elapsedSecondsRef.current = elapsedSeconds;

  const onSubmitExamRef = useRef(onSubmitExam);
  onSubmitExamRef.current = onSubmitExam;

  const activeQuestions = questions && questions.length > 0 ? questions : EXAM_QUESTIONS;
  const currentQuestion: QuestionData = activeQuestions[currentIndex] || activeQuestions[0];
  const totalQuestions = activeQuestions.length;

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit when time runs out with up-to-date answers and elapsed time
          setIsSubmitModalOpen(false);
          onSubmitExamRef.current(answersRef.current, elapsedSecondsRef.current + 1);
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectSingle = (key: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: key,
    }));
  };

  const handleToggleComplex = (key: string) => {
    setAnswers((prev) => {
      const current = prev[currentQuestion.id] || '';
      const selected = current
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      let updated: string[];
      if (selected.includes(key)) {
        updated = selected.filter((k) => k !== key);
      } else {
        updated = [...selected, key].sort();
      }
      return {
        ...prev,
        [currentQuestion.id]: updated.join(','),
      };
    });
  };

  const handleSelectTrueFalse = (val: 'Benar' | 'Salah') => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: val,
    }));
  };

  const handleSelectStatementAnswer = (statementId: string, value: 'Benar' | 'Salah') => {
    setAnswers((prev) => {
      const raw = prev[currentQuestion.id] || '';
      let currentMap: Record<string, string> = {};
      try {
        if (raw.startsWith('{')) {
          currentMap = JSON.parse(raw);
        } else if (raw.includes(':')) {
          raw.split('|').forEach((part) => {
            const [id, val] = part.split(':');
            if (id && val) currentMap[id.trim()] = val.trim();
          });
        }
      } catch {
        currentMap = {};
      }

      currentMap[statementId] = value;
      return {
        ...prev,
        [currentQuestion.id]: JSON.stringify(currentMap),
      };
    });
  };

  const getStatementAnswer = (statementId: string): string | undefined => {
    const raw = answers[currentQuestion.id];
    if (!raw) return undefined;
    try {
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        return parsed[statementId];
      } else if (raw.includes(':')) {
        const parts = raw.split('|');
        for (const p of parts) {
          const [id, val] = p.split(':');
          if (id?.trim() === statementId) return val?.trim();
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  const isQuestionAnswered = (q: QuestionData): boolean => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.type === 'true_false' && q.statements && q.statements.length > 0) {
      let map: Record<string, string> = {};
      try {
        if (ans.startsWith('{')) {
          map = JSON.parse(ans);
        } else {
          ans.split('|').forEach((p) => {
            const [id, val] = p.split(':');
            if (id && val) map[id.trim()] = val.trim();
          });
        }
        return q.statements.every((s) => map[s.id] === 'Benar' || map[s.id] === 'Salah');
      } catch {
        return false;
      }
    }
    return true;
  };

  const toggleHesitant = () => {
    setHesitantQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const answeredCount = activeQuestions.filter((q) => isQuestionAnswered(q)).length;
  const isTimeCritical = totalSeconds < 300; // < 5 minutes
  const isTimeUrgent = totalSeconds < 60; // < 1 minute

  const handleFinalSubmit = () => {
    setIsSubmitModalOpen(false);
    onSubmitExam(answers, elapsedSeconds);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex flex-col justify-between">
      {/* Top Exam Action Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: Candidate info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {profile.name}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {profile.gender} · {profile.birthPlace}
              </p>
            </div>
          </div>

          {/* Middle: Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border tabular-nums transition-colors ${
              isTimeUrgent
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse font-bold'
                : isTimeCritical
                ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-800 font-medium'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-600' : 'text-blue-600'}`} />
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider block text-slate-400 font-sans leading-none">
                Sisa Waktu
              </span>
              <span className="text-sm sm:text-base font-mono font-bold leading-tight">
                {formatTimer(totalSeconds)}
              </span>
            </div>
          </div>

          {/* Right: Question menu toggle & finish CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Menu Soal</span>
              <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                {answeredCount}/{totalQuestions}
              </span>
            </button>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Selesai Ujian</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Exam Stage */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Body (Col 1-8/9) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-5">
            {/* Question Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-md">
                    Soal Nomor {currentQuestion.number} dari {totalQuestions}
                  </span>
                  {currentQuestion.type === 'complex' && (
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] rounded-md">
                      Pilihan Ganda Kompleks
                    </span>
                  )}
                  {currentQuestion.type === 'true_false' && (
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] rounded-md">
                      Benar / Salah
                    </span>
                  )}
                  {(!currentQuestion.type || currentQuestion.type === 'single') && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-md">
                      Pilihan Ganda
                    </span>
                  )}
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    · {currentQuestion.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleHesitant}
                    className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hesitantQuestions[currentQuestion.id]
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${hesitantQuestions[currentQuestion.id] ? 'fill-amber-600 text-amber-600' : 'text-slate-400'}`} />
                    <span>{hesitantQuestions[currentQuestion.id] ? 'Ragu-ragu (Ditandai)' : 'Tandai Ragu-ragu'}</span>
                  </button>
                </div>
              </div>

              {/* Question Image (if attached) */}
              {currentQuestion.imagePath ? (
                <div className="relative group bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200 flex flex-col items-center justify-center">
                  <div className="w-full flex items-center justify-between mb-2 text-xs text-slate-500">
                    <span className="font-medium">Lampiran Gambar Soal:</span>
                    <button
                      onClick={() =>
                        setZoomedImage({
                          src: currentQuestion.imagePath,
                          title: `Gambar Soal Nomor ${currentQuestion.number}`,
                        })
                      }
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Perbesar Gambar</span>
                    </button>
                  </div>
                  <img
                    src={currentQuestion.imagePath}
                    alt={`Soal nomor ${currentQuestion.number}`}
                    className="max-h-72 w-auto object-contain rounded-md border border-slate-200 shadow-xs bg-white cursor-zoom-in"
                    onClick={() =>
                      setZoomedImage({
                        src: currentQuestion.imagePath,
                        title: `Gambar Soal Nomor ${currentQuestion.number}`,
                      })
                    }
                  />
                </div>
              ) : null}

              {/* Context Problem Card (if available, e.g. for questions with contextual scenario) */}
              {currentQuestion.hasContextCard && currentQuestion.contextStory && (
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <span>📋 {currentQuestion.contextHeader || 'KONTEKS MASALAH'}</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {currentQuestion.contextStory}
                  </p>
                  {currentQuestion.pins && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentQuestion.pins.map((pin, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs flex items-center gap-1.5"
                        >
                          <span className="text-rose-500">📌</span>
                          <span>{pin.label}:</span>
                          <span className="text-blue-700 font-bold">{pin.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Explicit Question Prompt */}
              <div className="pt-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {currentQuestion.questionPrompt}
                </h3>
              </div>

              {/* OPTIONS ACCORDING TO QUESTION TYPE */}

              {/* 1. SOAL BENAR / SALAH */}
              {currentQuestion.type === 'true_false' ? (
                <div className="space-y-4 pt-3">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {currentQuestion.statements && currentQuestion.statements.length > 0
                        ? 'Tentukan apakah setiap naskah pernyataan di bawah ini bernilai Benar atau Salah.'
                        : 'Tentukan apakah pernyataan pada soal di atas bernilai Benar atau Salah.'}
                    </span>
                  </div>

                  {/* Multi-statement True/False Matrix Table */}
                  {currentQuestion.statements && currentQuestion.statements.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-3 sm:px-4 w-12 text-center">No</th>
                              <th className="py-3 px-3 sm:px-4">Naskah Pernyataan</th>
                              <th className="py-3 px-3 sm:px-4 w-44 sm:w-56 text-center">Pilihan Jawaban</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentQuestion.statements.map((stmt, idx) => {
                              const selectedAnswer = getStatementAnswer(stmt.id);
                              return (
                                <tr
                                  key={stmt.id || idx}
                                  className={`transition-colors ${
                                    selectedAnswer ? 'bg-emerald-50/20' : 'hover:bg-slate-50/60'
                                  }`}
                                >
                                  <td className="py-4 px-3 sm:px-4 text-center font-bold text-slate-500">
                                    {idx + 1}
                                  </td>
                                  <td className="py-4 px-3 sm:px-4">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                                      {stmt.text}
                                    </p>
                                  </td>
                                  <td className="py-4 px-3 sm:px-4">
                                    <div className="flex items-center justify-center gap-2">
                                      {/* Tombol BENAR */}
                                      <button
                                        type="button"
                                        onClick={() => handleSelectStatementAnswer(stmt.id, 'Benar')}
                                        className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                          selectedAnswer === 'Benar'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                                        }`}
                                      >
                                        <span>✓ BENAR</span>
                                      </button>

                                      {/* Tombol SALAH */}
                                      <button
                                        type="button"
                                        onClick={() => handleSelectStatementAnswer(stmt.id, 'Salah')}
                                        className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                          selectedAnswer === 'Salah'
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                                        }`}
                                      >
                                        <span>✗ SALAH</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Fallback Single True/False Buttons */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Tombol BENAR */}
                      <button
                        type="button"
                        onClick={() => handleSelectTrueFalse('Benar')}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-left ${
                          answers[currentQuestion.id] === 'Benar'
                            ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 font-bold shadow-sm ring-2 ring-emerald-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                              answers[currentQuestion.id] === 'Benar'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            ✓
                          </div>
                          <div>
                            <span className="block font-extrabold text-base sm:text-lg">BENAR</span>
                            <span className="text-xs text-slate-500 font-normal">Pernyataan ini Benar</span>
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            answers[currentQuestion.id] === 'Benar'
                              ? 'border-emerald-600 bg-emerald-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {answers[currentQuestion.id] === 'Benar' && (
                            <span className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </div>
                      </button>

                      {/* Tombol SALAH */}
                      <button
                        type="button"
                        onClick={() => handleSelectTrueFalse('Salah')}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-left ${
                          answers[currentQuestion.id] === 'Salah'
                            ? 'border-rose-600 bg-rose-50/90 text-rose-950 font-bold shadow-sm ring-2 ring-rose-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                              answers[currentQuestion.id] === 'Salah'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            ✗
                          </div>
                          <div>
                            <span className="block font-extrabold text-base sm:text-lg">SALAH</span>
                            <span className="text-xs text-slate-500 font-normal">Pernyataan ini Salah</span>
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            answers[currentQuestion.id] === 'Salah'
                              ? 'border-rose-600 bg-rose-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {answers[currentQuestion.id] === 'Salah' && (
                            <span className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : currentQuestion.type === 'complex' ? (
                /* 2. PILIHAN GANDA KOMPLEKS (CHECKBOXES) */
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Pilihan Ganda Kompleks:</strong> Kamu dapat mencentang lebih dari satu pilihan jawaban yang benar.
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {currentQuestion.options.map((option) => {
                      const selectedKeys = (answers[currentQuestion.id] || '')
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean);
                      const isSelected = selectedKeys.includes(option.key);

                      return (
                        <button
                          key={option.key}
                          onClick={() => handleToggleComplex(option.key)}
                          type="button"
                          className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4 cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 text-slate-900 shadow-xs ring-1 ring-indigo-400/30'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {option.key}
                            </span>
                            <span className="text-sm sm:text-base font-semibold text-slate-800">
                              {option.text}
                            </span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 3. PILIHAN GANDA BIASA (SINGLE CHOICE) */
                <div className="space-y-3 pt-2">
                  {currentQuestion.options.map((option) => {
                    const isSelected = answers[currentQuestion.id] === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => handleSelectSingle(option.key)}
                        type="button"
                        className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-slate-900 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {option.key}
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-slate-800">
                            {option.text}
                          </span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Question Navigation Controls */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Soal Sebelumnya</span>
              </button>

              <div className="text-xs text-slate-500 font-medium">
                Nomor <strong className="text-slate-800">{currentIndex + 1}</strong> dari {totalQuestions}
              </div>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Soal Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>Selesaikan Ujian</span>
                </button>
              )}
            </div>
          </div>

          {/* Question Palette Sidebar (Col 9-12 on desktop, or popup modal on mobile) */}
          <div
            className={`lg:col-span-4 xl:col-span-3 ${
              isPaletteOpen
                ? 'fixed inset-0 z-50 p-4 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center lg:static lg:p-0 lg:bg-transparent lg:block'
                : 'hidden lg:block'
            }`}
          >
            <div
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs w-full max-w-md lg:max-w-none space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <span>Menu Navigasi Soal</span>
                </div>
                <button
                  onClick={() => setIsPaletteOpen(false)}
                  className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {activeQuestions.map((q, idx) => {
                  const isAnswered = isQuestionAnswered(q);
                  const isHesitant = !!hesitantQuestions[q.id];
                  const isCurrent = currentIndex === idx;

                  let btnStyle = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
                  if (isHesitant) {
                    btnStyle = 'border-amber-400 bg-amber-50 text-amber-900 font-bold';
                  } else if (isAnswered) {
                    btnStyle = 'border-blue-600 bg-blue-600 text-white font-bold';
                  }

                  let displayLabel = '-';
                  if (isAnswered) {
                    if (q.type === 'true_false' && q.statements && q.statements.length > 0) {
                      displayLabel = 'B/S';
                    } else if (answers[q.id]) {
                      displayLabel = answers[q.id];
                    }
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsPaletteOpen(false);
                      }}
                      className={`relative p-3 rounded-lg border text-xs text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${btnStyle} ${
                        isCurrent ? 'ring-2 ring-offset-2 ring-blue-600' : ''
                      }`}
                    >
                      <span className="font-bold text-sm leading-none">{q.number}</span>
                      <span className="text-[10px] leading-tight opacity-90 truncate max-w-full">
                        {displayLabel}
                      </span>
                      {isHesitant && (
                        <Flag className="w-2.5 h-2.5 fill-amber-500 text-amber-500 absolute top-1 right-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-600" />
                  <span>Sudah Terjawab ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400" />
                  <span>Ditandai Ragu-ragu ({Object.values(hesitantQuestions).filter(Boolean).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300" />
                  <span>Belum Dijawab ({totalQuestions - answeredCount})</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => {
                    setIsPaletteOpen(false);
                    setIsSubmitModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Selesaikan & Kirim Jawaban</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Submit Exam */}
      {isSubmitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Selesaikan Ujian
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kembali rekapitulasi pengerjaan Anda.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Soal Terjawab:</span>
                <strong className="text-blue-700 font-bold">{answeredCount} dari {totalQuestions} Soal</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Soal Belum Terjawab:</span>
                <strong className={totalQuestions - answeredCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                  {totalQuestions - answeredCount} Soal
                </strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Soal Ragu-ragu:</span>
                <strong className="text-amber-600 font-bold">
                  {Object.values(hesitantQuestions).filter(Boolean).length} Soal
                </strong>
              </div>
              <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200">
                <span>Waktu Terpakai:</span>
                <span className="font-mono text-slate-800">{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            {totalQuestions - answeredCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Masih ada soal yang belum dijawab. Yakin ingin mengakhiri sekarang?</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Kembali Memeriksa
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Ya, Selesai Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {zoomedImage && (
        <ImageModal
          isOpen={!!zoomedImage}
          onClose={() => setZoomedImage(null)}
          imageSrc={zoomedImage.src}
          title={zoomedImage.title}
        />
      )}
    </div>
  );
};
