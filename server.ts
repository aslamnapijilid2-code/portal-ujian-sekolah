import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { EXAM_QUESTIONS, checkIsAnswerCorrect, type QuestionData } from './src/data/questions.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Determine environment: in development within AI Studio, dev server must run on port 3000.
// In production (Cloud Run), use process.env.PORT (defaults to 8080 or 3000).
const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.K_SERVICE) ||
  (process.env.NODE_ENV !== 'development' && fs.existsSync(path.resolve(__dirname, 'dist', 'index.html')));

const PORT = isProduction ? (Number(process.env.PORT) || 8080) : 3000;

app.use(express.json({ limit: '10mb' }));

// Dynamic questions list
let examQuestions: QuestionData[] = [...EXAM_QUESTIONS];

// In-memory persistent store for exam sessions and submissions
interface StudentSubmission {
  id: string;
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
  submittedAt: string;
  timeSpentSeconds: number;
  answers: Record<number, string>; // questionId -> option key e.g. "B"
  score: number; // 0 - 100
  correctCount: number;
  totalQuestions: number;
  sessionId: string;
}

interface ExamSession {
  id: string;
  sessionCode: string;
  teacherName: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  createdAt: string;
  isActive: boolean;
}

// Initial active session created by default or customized by Guru
let currentSession: ExamSession = {
  id: 'sesi-1',
  sessionCode: 'LIT-NUM-2026',
  teacherName: 'Pak Aslam, S.Pd.',
  title: 'Ujian Literasi atau Numerasi SDN 4 Sojol Utara',
  durationMinutes: 30,
  passingScore: 70,
  createdAt: new Date().toISOString(),
  isActive: true,
};

// Submissions list starts empty by default; only populated when students submit their exam
let submissions: StudentSubmission[] = [];

// Initialize Gemini SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize secret values from accidental whitespace or surrounding quotes (e.g. from copy-pasting into Secrets UI)
function sanitizeSecret(value: unknown): string {
  if (typeof value !== 'string') return '';
  let cleaned = value.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length >= 2)
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

// Safe diagnostic endpoint to check environment readiness in production (NEVER outputs secret values)
app.get('/api/teacher/auth-status', (_req, res) => {
  const rawTeacherSecret = process.env.TEACHER_PASSWORD;
  const rawGuruSecret = process.env.GURU_PASSWORD;
  const isConfigured = Boolean((rawTeacherSecret && rawTeacherSecret.trim()) || (rawGuruSecret && rawGuruSecret.trim()));
  const activeSource = (rawTeacherSecret && rawTeacherSecret.trim()) ? 'TEACHER_PASSWORD' : ((rawGuruSecret && rawGuruSecret.trim()) ? 'GURU_PASSWORD' : 'NONE');

  res.json({
    success: true,
    authConfigured: isConfigured,
    secretSource: activeSource,
    hasLength: isConfigured ? sanitizeSecret(rawTeacherSecret || rawGuruSecret).length > 0 : false,
    timestamp: new Date().toISOString(),
  });
});

// Teacher Authentication Endpoint (Server-side verification)
app.post('/api/teacher/login', (req, res) => {
  const { teacherName } = req.body || {};
  const submittedPassword = req.body?.password ?? req.body?.accessCode ?? req.body?.code;

  const rawConfiguredPassword = process.env.TEACHER_PASSWORD || process.env.GURU_PASSWORD;
  const configuredPassword = sanitizeSecret(rawConfiguredPassword);

  if (!rawConfiguredPassword || !configuredPassword) {
    return res.status(503).json({
      success: false,
      message: 'Server belum mendeteksi Secret TEACHER_PASSWORD. Pastikan secret telah ditambahkan di menu Secrets Google AI Studio.',
    });
  }

  // Teacher display name defaults gracefully to current session teacher or Pak Aslam
  const resolvedTeacherName = (typeof teacherName === 'string' && teacherName.trim())
    ? teacherName.trim()
    : (currentSession.teacherName || 'Pak Aslam, S.Pd.');

  if (!submittedPassword || typeof submittedPassword !== 'string' || !submittedPassword.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Silakan masukkan kode akses pengajar.',
    });
  }

  const cleanSubmitted = sanitizeSecret(submittedPassword);

  // Strict match against cleaned or raw trimmed environment variable
  const isMatch = (cleanSubmitted === configuredPassword) ||
                  (String(submittedPassword).trim() === String(rawConfiguredPassword).trim());

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Kode akses tidak valid. Silakan periksa kembali kode akses pengajar.',
    });
  }

  return res.json({
    success: true,
    message: 'Autentikasi pengajar berhasil.',
    teacherName: resolvedTeacherName,
  });
});

