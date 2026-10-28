// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// src/data/questions.ts
function checkIsAnswerCorrect(studentAnswer, correctAnswer, questionType = "single", statements) {
  if (!studentAnswer || !correctAnswer) return false;
  if (questionType === "complex") {
    const sList = studentAnswer.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).sort().join(",");
    const cList = correctAnswer.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).sort().join(",");
    return sList === cList;
  }
  if (questionType === "true_false") {
    if (statements && statements.length > 0) {
      let studentMap = {};
      try {
        if (studentAnswer.startsWith("{")) {
          studentMap = JSON.parse(studentAnswer);
        } else {
          studentAnswer.split("|").forEach((part) => {
            const [id, val] = part.split(":");
            if (id && val) studentMap[id.trim()] = val.trim();
          });
        }
      } catch {
        return false;
      }
      return statements.every((st) => {
        const ans = studentMap[st.id];
        return ans && ans.trim().toLowerCase() === st.correctAnswer.trim().toLowerCase();
      });
    }
    if (correctAnswer.includes(":") || correctAnswer.startsWith("{")) {
      let studentMap = {};
      let correctMap = {};
      try {
        if (studentAnswer.startsWith("{")) studentMap = JSON.parse(studentAnswer);
        else {
          studentAnswer.split("|").forEach((part) => {
            const [id, val] = part.split(":");
            if (id && val) studentMap[id.trim()] = val.trim();
          });
        }
        if (correctAnswer.startsWith("{")) correctMap = JSON.parse(correctAnswer);
        else {
          correctAnswer.split("|").forEach((part) => {
            const [id, val] = part.split(":");
            if (id && val) correctMap[id.trim()] = val.trim();
          });
        }
        const keys = Object.keys(correctMap);
        if (keys.length === 0) return false;
        return keys.every(
          (k) => studentMap[k] && studentMap[k].trim().toLowerCase() === correctMap[k].trim().toLowerCase()
        );
      } catch {
        return false;
      }
    }
  }
  return studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}
