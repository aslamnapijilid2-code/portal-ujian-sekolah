export type QuestionType = 'single' | 'complex' | 'true_false';

export interface TrueFalseStatement {
  id: string; // e.g. "s1", "s2", "s3"
  text: string;
  correctAnswer: 'Benar' | 'Salah';
}

export interface QuestionOption {
  key: string;
  text: string;
  fractionDisplay?: string; // formatted visual representation
}

export interface QuestionData {
  id: number;
  number: number;
  category: string;
  topicTitle: string;
  type?: QuestionType;
  imagePath: string;
  hasContextCard: boolean;
  contextHeader?: string;
  contextStory?: string;
  pins?: { label: string; value: string }[];
  questionPrompt: string;
  options: QuestionOption[];
  correctAnswer: string;
  statements?: TrueFalseStatement[];
  points: number;
  explanation: {
    summary: string;
    steps: string[];
    finalResult: string;
  };
}

export function checkIsAnswerCorrect(
  studentAnswer: string | undefined,
  correctAnswer: string,
  questionType: QuestionType = 'single',
  statements?: TrueFalseStatement[]
): boolean {
  if (!studentAnswer || !correctAnswer) return false;

  if (questionType === 'complex') {
    const sList = studentAnswer
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join(',');
    const cList = correctAnswer
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join(',');
    return sList === cList;
  }

  if (questionType === 'true_false') {
    // If statements array is provided with items
    if (statements && statements.length > 0) {
      let studentMap: Record<string, string> = {};
      try {
        if (studentAnswer.startsWith('{')) {
          studentMap = JSON.parse(studentAnswer);
        } else {
          studentAnswer.split('|').forEach((part) => {
            const [id, val] = part.split(':');
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

    // Fallback if correctAnswer contains serialized statement pairs (e.g. s1:Benar|s2:Salah)
    if (correctAnswer.includes(':') || correctAnswer.startsWith('{')) {
      let studentMap: Record<string, string> = {};
      let correctMap: Record<string, string> = {};
      try {
        if (studentAnswer.startsWith('{')) studentMap = JSON.parse(studentAnswer);
        else {
          studentAnswer.split('|').forEach((part) => {
            const [id, val] = part.split(':');
            if (id && val) studentMap[id.trim()] = val.trim();
          });
        }
        if (correctAnswer.startsWith('{')) correctMap = JSON.parse(correctAnswer);
        else {
          correctAnswer.split('|').forEach((part) => {
            const [id, val] = part.split(':');
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

export const EXAM_QUESTIONS: QuestionData[] = [
  {
    id: 1,
    number: 1,
    category: 'Konversi Pecahan',
    topicTitle: 'Mengubah Pecahan Biasa ke Pecahan Campuran',
    imagePath: '/assets/aistudio/2_5761fc07.JPG',
    hasContextCard: false,
    questionPrompt: 'Ibu mempunyai cokelat sebanyak 17/6 batang. Ubahlah jumlah cokelat tersebut menjadi pecahan campuran!',
    options: [
      { key: 'A', text: '2 3/6 batang', fractionDisplay: '2 3/6 batang' },
      { key: 'B', text: '2 5/6 batang', fractionDisplay: '2 5/6 batang' },
      { key: 'C', text: '3 1/6 batang', fractionDisplay: '3 1/6 batang' },
      { key: 'D', text: '3 5/6 batang', fractionDisplay: '3 5/6 batang' },
    ],
    correctAnswer: 'B',
    points: 16.67,
    explanation: {
      summary: 'Membagi pembilang dengan penyebut untuk mencari bilangan bulat dan sisa.',
      steps: [
        'Bagi pembilang (17) dengan penyebut (6): 17 : 6 = 2 dengan sisa 5.',
        'Hasil bagi (2) menjadi bilangan bulat di depan.',
        'Sisa pembagian (5) menjadi pembilang baru.',
        'Penyebut pecahan tetap sama, yaitu 6.',
      ],
      finalResult: '17/6 = 2 5/6 batang (Pilihan B)',
    },
  },
  {
    id: 2,
    number: 2,
    category: 'Konversi Pecahan',
    topicTitle: 'Mengubah Pecahan Campuran ke Pecahan Biasa',
    imagePath: '/assets/aistudio/5_46dd3318.JPG',
    hasContextCard: false,
    questionPrompt: 'Adik memiliki cokelat sebanyak 2 5/6 batang. Ubahlah jumlah cokelat Adik menjadi pecahan biasa!',
    options: [
      { key: 'A', text: '11/6 batang', fractionDisplay: '11/6 batang' },
      { key: 'B', text: '13/6 batang', fractionDisplay: '13/6 batang' },
      { key: 'C', text: '17/6 batang', fractionDisplay: '17/6 batang' },
      { key: 'D', text: '19/6 batang', fractionDisplay: '19/6 batang' },
    ],
    correctAnswer: 'C',
    points: 16.67,
    explanation: {
      summary: 'Mengalikan bilangan bulat dengan penyebut, lalu menjumlahkan pembilang.',
      steps: [
        'Kalikan bilangan bulat dengan penyebut: 2 × 6 = 12.',
        'Jumlahkan hasil kali dengan pembilang: 12 + 5 = 17.',
        'Penyebut tetap bernilai 6.',
      ],
      finalResult: '2 5/6 = 17/6 batang (Pilihan C)',
    },
  },
  {
    id: 3,
    number: 3,
    category: 'Operasi Penjumlahan Pecahan',
    topicTitle: 'Penjumlahan Pecahan Campuran Berbeda Penyebut',
    imagePath: '/assets/aistudio/4_7049ace6.JPG',
    hasContextCard: true,
    contextHeader: 'KONTEKS MASALAH',
    contextStory: 'Ibu membeli 2 1/2 kg tepung terigu di toko A. Karena masih kurang, Ibu membeli lagi 1 3/4 kg tepung terigu di toko B.',
    pins: [
      { label: 'Nilai Utama 1', value: '2 1/2 kg' },
      { label: 'Nilai Utama 2', value: '1 3/4 kg' },
    ],
    questionPrompt: 'Berapa kilogram total tepung terigu yang dibeli Ibu?',
    options: [
      { key: 'A', text: '3 3/4 kg', fractionDisplay: '3 3/4 kg' },
      { key: 'B', text: '4 kg', fractionDisplay: '4 kg' },
      { key: 'C', text: '4 1/4 kg', fractionDisplay: '4 1/4 kg' },
      { key: 'D', text: '4 1/2 kg', fractionDisplay: '4 1/2 kg' },
    ],
    correctAnswer: 'C',
    points: 16.67,
    explanation: {
      summary: 'Menyamakan penyebut kedua pecahan (KPK dari 2 dan 4 adalah 4) lalu menjumlahkan.',
      steps: [
        'Total = 2 1/2 + 1 3/4.',
        'Samakan penyebut: 1/2 diubah menjadi 2/4, sehingga 2 1/2 = 2 2/4.',
        'Jumlahkan bilangan bulat: 2 + 1 = 3.',
        'Jumlahkan pecahan: 2/4 + 3/4 = 5/4 = 1 1/4.',
        'Gabungkan: 3 + 1 1/4 = 4 1/4 kg.',
      ],
      finalResult: 'Total tepung = 4 1/4 kg (Pilihan C)',
    },
  },
  {
    id: 4,
    number: 4,
    category: 'Operasi Pengurangan Pecahan',
    topicTitle: 'Pengurangan Pecahan Campuran dengan Teknik Peminjaman',
    imagePath: '/assets/aistudio/1_fb7d113c.JPG',
    hasContextCard: true,
    contextHeader: 'KONTEKS MASALAH',
    contextStory: 'Ibu memiliki persediaan 5 1/2 kg tepung terigu. Sebanyak 2 3/4 kg digunakan untuk membuat adonan kue pastel.',
    pins: [
      { label: 'Nilai Utama 1', value: '5 1/2 kg' },
      { label: 'Nilai Utama 2', value: '2 3/4 kg' },
    ],
    questionPrompt: 'Berapa kilogram sisa tepung terigu persediaan Ibu?',
    options: [
      { key: 'A', text: '2 1/4 kg', fractionDisplay: '2 1/4 kg' },
      { key: 'B', text: '2 1/2 kg', fractionDisplay: '2 1/2 kg' },
      { key: 'C', text: '2 3/4 kg', fractionDisplay: '2 3/4 kg' },
      { key: 'D', text: '3 kg', fractionDisplay: '3 kg' },
    ],
    correctAnswer: 'C',
    points: 16.67,
    explanation: {
      summary: 'Menyamakan penyebut menjadi 4, meminjam 1 dari bilangan bulat 5, lalu mengurangkan.',
      steps: [
        'Sisa persediaan = 5 1/2 - 2 3/4.',
        'Samakan penyebut: 5 1/2 = 5 2/4.',
        'Karena 2/4 lebih kecil dari 3/4, pinjam 1 dari 5: 5 2/4 = 4 + 4/4 + 2/4 = 4 6/4.',
        'Kurangkan: (4 - 2) + (6/4 - 3/4) = 2 + 3/4 = 2 3/4 kg.',
      ],
      finalResult: 'Sisa tepung = 2 3/4 kg (Pilihan C)',
    },
  },
  {
    id: 5,
    number: 5,
    category: 'Operasi Perkalian Pecahan',
    topicTitle: 'Perkalian Pecahan Campuran dengan Pecahan Biasa',
    imagePath: '/assets/aistudio/6_c12d4f7b.JPG',
    hasContextCard: true,
    contextHeader: 'KONTEKS MASALAH',
    contextStory: 'Seorang petani memanen 6 2/5 ton jagung. Sebanyak 5/8 bagian dari hasil panen tersebut akan dijual ke pasar, sedangkan sisanya disimpan.',
    pins: [
      { label: 'Nilai Utama 1', value: '6 2/5 ton' },
      { label: 'Nilai Utama 2', value: '5/8 bagian' },
    ],
    questionPrompt: 'Berapa ton jagung yang dijual ke pasar?',
    options: [
      { key: 'A', text: '3 ton', fractionDisplay: '3 ton' },
      { key: 'B', text: '4 ton', fractionDisplay: '4 ton' },
      { key: 'C', text: '4 1/2 ton', fractionDisplay: '4 1/2 ton' },
      { key: 'D', text: '5 ton', fractionDisplay: '5 ton' },
    ],
    correctAnswer: 'B',
    points: 16.67,
    explanation: {
      summary: 'Mengubah pecahan campuran menjadi pecahan biasa, kemudian mengalikan pecahan.',
      steps: [
        'Jagung dijual = 6 2/5 × 5/8.',
        'Ubah 6 2/5 menjadi pecahan biasa: (6 × 5 + 2)/5 = 32/5.',
        'Kalikan kedua pecahan: (32/5) × (5/8).',
        'Sederhanakan pembilang dan penyebut: angka 5 saling mencoret, sehingga tersisa 32/8 = 4.',
      ],
      finalResult: 'Jagung dijual = 4 ton (Pilihan B)',
    },
  },
  {
    id: 6,
    number: 6,
    category: 'Operasi Pembagian Pecahan',
    topicTitle: 'Pembagian Pecahan Campuran dengan Pecahan Biasa',
    imagePath: '/assets/aistudio/3_84172664.JPG',
    hasContextCard: true,
    contextHeader: 'KONTEKS MASALAH',
    contextStory: 'Bu Lani memiliki pita hias sepanjang 7 1/2 meter. Pita tersebut dipotong-potong menjadi beberapa bagian sama panjang, masing-masing 3/4 meter untuk hiasan kado.',
    pins: [
      { label: 'Nilai Utama 1', value: '7 1/2 meter' },
      { label: 'Nilai Utama 2', value: '3/4 meter per potong' },
    ],
    questionPrompt: 'Berapa banyak potongan pita yang diperoleh Bu Lani?',
    options: [
      { key: 'A', text: '8 potongan', fractionDisplay: '8 potongan' },
      { key: 'B', text: '9 potongan', fractionDisplay: '9 potongan' },
      { key: 'C', text: '10 potongan', fractionDisplay: '10 potongan' },
      { key: 'D', text: '12 potongan', fractionDisplay: '12 potongan' },
    ],
    correctAnswer: 'C',
    points: 16.67,
    explanation: {
      summary: 'Mengubah ke pecahan biasa, lalu mengalikan dengan kebalikan pecahan pembagi.',
      steps: [
        'Banyak potongan = 7 1/2 : 3/4.',
        'Ubah 7 1/2 menjadi pecahan biasa: (7 × 2 + 1)/2 = 15/2.',
        'Ubah operasi bagi menjadi perkalian dengan membalik pembagi: (15/2) × (4/3).',
        'Kalikan pembilang dan penyebut: (15 × 4) / (2 × 3) = 60 / 6 = 10 potongan.',
      ],
      finalResult: 'Banyak potongan = 10 potongan (Pilihan C)',
    },
  },
];
