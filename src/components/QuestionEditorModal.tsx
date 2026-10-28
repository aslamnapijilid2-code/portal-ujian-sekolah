import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  CheckSquare,
  CircleDot,
  Check,
} from 'lucide-react';
import { QuestionData, QuestionOption, QuestionType, TrueFalseStatement } from '../data/questions';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit: QuestionData | null;
  onSave: (savedQuestion: QuestionData) => void;
  nextNumber: number;
}

// Built-in image options from user attachments
const PRESET_IMAGES = [
  { label: 'Gambar 1 (Pengurangan 5 1/2 - 2 3/4 kg)', path: '/assets/aistudio/1_fb7d113c.JPG' },
  { label: 'Gambar 2 (Pecahan Biasa 17/6 Cokelat)', path: '/assets/aistudio/2_5761fc07.JPG' },
  { label: 'Gambar 3 (Pembagian 7 1/2 : 3/4 m Pita)', path: '/assets/aistudio/3_84172664.JPG' },
  { label: 'Gambar 4 (Penjumlahan 2 1/2 + 1 3/4 kg)', path: '/assets/aistudio/4_7049ace6.JPG' },
  { label: 'Gambar 5 (Pecahan Campuran 2 5/6 Cokelat)', path: '/assets/aistudio/5_46dd3318.JPG' },
  { label: 'Gambar 6 (Perkalian 6 2/5 * 5/8 ton Jagung)', path: '/assets/aistudio/6_c12d4f7b.JPG' },
  { label: 'Ilustrasi SDN 4 Sojol Utara (Ceria)', path: '/assets/aistudio/Lively_Indonesian_Schoolyard_Adventure_38642518.png' },
];

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  questionToEdit,
  onSave,
  nextNumber,
}) => {
  const isEditing = !!questionToEdit;

  // Question Type: 'single' | 'complex' | 'true_false'
  const [questionType, setQuestionType] = useState<QuestionType>('single');

  const [topicTitle, setTopicTitle] = useState('');
  const [category, setCategory] = useState('Literasi / Numerasi');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [hasContextCard, setHasContextCard] = useState(false);
  const [contextHeader, setContextHeader] = useState('KONTEKS MASALAH');
  const [contextStory, setContextStory] = useState('');
  const [imagePath, setImagePath] = useState<string>('');
  const [customImageUrl, setCustomImageUrl] = useState('');

  // 4 Options (for single and complex)
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');

  // Keys for Single Choice
  const [singleCorrectAnswer, setSingleCorrectAnswer] = useState<string>('A');

  // Keys for Complex Multiple Choice (e.g. ['A', 'C'])
  const [complexCorrectKeys, setComplexCorrectKeys] = useState<string[]>(['A', 'C']);

  // Key & Multi-statements for True / False
  const [tfCorrectAnswer, setTfCorrectAnswer] = useState<'Benar' | 'Salah'>('Benar');
  const [tfStatements, setTfStatements] = useState<TrueFalseStatement[]>([
    { id: 's1', text: '', correctAnswer: 'Benar' },
    { id: 's2', text: '', correctAnswer: 'Salah' },
  ]);

  // Explanation
  const [explanationSummary, setExplanationSummary] = useState('');
  const [explanationStepsText, setExplanationStepsText] = useState('');
  const [finalResultText, setFinalResultText] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  // Populate fields when editing or reset when adding
  useEffect(() => {
    if (questionToEdit) {
      // Determine question type
      let qType: QuestionType = questionToEdit.type || 'single';
      if (!questionToEdit.type) {
        if (
          questionToEdit.correctAnswer === 'Benar' ||
          questionToEdit.correctAnswer === 'Salah' ||
          (questionToEdit.statements && questionToEdit.statements.length > 0)
        ) {
          qType = 'true_false';
        } else if (questionToEdit.correctAnswer.includes(',')) {
          qType = 'complex';
        } else {
          qType = 'single';
        }
      }
      setQuestionType(qType);

      setTopicTitle(questionToEdit.topicTitle || '');
      setCategory(questionToEdit.category || 'Literasi / Numerasi');
      setQuestionPrompt(questionToEdit.questionPrompt || '');
      setHasContextCard(!!questionToEdit.hasContextCard);
      setContextHeader(questionToEdit.contextHeader || 'KONTEKS MASALAH');
      setContextStory(questionToEdit.contextStory || '');
      setImagePath(questionToEdit.imagePath || '');
      setCustomImageUrl(questionToEdit.imagePath?.startsWith('http') ? questionToEdit.imagePath : '');

      const optA = questionToEdit.options?.find((o) => o.key === 'A')?.text || '';
      const optB = questionToEdit.options?.find((o) => o.key === 'B')?.text || '';
      const optC = questionToEdit.options?.find((o) => o.key === 'C')?.text || '';
      const optD = questionToEdit.options?.find((o) => o.key === 'D')?.text || '';
      setOptionA(optA);
      setOptionB(optB);
      setOptionC(optC);
      setOptionD(optD);

      if (qType === 'true_false') {
        if (questionToEdit.statements && questionToEdit.statements.length > 0) {
          setTfStatements(questionToEdit.statements);
        } else {
          setTfStatements([
            {
              id: 's1',
              text: questionToEdit.questionPrompt || '',
              correctAnswer: questionToEdit.correctAnswer === 'Salah' ? 'Salah' : 'Benar',
            },
            {
              id: 's2',
              text: '',
              correctAnswer: 'Salah',
            },
          ]);
        }
        setTfCorrectAnswer(questionToEdit.correctAnswer === 'Salah' ? 'Salah' : 'Benar');
      } else if (qType === 'complex') {
        const keys = questionToEdit.correctAnswer
          .split(',')
          .map((k) => k.trim().toUpperCase())
          .filter(Boolean);
        setComplexCorrectKeys(keys.length > 0 ? keys : ['A']);
      } else {
        setSingleCorrectAnswer(questionToEdit.correctAnswer || 'A');
      }

      setExplanationSummary(questionToEdit.explanation?.summary || '');
      setExplanationStepsText(questionToEdit.explanation?.steps?.join('\n') || '');
      setFinalResultText(questionToEdit.explanation?.finalResult || '');
    } else {
      setQuestionType('single');
      setTopicTitle('');
      setCategory('Literasi / Numerasi');
      setQuestionPrompt('');
      setHasContextCard(false);
      setContextHeader('KONTEKS MASALAH');
      setContextStory('');
      setImagePath('');
      setCustomImageUrl('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setSingleCorrectAnswer('A');
      setComplexCorrectKeys(['A', 'C']);
      setTfCorrectAnswer('Benar');
      setTfStatements([
        { id: 's1', text: '', correctAnswer: 'Benar' },
        { id: 's2', text: '', correctAnswer: 'Salah' },
      ]);
      setExplanationSummary('');
      setExplanationStepsText('');
      setFinalResultText('');
    }
    setErrorMsg('');
  }, [questionToEdit, isOpen]);

  if (!isOpen) return null;

  // Toggle key for complex multiple choice
  const toggleComplexKey = (key: string) => {
    setComplexCorrectKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) {
          setErrorMsg('Pilihan ganda kompleks harus memiliki minimal 1 jawaban benar.');
          return prev;
        }
        setErrorMsg('');
        return prev.filter((k) => k !== key);
      } else {
        setErrorMsg('');
        return [...prev, key].sort();
      }
    });
  };

  // File Upload Handler (Base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Ukuran file gambar maksimal 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImagePath(reader.result);
          setErrorMsg('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // True/False multi-statement handlers
  const handleAddStatement = () => {
    const newId = 's' + (tfStatements.length + 1) + '_' + Date.now().toString().slice(-4);
    setTfStatements((prev) => [
      ...prev,
      { id: newId, text: '', correctAnswer: 'Benar' },
    ]);
  };

  const handleUpdateStatementText = (index: number, text: string) => {
    setTfStatements((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], text };
      return copy;
    });
  };

  const handleUpdateStatementAnswer = (index: number, correctAnswer: 'Benar' | 'Salah') => {
    setTfStatements((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], correctAnswer };
      return copy;
    });
  };

  const handleRemoveStatement = (index: number) => {
    if (tfStatements.length <= 1) {
      setErrorMsg('Minimal harus ada 1 naskah pernyataan untuk soal Benar / Salah.');
      return;
    }
    setErrorMsg('');
    setTfStatements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionPrompt.trim()) {
      setErrorMsg('Teks pertanyaan / petunjuk soal wajib diisi.');
      return;
    }

    let finalOptions: QuestionOption[] = [];
    let finalCorrectAnswer = '';
    let finalStatements: TrueFalseStatement[] | undefined = undefined;

    if (questionType === 'true_false') {
      if (tfStatements.length === 0) {
        setErrorMsg('Minimal harus ada 1 naskah pernyataan untuk soal Benar / Salah.');
        return;
      }
      for (let i = 0; i < tfStatements.length; i++) {
        if (!tfStatements[i].text.trim()) {
          setErrorMsg(`Kolom naskah pernyataan baris ke-${i + 1} wajib diisi.`);
          return;
        }
      }

      finalOptions = [
        { key: 'Benar', text: 'Benar' },
        { key: 'Salah', text: 'Salah' },
      ];

      finalStatements = tfStatements.map((s, idx) => ({
        id: s.id || `s${idx + 1}`,
        text: s.text.trim(),
        correctAnswer: s.correctAnswer,
      }));

      // Serialized string e.g. s1:Benar|s2:Salah
      finalCorrectAnswer = finalStatements.map((s) => `${s.id}:${s.correctAnswer}`).join('|');
    } else {
      if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
        setErrorMsg('Semua 4 pilihan jawaban (A, B, C, D) wajib diisi.');
        return;
      }

      finalOptions = [
        { key: 'A', text: optionA.trim(), fractionDisplay: optionA.trim() },
        { key: 'B', text: optionB.trim(), fractionDisplay: optionB.trim() },
        { key: 'C', text: optionC.trim(), fractionDisplay: optionC.trim() },
        { key: 'D', text: optionD.trim(), fractionDisplay: optionD.trim() },
      ];

      if (questionType === 'complex') {
        if (complexCorrectKeys.length === 0) {
          setErrorMsg('Tentukan minimal satu atau lebih jawaban benar untuk pilihan ganda kompleks.');
          return;
        }
        finalCorrectAnswer = [...complexCorrectKeys].sort().join(',');
      } else {
        finalCorrectAnswer = singleCorrectAnswer;
      }
    }

    const steps = explanationStepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const defaultSummary =
      questionType === 'true_false'
        ? `Kunci Jawaban Naskah Pernyataan: ${finalStatements
            ?.map((s, idx) => `[Pernyataan ${idx + 1}: ${s.correctAnswer}]`)
            .join(', ')}`
        : 'Pembahasan penyelesaian butir soal.';

    const defaultResult =
      questionType === 'true_false'
        ? `Evaluasi Pernyataan: ${finalStatements
            ?.map((s, idx) => `#${idx + 1} bernilai ${s.correctAnswer}`)
            .join('; ')}`
        : `Jawaban yang benar adalah: ${finalCorrectAnswer}.`;

    const savedData: QuestionData = {
      id: questionToEdit ? questionToEdit.id : Date.now(),
      number: questionToEdit ? questionToEdit.number : nextNumber,
      category: category.trim() || 'Literasi / Numerasi',
      topicTitle: topicTitle.trim() || `Soal Nomor ${questionToEdit ? questionToEdit.number : nextNumber}`,
      type: questionType,
      imagePath: imagePath.trim(),
      hasContextCard: hasContextCard && !!contextStory.trim(),
      contextHeader: contextHeader.trim() || 'KONTEKS MASALAH',
      contextStory: contextStory.trim(),
      questionPrompt: questionPrompt.trim(),
      options: finalOptions,
      correctAnswer: finalCorrectAnswer,
      statements: questionType === 'true_false' ? finalStatements : undefined,
      points: 16.67,
      explanation: {
        summary: explanationSummary.trim() || defaultSummary,
        steps: steps.length > 0 ? steps : ['Perhatikan konsep soal dan analisis setiap pernyataan atau pilihan secara teliti.'],
        finalResult: finalResultText.trim() || defaultResult,
      },
    };

    onSave(savedData);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {isEditing ? (
                <>
                  <span>Edit Butir Soal Nomor {questionToEdit.number}</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span>Tambah Butir Soal Baru (Nomor {nextNumber})</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Pilih tipe soal: Pilihan Ganda, Pilihan Ganda Kompleks, atau Soal Benar / Salah.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector Tipe Soal (Pilihan Ganda, Pilihan Ganda Kompleks, Benar/Salah) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tipe Butir Soal Ujian <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Type 1: Single */}
              <button
                type="button"
                onClick={() => setQuestionType('single')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  questionType === 'single'
                    ? 'border-blue-600 bg-blue-50/80 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">Pilihan Ganda</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      questionType === 'single' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {questionType === 'single' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  1 jawaban benar dari pilihan A, B, C, D
                </p>
              </button>

              {/* Type 2: Complex */}
              <button
                type="button"
                onClick={() => setQuestionType('complex')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  questionType === 'complex'
                    ? 'border-indigo-600 bg-indigo-50/80 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">Pilihan Ganda Kompleks</span>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      questionType === 'complex' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {questionType === 'complex' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Centang beberapa pilihan jawaban yang benar
                </p>
              </button>

              {/* Type 3: True / False */}
              <button
                type="button"
                onClick={() => setQuestionType('true_false')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  questionType === 'true_false'
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">Benar / Salah</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      questionType === 'true_false' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                    }`}
                  >
                    {questionType === 'true_false' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Siswa menentukan apakah pernyataan Benar / Salah
                </p>
              </button>
            </div>
          </div>

          {/* Topik & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Topik / Judul Butir Soal <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Contoh: Operasi Pecahan / Pemahaman Bacaan"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Materi
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Contoh: Numerasi / Literasi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pertanyaan / Soal Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teks Pertanyaan / Pernyataan Soal <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={questionPrompt}
              onChange={(e) => setQuestionPrompt(e.target.value)}
              placeholder={
                questionType === 'true_false'
                  ? 'Tuliskan pernyataan yang perlu dievaluasi siswa, contoh: Pecahan 2 1/2 nilainya setara dengan 5/2 batang cokelat.'
                  : 'Tuliskan pertanyaan lengkap untuk siswa...'
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Lampiran Gambar (Opsional) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Lampiran Gambar Soal (Opsional)</span>
              </label>
              {imagePath && (
                <button
                  type="button"
                  onClick={() => setImagePath('')}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                >
                  Hapus Gambar
                </button>
              )}
            </div>

            {/* Pilihan Gambar Preset atau Unggah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pilih Dari Koleksi Gambar:
                </label>
                <select
                  value={PRESET_IMAGES.some((p) => p.path === imagePath) ? imagePath : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setImagePath(e.target.value);
                      setErrorMsg('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Tanpa Gambar / Pilih Koleksi --</option>
                  {PRESET_IMAGES.map((preset) => (
                    <option key={preset.path} value={preset.path}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Atau Unggah Gambar Baru (JPG / PNG):
                </label>
                <label className="w-full px-3 py-1.5 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-lg text-xs text-slate-600 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Pilih File Dari Komputer</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Preview Gambar Terpilih */}
            {imagePath && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-3">
                <img
                  src={imagePath}
                  alt="Pratinjau soal"
                  className="h-20 w-auto object-contain rounded border border-slate-100 bg-white"
                />
                <div className="text-xs text-slate-600 truncate flex-1">
                  <span className="font-semibold text-emerald-700 block">✓ Gambar Terpasang</span>
                  <span className="text-[11px] text-slate-400 truncate block">{imagePath.slice(0, 50)}...</span>
                </div>
              </div>
            )}
          </div>

          {/* Konteks Cerita Tambahan (Opsional) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggleContext"
                checked={hasContextCard}
                onChange={(e) => setHasContextCard(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="toggleContext" className="text-xs font-bold text-slate-800 cursor-pointer">
                Sertakan Kotak Narasi / Konteks Cerita Soal (Opsional)
              </label>
            </div>

            {hasContextCard && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Judul Header Konteks
                  </label>
                  <input
                    type="text"
                    value={contextHeader}
                    onChange={(e) => setContextHeader(e.target.value)}
                    placeholder="Contoh: KONTEKS MASALAH"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Cerita / Skenario Soal
                  </label>
                  <textarea
                    rows={2}
                    value={contextStory}
                    onChange={(e) => setContextStory(e.target.value)}
                    placeholder="Contoh: Ibu memiliki persediaan 5 1/2 kg tepung terigu..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* KONTEN JAWABAN SESUAI TIPE SOAL */}

          {/* TIPE 1 & 2: PILIHAN GANDA BIASA ATAU KOMPLEKS */}
          {questionType !== 'true_false' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {questionType === 'complex'
                    ? 'Pilihan Jawaban & Centang Kunci Jawaban Benar (Kompleks)'
                    : 'Pilihan Ganda & Tentukan Kunci Jawaban Benar'} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {questionType === 'complex'
                    ? 'Centang satu atau lebih kotak pilihan yang bernilai benar'
                    : 'Pilih radio button untuk 1 kunci jawaban'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opsi A */}
                <div
                  className={`p-3 rounded-xl border-2 transition-all ${
                    questionType === 'complex'
                      ? complexCorrectKeys.includes('A')
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400/30'
                        : 'border-slate-200 bg-white'
                      : singleCorrectAnswer === 'A'
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        A
                      </span>
                      <span className="text-xs font-semibold text-slate-700">Pilihan A</span>
                    </div>

                    {questionType === 'complex' ? (
                      <label className="flex items-center gap-1.5 text-xs text-indigo-800 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={complexCorrectKeys.includes('A')}
                          onChange={() => toggleComplexKey('A')}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Kunci Benar</span>
                      </label>
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="singleCorrect"
                          checked={singleCorrectAnswer === 'A'}
                          onChange={() => setSingleCorrectAnswer('A')}
                          className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Kunci Jawaban</span>
                      </label>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="Tuliskan teks opsi A..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                {/* Opsi B */}
                <div
                  className={`p-3 rounded-xl border-2 transition-all ${
                    questionType === 'complex'
                      ? complexCorrectKeys.includes('B')
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400/30'
                        : 'border-slate-200 bg-white'
                      : singleCorrectAnswer === 'B'
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        B
                      </span>
                      <span className="text-xs font-semibold text-slate-700">Pilihan B</span>
                    </div>

                    {questionType === 'complex' ? (
                      <label className="flex items-center gap-1.5 text-xs text-indigo-800 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={complexCorrectKeys.includes('B')}
                          onChange={() => toggleComplexKey('B')}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Kunci Benar</span>
                      </label>
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="singleCorrect"
                          checked={singleCorrectAnswer === 'B'}
                          onChange={() => setSingleCorrectAnswer('B')}
                          className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Kunci Jawaban</span>
                      </label>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="Tuliskan teks opsi B..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                {/* Opsi C */}
                <div
                  className={`p-3 rounded-xl border-2 transition-all ${
                    questionType === 'complex'
                      ? complexCorrectKeys.includes('C')
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400/30'
                        : 'border-slate-200 bg-white'
                      : singleCorrectAnswer === 'C'
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        C
                      </span>
                      <span className="text-xs font-semibold text-slate-700">Pilihan C</span>
                    </div>

                    {questionType === 'complex' ? (
                      <label className="flex items-center gap-1.5 text-xs text-indigo-800 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={complexCorrectKeys.includes('C')}
                          onChange={() => toggleComplexKey('C')}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Kunci Benar</span>
                      </label>
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="singleCorrect"
                          checked={singleCorrectAnswer === 'C'}
                          onChange={() => setSingleCorrectAnswer('C')}
                          className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Kunci Jawaban</span>
                      </label>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="Tuliskan teks opsi C..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                {/* Opsi D */}
                <div
                  className={`p-3 rounded-xl border-2 transition-all ${
                    questionType === 'complex'
                      ? complexCorrectKeys.includes('D')
                        ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400/30'
                        : 'border-slate-200 bg-white'
                      : singleCorrectAnswer === 'D'
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        D
                      </span>
                      <span className="text-xs font-semibold text-slate-700">Pilihan D</span>
                    </div>

                    {questionType === 'complex' ? (
                      <label className="flex items-center gap-1.5 text-xs text-indigo-800 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={complexCorrectKeys.includes('D')}
                          onChange={() => toggleComplexKey('D')}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Kunci Benar</span>
                      </label>
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="singleCorrect"
                          checked={singleCorrectAnswer === 'D'}
                          onChange={() => setSingleCorrectAnswer('D')}
                          className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Kunci Jawaban</span>
                      </label>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="Tuliskan teks opsi D..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {questionType === 'complex' && (
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Kunci Jawaban Terpilih: <strong>{complexCorrectKeys.join(', ') || 'Belum dipilih'}</strong>. Siswa wajib mencentang pilihan-pilihan ini dengan tepat.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TIPE 3: SOAL BENAR / SALAH (DENGAN KOLOM NASKAH BISA LEBIH DARI SATU) */}
          {questionType === 'true_false' && (
            <div className="p-4 sm:p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                <div>
                  <label className="block text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Kolom Naskah Jawaban Benar / Salah ({tfStatements.length} Pernyataan)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Tuliskan naskah pernyataan di bawah ini. Guru dapat menambahkan <strong>lebih dari satu naskah pernyataan</strong> dan menentukan status <strong>BENAR</strong> atau <strong>SALAH</strong> pada tiap butir pernyataan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddStatement}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Naskah Pernyataan</span>
                </button>
              </div>

              {/* Daftar Baris Naskah Pernyataan */}
              <div className="space-y-3">
                {tfStatements.map((stmt, idx) => (
                  <div
                    key={stmt.id || idx}
                    className="p-3.5 bg-white rounded-xl border border-emerald-200/90 shadow-2xs space-y-2.5 transition-all hover:border-emerald-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs">
                          Naskah Pernyataan #{idx + 1}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Tentukan kunci evaluasi:
                        </span>
                      </div>

                      {tfStatements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStatement(idx)}
                          className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Hapus naskah pernyataan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Baris</span>
                        </button>
                      )}
                    </div>

                    {/* Kolom Naskah Teks Pernyataan */}
                    <div>
                      <textarea
                        rows={2}
                        required
                        value={stmt.text}
                        onChange={(e) => handleUpdateStatementText(idx, e.target.value)}
                        placeholder={`Tuliskan kalimat naskah pernyataan #${idx + 1} di sini...`}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      />
                    </div>

                    {/* Pilihan Kunci Jawaban: BENAR atau SALAH */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs font-bold text-slate-700">Kunci Jawaban:</span>
                      <div className="flex items-center gap-2">
                        {/* Tombol Benar */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatementAnswer(idx, 'Benar')}
                          className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            stmt.correctAnswer === 'Benar'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <span>✓ BENAR</span>
                        </button>

                        {/* Tombol Salah */}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatementAnswer(idx, 'Salah')}
                          className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            stmt.correctAnswer === 'Salah'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <span>✗ SALAH</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tombol Tambah Baris Pernyataan Bawah */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddStatement}
                  className="px-4 py-2 bg-white border border-dashed border-emerald-400 hover:border-emerald-600 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>+ Tambah Baris Naskah Pernyataan Lagi</span>
                </button>

                <span className="text-[11px] text-emerald-900 font-medium">
                  Total {tfStatements.length} naskah pernyataan aktif
                </span>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Format AKM/ANBK Literasi & Numerasi:</strong> Siswa akan disajikan tabel naskah pernyataan dan memilih opsi <strong>Benar</strong> atau <strong>Salah</strong> pada masing-masing baris naskah.
                </span>
              </div>
            </div>
          )}

          {/* Pembahasan & Solusi Soal */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Pembahasan & Solusi Soal (Untuk Siswa & Guru)</span>
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ringkasan Pembahasan
              </label>
              <input
                type="text"
                value={explanationSummary}
                onChange={(e) => setExplanationSummary(e.target.value)}
                placeholder="Contoh: Mengubah pecahan campuran menjadi pecahan biasa lalu menyederhanakan."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Langkah-langkah Penyelesaian (1 baris per langkah)
              </label>
              <textarea
                rows={3}
                value={explanationStepsText}
                onChange={(e) => setExplanationStepsText(e.target.value)}
                placeholder={'Langkah 1: Tuliskan informasi yang diketahui\nLangkah 2: Hitung operasi yang relevan\nLangkah 3: Tentukan hasil akhir'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Kesimpulan / Hasil Akhir
              </label>
              <input
                type="text"
                value={finalResultText}
                onChange={(e) => setFinalResultText(e.target.value)}
                placeholder="Contoh: Jadi, total tepung terigu adalah 4 1/4 kg."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan Soal' : 'Tambahkan ke Bank Soal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
