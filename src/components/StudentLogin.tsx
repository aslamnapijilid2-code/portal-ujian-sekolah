import React, { useState } from 'react';
import { User, Calendar, MapPin, Clock, Award, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { StudentProfile, ExamSessionConfig } from '../types/exam';

interface StudentLoginProps {
  sessionConfig: ExamSessionConfig;
  totalQuestions?: number;
  onStartExam: (profile: StudentProfile) => void;
  onSwitchToTeacher: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  sessionConfig,
  totalQuestions = 6,
  onStartExam,
  onSwitchToTeacher,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('2013-05-15');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Silakan masukkan nama lengkap siswa.');
      return;
    }
    if (!birthPlace.trim()) {
      setErrorMsg('Silakan masukkan tempat lahir siswa.');
      return;
    }
    if (!birthDate) {
      setErrorMsg('Silakan pilih tanggal lahir siswa.');
      return;
    }

    setErrorMsg('');
    onStartExam({
      name: name.trim(),
      gender,
      birthPlace: birthPlace.trim(),
      birthDate,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Exam Brief & Instructions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Portal Peserta Didik · SDN 4 Sojol Utara
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {sessionConfig.title || 'Ujian Literasi atau Numerasi SDN 4 Sojol Utara'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Platform evaluasi pembelajaran dan penilaian SDN 4 Sojol Utara. Pastikan identitas Anda sesuai sebelum menekan tombol mulai ujian.
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Informasi Sesi Pengujian
            </h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Durasi Pengerjaan
                </span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {sessionConfig.durationMinutes} Menit
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-2 text-slate-500">
                  <Award className="w-4 h-4 text-emerald-500" />
                  Skor Maksimum
                </span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  100 Poin
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-2 text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  Jumlah Butir Soal
                </span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {totalQuestions} Butir Soal
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Pengampu Ujian:</span>
                <span className="font-medium text-slate-700">{sessionConfig.teacherName}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-2">
            <p className="font-semibold text-blue-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Ketentuan Pengerjaan
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Soal dilengkapi gambar ilustrasi dan konteks soal cerita.</li>
              <li>Tersedia menu navigasi nomor soal dan penanda ragu-ragu.</li>
              <li>Nilai akhir dihitung otomatis dan dapat langsung dilihat.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Identity Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Lengkapi Data Identitas Siswa
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Data ini akan dicatat pada lembar rekapitulasi penilaian guru.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Muhammad Bintang Ramadhan"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Jenis Kelamin */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Kelamin <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('Laki-laki')}
                  className={`py-2.5 px-4 text-xs font-medium rounded-lg border transition-all text-center flex items-center justify-center gap-2 ${
                    gender === 'Laki-laki'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${gender === 'Laki-laki' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                    {gender === 'Laki-laki' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  Laki-laki
                </button>

                <button
                  type="button"
                  onClick={() => setGender('Perempuan')}
                  className={`py-2.5 px-4 text-xs font-medium rounded-lg border transition-all text-center flex items-center justify-center gap-2 ${
                    gender === 'Perempuan'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${gender === 'Perempuan' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                    {gender === 'Perempuan' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  Perempuan
                </button>
              </div>
            </div>

            {/* Tempat & Tanggal Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tempat Lahir <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Contoh: Jakarta"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Lahir <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Mulai Mengerjakan Ujian</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={onSwitchToTeacher}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                Apakah Anda seorang Pengajar? <span className="text-blue-600 underline font-medium">Masuk ke Portal Guru</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
