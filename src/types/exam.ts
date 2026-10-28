export type QuestionType = 'single' | 'complex' | 'true_false';

export interface TrueFalseStatement {
  id: string;
  text: string;
  correctAnswer: 'Benar' | 'Salah';
}

export interface StudentProfile {
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
}

export interface StudentSubmission {
  id: string;
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
  submittedAt: string;
  timeSpentSeconds: number;
  answers: Record<number, string>;
  score: number; // 0 - 100
  correctCount: number;
  totalQuestions: number;
  sessionId: string;
}

export interface ExamSessionConfig {
  id: string;
  sessionCode: string;
  teacherName: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  createdAt: string;
  isActive: boolean;
}

export interface QuestionStat {
  questionId: number;
  totalAnswered: number;
  correctCount: number;
  correctPct: number;
  optionCounts: Record<string, number>;
  mostChosenOption: string;
  difficultyTag: 'Mudah' | 'Sedang' | 'Tantangan';
}