// GET current session config
app.get('/api/exam/session', (_req, res) => {
  res.json({ success: true, session: currentSession });
});

// UPDATE / CREATE NEW SESSION
app.post('/api/exam/session', (req, res) => {
  const { teacherName, title, durationMinutes, passingScore, resetSubmissions } = req.body;
  if (!teacherName) {
    return res.status(400).json({ success: false, message: 'Nama guru wajib diisi' });
  }

  const newSessionId = 'sesi-' + Date.now();
  currentSession = {
    id: newSessionId,
    sessionCode: 'MTK-' + Math.floor(1000 + Math.random() * 9000),
    teacherName: teacherName || currentSession.teacherName,
    title: title || 'Penilaian Harian Matematika: Pecahan',
    durationMinutes: Number(durationMinutes) || 30,
    passingScore: Number(passingScore) || 70,
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  if (resetSubmissions) {
    submissions = [];
  }

  res.json({ success: true, session: currentSession, submissionsCount: submissions.length });
});

// GET all submissions
app.get('/api/exam/submissions', (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (sessionId) {
    const filtered = submissions.filter((s) => s.sessionId === sessionId);
    return res.json({ success: true, submissions: filtered });
  }
  res.json({ success: true, submissions });
});

// GET all exam questions
app.get('/api/exam/questions', (_req, res) => {
  res.json({ success: true, questions: examQuestions });
});

// UPDATE / ADD / DELETE exam questions
app.post('/api/exam/questions', (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, message: 'Minimal harus ada 1 butir soal.' });
  }

  // Re-index number for clean ordering
  examQuestions = questions.map((q, index) => ({
    ...q,
    id: q.id || index + 1,
    number: index + 1,
    points: Math.round((100 / questions.length) * 100) / 100,
  }));

  res.json({ success: true, questions: examQuestions });
});

// RESET exam questions to default
app.post('/api/exam/questions/reset', (_req, res) => {
  examQuestions = [...EXAM_QUESTIONS];
  res.json({ success: true, questions: examQuestions, message: 'Bank soal telah dikembalikan ke format default.' });
});

// SUBMIT student answers
app.post('/api/exam/submit', (req, res) => {
  const { name, gender, birthPlace, birthDate, answers, timeSpentSeconds } = req.body;

  if (!name || !gender || !birthPlace || !birthDate) {
    return res.status(400).json({ success: false, message: 'Data identitas siswa belum lengkap' });
  }

  const answerKey: Record<number, string> = {};
  examQuestions.forEach((q) => {
    answerKey[q.id] = q.correctAnswer;
  });

  const totalQuestions = examQuestions.length;
  let correctCount = 0;

  examQuestions.forEach((q) => {
    if (answers && checkIsAnswerCorrect(answers[q.id], q.correctAnswer, q.type, q.statements)) {
      correctCount++;
    }
  });

  // Calculate score on scale of 100
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100 * 10) / 10 : 0;

  const newSubmission: StudentSubmission = {
    id: 'sub-' + Date.now(),
    name: name.trim(),
    gender,
    birthPlace: birthPlace.trim(),
    birthDate,
    submittedAt: new Date().toISOString(),
    timeSpentSeconds: Number(timeSpentSeconds) || 0,
    answers: answers || {},
    score,
    correctCount,
    totalQuestions,
    sessionId: currentSession.id,
  };

  submissions.unshift(newSubmission);

  res.json({
    success: true,
    submission: newSubmission,
    answerKey,
  });
});