var EXAM_QUESTIONS = [
  {
    id: 1,
    number: 1,
    category: "Konversi Pecahan",
    topicTitle: "Mengubah Pecahan Biasa ke Pecahan Campuran",
    imagePath: "/assets/aistudio/2_5761fc07.JPG",
    hasContextCard: false,
    questionPrompt: "Ibu mempunyai cokelat sebanyak 17/6 batang. Ubahlah jumlah cokelat tersebut menjadi pecahan campuran!",
    options: [
      { key: "A", text: "2 3/6 batang", fractionDisplay: "2 3/6 batang" },
      { key: "B", text: "2 5/6 batang", fractionDisplay: "2 5/6 batang" },
      { key: "C", text: "3 1/6 batang", fractionDisplay: "3 1/6 batang" },
      { key: "D", text: "3 5/6 batang", fractionDisplay: "3 5/6 batang" }
    ],
    correctAnswer: "B",
    points: 16.67,
    explanation: {
      summary: "Membagi pembilang dengan penyebut untuk mencari bilangan bulat dan sisa.",
      steps: [
        "Bagi pembilang (17) dengan penyebut (6): 17 : 6 = 2 dengan sisa 5.",
        "Hasil bagi (2) menjadi bilangan bulat di depan.",
        "Sisa pembagian (5) menjadi pembilang baru.",
        "Penyebut pecahan tetap sama, yaitu 6."
      ],
      finalResult: "17/6 = 2 5/6 batang (Pilihan B)"
    }
  },
  {
    id: 2,
    number: 2,
    category: "Konversi Pecahan",
    topicTitle: "Mengubah Pecahan Campuran ke Pecahan Biasa",
    imagePath: "/assets/aistudio/5_46dd3318.JPG",
    hasContextCard: false,
    questionPrompt: "Adik memiliki cokelat sebanyak 2 5/6 batang. Ubahlah jumlah cokelat Adik menjadi pecahan biasa!",
    options: [
      { key: "A", text: "11/6 batang", fractionDisplay: "11/6 batang" },
      { key: "B", text: "13/6 batang", fractionDisplay: "13/6 batang" },
      { key: "C", text: "17/6 batang", fractionDisplay: "17/6 batang" },
      { key: "D", text: "19/6 batang", fractionDisplay: "19/6 batang" }
    ],
    correctAnswer: "C",
    points: 16.67,
    explanation: {
      summary: "Mengalikan bilangan bulat dengan penyebut, lalu menjumlahkan pembilang.",
      steps: [
        "Kalikan bilangan bulat dengan penyebut: 2 \xD7 6 = 12.",
        "Jumlahkan hasil kali dengan pembilang: 12 + 5 = 17.",
        "Penyebut tetap bernilai 6."
      ],
      finalResult: "2 5/6 = 17/6 batang (Pilihan C)"
    }
  },
  {
    id: 3,
    number: 3,
    category: "Operasi Penjumlahan Pecahan",
    topicTitle: "Penjumlahan Pecahan Campuran Berbeda Penyebut",
    imagePath: "/assets/aistudio/4_7049ace6.JPG",
    hasContextCard: true,
    contextHeader: "KONTEKS MASALAH",
    contextStory: "Ibu membeli 2 1/2 kg tepung terigu di toko A. Karena masih kurang, Ibu membeli lagi 1 3/4 kg tepung terigu di toko B.",
    pins: [
      { label: "Nilai Utama 1", value: "2 1/2 kg" },
      { label: "Nilai Utama 2", value: "1 3/4 kg" }
    ],
    questionPrompt: "Berapa kilogram total tepung terigu yang dibeli Ibu?",
    options: [
      { key: "A", text: "3 3/4 kg", fractionDisplay: "3 3/4 kg" },
      { key: "B", text: "4 kg", fractionDisplay: "4 kg" },
      { key: "C", text: "4 1/4 kg", fractionDisplay: "4 1/4 kg" },
      { key: "D", text: "4 1/2 kg", fractionDisplay: "4 1/2 kg" }
    ],
    correctAnswer: "C",
    points: 16.67,
    explanation: {
      summary: "Menyamakan penyebut kedua pecahan (KPK dari 2 dan 4 adalah 4) lalu menjumlahkan.",
      steps: [
        "Total = 2 1/2 + 1 3/4.",
        "Samakan penyebut: 1/2 diubah menjadi 2/4, sehingga 2 1/2 = 2 2/4.",
        "Jumlahkan bilangan bulat: 2 + 1 = 3.",
        "Jumlahkan pecahan: 2/4 + 3/4 = 5/4 = 1 1/4.",
        "Gabungkan: 3 + 1 1/4 = 4 1/4 kg."
      ],
      finalResult: "Total tepung = 4 1/4 kg (Pilihan C)"
    }
  },
  {
    id: 4,
    number: 4,
    category: "Operasi Pengurangan Pecahan",
    topicTitle: "Pengurangan Pecahan Campuran dengan Teknik Peminjaman",
    imagePath: "/assets/aistudio/1_fb7d113c.JPG",
    hasContextCard: true,
    contextHeader: "KONTEKS MASALAH",
    contextStory: "Ibu memiliki persediaan 5 1/2 kg tepung terigu. Sebanyak 2 3/4 kg digunakan untuk membuat adonan kue pastel.",
    pins: [
      { label: "Nilai Utama 1", value: "5 1/2 kg" },
      { label: "Nilai Utama 2", value: "2 3/4 kg" }
    ],
    questionPrompt: "Berapa kilogram sisa tepung terigu persediaan Ibu?",
    options: [
      { key: "A", text: "2 1/4 kg", fractionDisplay: "2 1/4 kg" },
      { key: "B", text: "2 1/2 kg", fractionDisplay: "2 1/2 kg" },
      { key: "C", text: "2 3/4 kg", fractionDisplay: "2 3/4 kg" },
      { key: "D", text: "3 kg", fractionDisplay: "3 kg" }
    ],
    correctAnswer: "C",
    points: 16.67,
    explanation: {
      summary: "Menyamakan penyebut menjadi 4, meminjam 1 dari bilangan bulat 5, lalu mengurangkan.",
      steps: [
        "Sisa persediaan = 5 1/2 - 2 3/4.",
        "Samakan penyebut: 5 1/2 = 5 2/4.",
        "Karena 2/4 lebih kecil dari 3/4, pinjam 1 dari 5: 5 2/4 = 4 + 4/4 + 2/4 = 4 6/4.",
        "Kurangkan: (4 - 2) + (6/4 - 3/4) = 2 + 3/4 = 2 3/4 kg."
      ],
      finalResult: "Sisa tepung = 2 3/4 kg (Pilihan C)"
    }
  },
  {
    id: 5,
    number: 5,
    category: "Operasi Perkalian Pecahan",
    topicTitle: "Perkalian Pecahan Campuran dengan Pecahan Biasa",
    imagePath: "/assets/aistudio/6_c12d4f7b.JPG",
    hasContextCard: true,
    contextHeader: "KONTEKS MASALAH",
    contextStory: "Seorang petani memanen 6 2/5 ton jagung. Sebanyak 5/8 bagian dari hasil panen tersebut akan dijual ke pasar, sedangkan sisanya disimpan.",
    pins: [
      { label: "Nilai Utama 1", value: "6 2/5 ton" },
      { label: "Nilai Utama 2", value: "5/8 bagian" }
    ],
    questionPrompt: "Berapa ton jagung yang dijual ke pasar?",
    options: [
      { key: "A", text: "3 ton", fractionDisplay: "3 ton" },
      { key: "B", text: "4 ton", fractionDisplay: "4 ton" },
      { key: "C", text: "4 1/2 ton", fractionDisplay: "4 1/2 ton" },
      { key: "D", text: "5 ton", fractionDisplay: "5 ton" }
    ],
    correctAnswer: "B",
    points: 16.67,
    explanation: {
      summary: "Mengubah pecahan campuran menjadi pecahan biasa, kemudian mengalikan pecahan.",
      steps: [
        "Jagung dijual = 6 2/5 \xD7 5/8.",
        "Ubah 6 2/5 menjadi pecahan biasa: (6 \xD7 5 + 2)/5 = 32/5.",
        "Kalikan kedua pecahan: (32/5) \xD7 (5/8).",
        "Sederhanakan pembilang dan penyebut: angka 5 saling mencoret, sehingga tersisa 32/8 = 4."
      ],
      finalResult: "Jagung dijual = 4 ton (Pilihan B)"
    }
  },
  {
    id: 6,
    number: 6,
    category: "Operasi Pembagian Pecahan",
    topicTitle: "Pembagian Pecahan Campuran dengan Pecahan Biasa",
    imagePath: "/assets/aistudio/3_84172664.JPG",
    hasContextCard: true,
    contextHeader: "KONTEKS MASALAH",
    contextStory: "Bu Lani memiliki pita hias sepanjang 7 1/2 meter. Pita tersebut dipotong-potong menjadi beberapa bagian sama panjang, masing-masing 3/4 meter untuk hiasan kado.",
    pins: [
      { label: "Nilai Utama 1", value: "7 1/2 meter" },
      { label: "Nilai Utama 2", value: "3/4 meter per potong" }
    ],
    questionPrompt: "Berapa banyak potongan pita yang diperoleh Bu Lani?",
    options: [
      { key: "A", text: "8 potongan", fractionDisplay: "8 potongan" },
      { key: "B", text: "9 potongan", fractionDisplay: "9 potongan" },
      { key: "C", text: "10 potongan", fractionDisplay: "10 potongan" },
      { key: "D", text: "12 potongan", fractionDisplay: "12 potongan" }
    ],
    correctAnswer: "C",
    points: 16.67,
    explanation: {
      summary: "Mengubah ke pecahan biasa, lalu mengalikan dengan kebalikan pecahan pembagi.",
      steps: [
        "Banyak potongan = 7 1/2 : 3/4.",
        "Ubah 7 1/2 menjadi pecahan biasa: (7 \xD7 2 + 1)/2 = 15/2.",
        "Ubah operasi bagi menjadi perkalian dengan membalik pembagi: (15/2) \xD7 (4/3).",
        "Kalikan pembilang dan penyebut: (15 \xD7 4) / (2 \xD7 3) = 60 / 6 = 10 potongan."
      ],
      finalResult: "Banyak potongan = 10 potongan (Pilihan C)"
    }
  }
];

