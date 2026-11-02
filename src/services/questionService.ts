import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { EXAM_QUESTIONS, QuestionData } from '../data/questions';

export const QUESTIONS_COLLECTION = 'questions';
export const METADATA_COLLECTION = '_metadata';
export const INIT_DOC_ID = 'exam_init';

/**
 * Normalisasi ID dokumen Firestore: menggunakan string numeric ID (misal: "1", "2", ..., "7")
 * Sesuai dengan struktur dokumen soal yang sudah ada di database Cloud Firestore.
 */
export function getQuestionDocId(questionId: number | string): string {
  return String(questionId).trim();
}

/**
 * Membersihkan objek soal dari properti undefined agar aman dan kompatibel 100% dengan Firestore
 */
export function sanitizeQuestionForFirestore(q: QuestionData, index?: number): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: Number(q.id),
    number: typeof index === 'number' ? index + 1 : Number(q.number || 1),
    category: q.category?.trim() || 'Literasi / Numerasi',
    topicTitle: q.topicTitle?.trim() || `Soal Nomor ${q.number || 1}`,
    type: q.type || 'single',
    imagePath: q.imagePath?.trim() || '',
    hasContextCard: Boolean(q.hasContextCard && q.contextStory?.trim()),
    contextHeader: q.contextHeader?.trim() || 'KONTEKS MASALAH',
    contextStory: q.contextStory?.trim() || '',
    questionPrompt: q.questionPrompt?.trim() || '',
    options: Array.isArray(q.options)
      ? q.options.map((opt) => ({
          key: opt.key || '',
          text: opt.text || '',
          ...(opt.fractionDisplay ? { fractionDisplay: opt.fractionDisplay } : {}),
        }))
      : [],
    correctAnswer: q.correctAnswer || '',
    points: typeof q.points === 'number' && !isNaN(q.points) ? q.points : 16.67,
    explanation: {
      summary: q.explanation?.summary?.trim() || 'Pembahasan butir soal.',
      steps: Array.isArray(q.explanation?.steps) && q.explanation.steps.length > 0
        ? q.explanation.steps.map((s) => String(s).trim()).filter(Boolean)
        : ['Perhatikan konsep soal dan analisis setiap pernyataan atau pilihan secara teliti.'],
      finalResult: q.explanation?.finalResult?.trim() || `Jawaban yang benar: ${q.correctAnswer || '-'}`,
    },
    updatedAt: new Date().toISOString(),
    _serverTimestamp: serverTimestamp(),
  };

  if (q.statements && Array.isArray(q.statements) && q.statements.length > 0) {
    clean.statements = q.statements.map((s) => ({
      id: s.id,
      text: s.text,
      correctAnswer: s.correctAnswer,
    }));
  }

  if (q.pins && Array.isArray(q.pins) && q.pins.length > 0) {
    clean.pins = q.pins.map((p) => ({
      label: p.label,
      value: p.value,
    }));
  }

  return clean;
}

/**
 * Mengambil seluruh butir soal dari Cloud Firestore diurutkan berdasarkan 'number'.
 * Mengembalikan array QuestionData yang tersimpan di koleksi 'questions'.
 */
export async function getQuestionsFromFirestore(): Promise<QuestionData[]> {
  const firestore = db;
  if (!firestore || !isFirebaseConfigured) {
    throw new Error('Firebase belum terkonfigurasi pada aplikasi.');
  }

  try {
    const questionsRef = collection(firestore, QUESTIONS_COLLECTION);
    const q = query(questionsRef, orderBy('number', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Koleksi questions di Firestore masih kosong.');
      return [];
    }

    const questionsList: QuestionData[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      questionsList.push({
        id: Number(data.id),
        number: Number(data.number),
        category: data.category || 'Literasi / Numerasi',
        topicTitle: data.topicTitle || `Soal Nomor ${data.number}`,
        type: data.type || 'single',
        imagePath: data.imagePath || '',
        hasContextCard: Boolean(data.hasContextCard),
        contextHeader: data.contextHeader || 'KONTEKS MASALAH',
        contextStory: data.contextStory || '',
        pins: data.pins || undefined,
        questionPrompt: data.questionPrompt || '',
        options: data.options || [],
        correctAnswer: data.correctAnswer || '',
        statements: data.statements || undefined,
        points: typeof data.points === 'number' ? data.points : 16.67,
        explanation: data.explanation || {
          summary: 'Pembahasan butir soal.',
          steps: [],
          finalResult: '',
        },
      });
    });

    return questionsList.sort((a, b) => a.number - b.number);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('Gagal mengambil butir soal dari Cloud Firestore:', err.message, err.code);
    throw new Error(`Gagal membaca bank soal dari Cloud Firestore: ${err.message || err.code || 'Unknown error'}`);
  }
}