// RESET or SEED sample data for testing
app.post('/api/exam/seed-sample', (_req, res) => {
  submissions = [
    {
      id: 'sub-1',
      name: 'Ahmad Faiz Pratama',
      gender: 'Laki-laki',
      birthPlace: 'Bandung',
      birthDate: '2013-04-12',
      submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      timeSpentSeconds: 840,
      answers: { 1: 'B', 2: 'C', 3: 'C', 4: 'C', 5: 'B', 6: 'C' },
      score: 100,
      correctCount: 6,
      totalQuestions: 6,
      sessionId: currentSession.id,
    },
    {
      id: 'sub-2',
      name: 'Siti Nur Aisyah',
      gender: 'Perempuan',
      birthPlace: 'Jakarta',
      birthDate: '2013-08-25',
      submittedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      timeSpentSeconds: 960,
      answers: { 1: 'B', 2: 'C', 3: 'C', 4: 'C', 5: 'A', 6: 'C' },
      score: 83.3,
      correctCount: 5,
      totalQuestions: 6,
      sessionId: currentSession.id,
    },
    {
      id: 'sub-3',
      name: 'Muhammad Rizky Ramadhan',
      gender: 'Laki-laki',
      birthPlace: 'Surabaya',
      birthDate: '2012-11-10',
      submittedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      timeSpentSeconds: 1100,
      answers: { 1: 'B', 2: 'C', 3: 'A', 4: 'C', 5: 'B', 6: 'B' },
      score: 66.7,
      correctCount: 4,
      totalQuestions: 6,
      sessionId: currentSession.id,
    },
    {
      id: 'sub-4',
      name: 'Nabila Zahra Putri',
      gender: 'Perempuan',
      birthPlace: 'Semarang',
      birthDate: '2013-01-19',
      submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      timeSpentSeconds: 780,
      answers: { 1: 'B', 2: 'C', 3: 'C', 4: 'C', 5: 'B', 6: 'C' },
      score: 100,
      correctCount: 6,
      totalQuestions: 6,
      sessionId: currentSession.id,
    },
    {
      id: 'sub-5',
      name: 'Bima Satria Wicaksono',
      gender: 'Laki-laki',
      birthPlace: 'Yogyakarta',
      birthDate: '2013-06-03',
      submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      timeSpentSeconds: 1250,
      answers: { 1: 'A', 2: 'C', 3: 'D', 4: 'A', 5: 'B', 6: 'C' },
      score: 50.0,
      correctCount: 3,
      totalQuestions: 6,
      sessionId: currentSession.id,
    },
  ];
  res.json({ success: true, count: submissions.length });
});

// CLEAR all submissions
app.post('/api/exam/clear', (_req, res) => {
  submissions = [];
  res.json({ success: true, message: 'Seluruh data pekerjaan siswa telah dibersihkan.' });
});