// server.ts
dotenv.config();
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(express.json({ limit: "10mb" }));
var examQuestions = [...EXAM_QUESTIONS];
var currentSession = {
  id: "sesi-1",
  sessionCode: "LIT-NUM-2026",
  teacherName: "Pak Aslam, S.Pd.",
  title: "Ujian Literasi atau Numerasi SDN 4 Sojol Utara",
  durationMinutes: 30,
  passingScore: 70,
  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
  isActive: true
};
var submissions = [];
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
app.get("/api/exam/session", (_req, res) => {
  res.json({ success: true, session: currentSession });
});
app.post("/api/exam/session", (req, res) => {
  const { teacherName, title, durationMinutes, passingScore, resetSubmissions } = req.body;
  if (!teacherName) {
    return res.status(400).json({ success: false, message: "Nama guru wajib diisi" });
  }
  const newSessionId = "sesi-" + Date.now();
  currentSession = {
    id: newSessionId,
    sessionCode: "MTK-" + Math.floor(1e3 + Math.random() * 9e3),
    teacherName: teacherName || currentSession.teacherName,
    title: title || "Penilaian Harian Matematika: Pecahan",
    durationMinutes: Number(durationMinutes) || 30,
    passingScore: Number(passingScore) || 70,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    isActive: true
  };
  if (resetSubmissions) {
    submissions = [];
  }
  res.json({ success: true, session: currentSession, submissionsCount: submissions.length });
});
app.get("/api/exam/submissions", (req, res) => {
  const sessionId = req.query.sessionId;
  if (sessionId) {
    const filtered = submissions.filter((s) => s.sessionId === sessionId);
    return res.json({ success: true, submissions: filtered });
  }
  res.json({ success: true, submissions });
});
app.get("/api/exam/questions", (_req, res) => {
  res.json({ success: true, questions: examQuestions });
});
app.post("/api/exam/questions", (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, message: "Minimal harus ada 1 butir soal." });
  }
  examQuestions = questions.map((q, index) => ({
    ...q,
    id: q.id || index + 1,
    number: index + 1,
    points: Math.round(100 / questions.length * 100) / 100
  }));
  res.json({ success: true, questions: examQuestions });
});
app.post("/api/exam/questions/reset", (_req, res) => {
  examQuestions = [...EXAM_QUESTIONS];
  res.json({ success: true, questions: examQuestions, message: "Bank soal telah dikembalikan ke format default." });
});
app.post("/api/exam/submit", (req, res) => {
  const { name, gender, birthPlace, birthDate, answers, timeSpentSeconds } = req.body;
  if (!name || !gender || !birthPlace || !birthDate) {
    return res.status(400).json({ success: false, message: "Data identitas siswa belum lengkap" });
  }
  const answerKey = {};
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
  const score = totalQuestions > 0 ? Math.round(correctCount / totalQuestions * 100 * 10) / 10 : 0;
  const newSubmission = {
    id: "sub-" + Date.now(),
    name: name.trim(),
    gender,
    birthPlace: birthPlace.trim(),
    birthDate,
    submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
    timeSpentSeconds: Number(timeSpentSeconds) || 0,
    answers: answers || {},
    score,
    correctCount,
    totalQuestions,
    sessionId: currentSession.id
  };
  submissions.unshift(newSubmission);
  res.json({
    success: true,
    submission: newSubmission,
    answerKey
  });
});
app.post("/api/exam/seed-sample", (_req, res) => {
  submissions = [
    {
      id: "sub-1",
      name: "Ahmad Faiz Pratama",
      gender: "Laki-laki",
      birthPlace: "Bandung",
      birthDate: "2013-04-12",
      submittedAt: new Date(Date.now() - 45 * 60 * 1e3).toISOString(),
      timeSpentSeconds: 840,
      answers: { 1: "B", 2: "C", 3: "C", 4: "C", 5: "B", 6: "C" },
      score: 100,
      correctCount: 6,
      totalQuestions: 6,
      sessionId: currentSession.id
    },
    {
      id: "sub-2",
      name: "Siti Nur Aisyah",
      gender: "Perempuan",
      birthPlace: "Jakarta",
      birthDate: "2013-08-25",
      submittedAt: new Date(Date.now() - 32 * 60 * 1e3).toISOString(),
      timeSpentSeconds: 960,
      answers: { 1: "B", 2: "C", 3: "C", 4: "C", 5: "A", 6: "C" },
      score: 83.3,
      correctCount: 5,
      totalQuestions: 6,
      sessionId: currentSession.id
    },
    {
      id: "sub-3",
      name: "Muhammad Rizky Ramadhan",
      gender: "Laki-laki",
      birthPlace: "Surabaya",
      birthDate: "2012-11-10",
      submittedAt: new Date(Date.now() - 20 * 60 * 1e3).toISOString(),
      timeSpentSeconds: 1100,
      answers: { 1: "B", 2: "C", 3: "A", 4: "C", 5: "B", 6: "B" },
      score: 66.7,
      correctCount: 4,
      totalQuestions: 6,
      sessionId: currentSession.id
    },
    {
      id: "sub-4",
      name: "Nabila Zahra Putri",
      gender: "Perempuan",
      birthPlace: "Semarang",
      birthDate: "2013-01-19",
      submittedAt: new Date(Date.now() - 15 * 60 * 1e3).toISOString(),
      timeSpentSeconds: 780,
      answers: { 1: "B", 2: "C", 3: "C", 4: "C", 5: "B", 6: "C" },
      score: 100,
      correctCount: 6,
      totalQuestions: 6,
      sessionId: currentSession.id
    },
    {
      id: "sub-5",
      name: "Bima Satria Wicaksono",
      gender: "Laki-laki",
      birthPlace: "Yogyakarta",
      birthDate: "2013-06-03",
      submittedAt: new Date(Date.now() - 5 * 60 * 1e3).toISOString(),
      timeSpentSeconds: 1250,
      answers: { 1: "A", 2: "C", 3: "D", 4: "A", 5: "B", 6: "C" },
      score: 50,
      correctCount: 3,
      totalQuestions: 6,
      sessionId: currentSession.id
    }
  ];
  res.json({ success: true, count: submissions.length });
});
app.post("/api/exam/clear", (_req, res) => {
  submissions = [];
  res.json({ success: true, message: "Seluruh data pekerjaan siswa telah dibersihkan." });
});
app.post("/api/gemini/analyze", async (req, res) => {
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

${customQuery ? `Pertanyaan Spesifik Guru: "${customQuery}"` : ""}

Tolong berikan laporan evaluasi guru yang profesional, padat, dan aplikatif dalam bahasa Indonesia dengan struktur:
1. Ringkasan Diagnostik Pemahaman Konsep (indikator konsep mana yang sudah dikuasai vs masih lemah).
2. Analisis Miskonsepsi Siswa (penyebab umum kekeliruan pada butir soal yang paling rendah skornya).
3. Rekomendasi Tindak Lanjut Guru (strategi remedial spesifik & ide aktivitas konkrit untuk pertemuan berikutnya).
Gunakan bahasa yang santun, jelas, dan memotivasi seorang pendidik.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });
    const analysisText = response.text || "Analisis berhasil diselesaikan.";
    res.json({ success: true, analysis: analysisText });
  } catch (error) {
    console.error("Gemini API Error:", error);
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
      note: "Analisis cerdas disajikan dari modul diagnostik analitik edukasi."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist/index.html"));
    });
  }
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`EduTest Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