/**
 * Menyimpan atau memperbarui 1 butir soal langsung ke dokumen Firestore questions/q_{id}.
 * Menggunakan await setDoc dan mengonfirmasi keberhasilan penulisan.
 */
export async function saveQuestionToFirestore(question: QuestionData): Promise<void> {
  const firestore = db;
  if (!firestore || !isFirebaseConfigured) {
    throw new Error('Firebase belum siap atau terkonfigurasi.');
  }

  const docId = getQuestionDocId(question.id);
  const docRef = doc(firestore, QUESTIONS_COLLECTION, docId);
  const cleanPayload = sanitizeQuestionForFirestore(question);

  try {
    await setDoc(docRef, cleanPayload, { merge: true });
    console.log(`Dokumen soal [${docId}] berhasil disimpan permanen ke Cloud Firestore.`);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error(`Gagal menyimpan soal [${docId}] ke Firestore:`, err.message, err.code);
    if (err.code === 'permission-denied') {
      throw new Error(
        'Izin ditolak oleh Firestore (permission-denied). Pastikan Anda telah login menggunakan tab "Akun Firebase (Email & Kata Sandi)" dengan akun guru yang memiliki role "teacher" dan active: true di koleksi users.'
      );
    }
    throw new Error(`Gagal menyimpan butir soal ke Cloud Firestore: ${err.message || err.code}`);
  }
}

/**
 * Menghapus dokumen soal dari koleksi questions di Cloud Firestore.
 */
export async function deleteQuestionFromFirestore(questionId: number): Promise<void> {
  const firestore = db;
  if (!firestore || !isFirebaseConfigured) {
    throw new Error('Firebase belum siap.');
  }

  const docId = getQuestionDocId(questionId);
  const docRef = doc(firestore, QUESTIONS_COLLECTION, docId);

  try {
    await deleteDoc(docRef);
    console.log(`Dokumen soal [${docId}] berhasil dihapus dari Cloud Firestore.`);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error(`Gagal menghapus soal [${docId}]:`, err.message);
    throw new Error(`Gagal menghapus soal dari Cloud Firestore: ${err.message || err.code}`);
  }
}

/**
 * Menyimpan seluruh daftar soal sekaligus secara atomik menggunakan WriteBatch ke Firestore.
 * Memastikan penomoran soal (1, 2, ..., N) dan bobot terindeks dengan rapi.
 */
export async function syncAllQuestionsToFirestore(questions: QuestionData[]): Promise<void> {
  const firestore = db;
  if (!firestore || !isFirebaseConfigured) {
    throw new Error('Firebase belum terkonfigurasi.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Daftar butir soal tidak boleh kosong.');
  }

  try {
    const batch = writeBatch(firestore);

    questions.forEach((q, index) => {
      const docId = getQuestionDocId(q.id);
      const docRef = doc(firestore, QUESTIONS_COLLECTION, docId);
      const cleanData = sanitizeQuestionForFirestore(q, index);
      batch.set(docRef, cleanData, { merge: true });
    });

    await batch.commit();
    console.log(`Batch commit berhasil: ${questions.length} butir soal tersimpan permanen di Cloud Firestore.`);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('Batch sync ke Firestore gagal:', err.message, err.code);
    if (err.code === 'permission-denied') {
      throw new Error(
        'Izin ditolak oleh Firestore (permission-denied). Pastikan Anda telah login menggunakan tab "Akun Firebase (Email & Kata Sandi)" dengan akun guru yang memiliki role "teacher" dan active: true di koleksi users.'
      );
    }
    throw new Error(`Gagal menyimpan soal ke Cloud Firestore: ${err.message || err.code}`);
  }
}

/**
 * Inisialisasi awal bank soal bawaan (EXAM_QUESTIONS) jika database benar-benar kosong.
 */
export async function seedInitialQuestionsIfNeeded(forceReset = false): Promise<boolean> {
  const firestore = db;
  if (!firestore || !isFirebaseConfigured) return false;

  try {
    const questionsRef = collection(firestore, QUESTIONS_COLLECTION);
    const existing = await getDocs(questionsRef);

    if (!forceReset && !existing.empty) {
      return false; // Database sudah berisi soal, jangan timpa!
    }

    const batch = writeBatch(firestore);
    EXAM_QUESTIONS.forEach((q, idx) => {
      const docId = getQuestionDocId(q.id);
      const docRef = doc(firestore, QUESTIONS_COLLECTION, docId);
      const cleanData = sanitizeQuestionForFirestore(q, idx);
      batch.set(docRef, cleanData);
    });

    await batch.commit();
    console.log(`Berhasil melakukan inisialisasi awal ${EXAM_QUESTIONS.length} butir soal ke Cloud Firestore.`);
    return true;
  } catch (error: unknown) {
    console.warn('Inisialisasi seed ke Firestore dilewati atau gagal:', error);
    return false;
  }
}