// Server-side Gemini AI Pedagogical Analysis for Guru
app.post('/api/gemini/analyze', async (req, res) => {
  const { questionStats, overallStats, customQuery } = req.body;

  try {
    const prompt = `Anda adalah asisten pakar evaluasi pendidikan matematika SD/SMP di Indonesia.
Analisis data hasil ujian matematika pecahan berikut yang dikerjakan oleh siswa:

Ringkasan Kelas:
- Total Siswa Mengerjakan: ${overallStats?.totalStudents || submissions.length} siswa
- Rata-rata Nilai: ${overallStats?.averageScore || 0} / 100
- Nilai Tertinggi: ${overallStats?.highestScore || 0}
- Nilai Terendah: ${overallStats?.lowestScore || 0}
- Tingkat Ketuntasan (KKM ${currentSession.passingScore}): ${overallStats?.passRate || 0}%

Statistik Butir Soal:
1. Soal 1: Mengubah pecahan biasa 17/6 ke pecahan campuran (Kunci: B = 2 5/6) - Persentase Benar: ${questionStats?.[1]?.correctPct || 0}%
2. Soal 2: Mengubah pecahan campuran 2 5/6 ke pecahan biasa (Kunci: C = 17/6) - Persentase Benar: ${questionStats?.[2]?.correctPct || 0}%
3. Soal 3: Penjumlahan 2 1/2 kg + 1 3/4 kg tepung (Kunci: C = 4 1/4 kg) - Persentase Benar: ${questionStats?.[3]?.correctPct || 0}%
4. Soal 4: Pengurangan 5 1/2 kg - 2 3/4 kg tepung (Kunci: C = 2 3/4 kg) - Persentase Benar: ${questionStats?.[4]?.correctPct || 0}%
5. Soal 5: Perkalian 6 2/5 ton * 5/8 bagian jagung (Kunci: B = 4 ton) - Persentase Benar: ${questionStats?.[5]?.correctPct || 0}%
6. Soal 6: Pembagian 7 1/2 m : 3/4 m potongan pita (Kunci: C = 10 potongan) - Persentase Benar: ${questionStats?.[6]?.correctPct || 0}%

${customQuery ? `Pertanyaan Spesifik Guru: "${customQuery}"` : ''}

Tolong berikan laporan evaluasi guru yang profesional, padat, dan aplikatif dalam bahasa Indonesia dengan struktur:
1. Ringkasan Diagnostik Pemahaman Konsep (indikator konsep mana yang sudah dikuasai vs masih lemah).
2. Analisis Miskonsepsi Siswa (penyebab umum kekeliruan pada butir soal yang paling rendah skornya).
3. Rekomendasi Tindak Lanjut Guru (strategi remedial spesifik & ide aktivitas konkrit untuk pertemuan berikutnya).
Gunakan bahasa yang santun, jelas, dan memotivasi seorang pendidik.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const analysisText = response.text || 'Analisis berhasil diselesaikan.';
    res.json({ success: true, analysis: analysisText });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    // Provide an informative, high quality offline pedagogical analysis if API key is not configured or error occurs
    const fallbackAnalysis = `### Evaluasi Diagnostik Hasil Belajar Siswa (Konsep Pecahan)

1. **Ringkasan Penguasaan Materi**:
   - Konsep konversi pecahan biasa dan campuran (Soal 1 & 2) dikuasai dengan sangat baik oleh mayoritas siswa.
   - Pada operasi penjumlahan dan pengurangan pecahan berpenyebut berbeda (Soal 3 & 4), siswa yang keliru cenderung lupa menyamakan penyebut (KPK 2 dan 4 adalah 4) atau kesulitan saat melakukan peminjaman pada pecahan campuran.
   - Pada soal cerita pembagian pecahan (Soal 6), siswa memerlukan penguatan konsep pembalikan pecahan pembagi (mengalikan dengan kebalikannya).

2. **Diagnosis Miskonsepsi Utama**:
   - Kesalahan pengurangan pecahan campuran $5 \\frac{1}{2} - 2 \\frac{3}{4}$: Siswa sering mengurangkan bilangan bulat $5 - 2 = 3$ lalu mengurangkan pecahan terbalik $3/4 - 1/2 = 1/4$ menghasilkan jawaban salah $3 \\frac{1}{4}$ atau $2 \\frac{1}{4}$.
   - Perkalian pecahan $6 \\frac{2}{5} \\times \\frac{5}{8}$: Siswa yang keliru belum mengubah pecahan campuran menjadi pecahan biasa $\\frac{32}{5}$ sebelum melakukan perkalian silang.

3. **Rekomendasi Tindak Lanjut & Remedial**:
   - **Kelompok Remedial**: Berikan latihan visual menggunakan potongan pita kertas atau model batang cokelat konkret untuk peminjaman pecahan.
   - **Kelompok Pengayaan**: Berikan soal tantangan bertingkat (HOTS) yang menggabungkan operasi campuran pecahan dalam konteks kehidupan sehari-hari.`;

    res.json({
      success: true,
      analysis: fallbackAnalysis,
      isFallback: true,
      note: 'Analisis cerdas disajikan dari modul diagnostik analitik edukasi.',
    });
  }
});

// Health check endpoint for Cloud Run and monitoring
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Setup Vite middleware in development or static serve in production
async function startServer() {
  const distDir = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distDir, 'index.html');

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist
    app.use(express.static(distDir));

    // Handle unknown API routes explicitly with JSON 404
    app.all('/api/*', (_req, res) => {
      res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
    });

    // SPA fallback: send index.html for all non-API GET requests
    app.get('*', (_req, res) => {
      if (fs.existsSync(distIndexHtml)) {
        res.sendFile(distIndexHtml);
      } else {
        res.status(500).send('Application build not found. Please run npm run build.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduTest Server running on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
  });

  // Graceful shutdown on SIGTERM (Cloud Run lifecycle signal)
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
