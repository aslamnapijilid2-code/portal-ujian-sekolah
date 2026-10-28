import React, { useState } from 'react';
import { ShieldCheck, KeyRound, User, AlertCircle, ArrowRight, Eye, EyeOff, Lock, Loader2 } from 'lucide-react';

interface TeacherLoginProps {
  onLoginSuccess: (teacherName: string) => void;
  onSwitchToStudent: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({
  onLoginSuccess,
  onSwitchToStudent,
}) => {
  const [teacherName, setTeacherName] = useState('Pak Aslam, S.Pd.');
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacherName.trim()) {
      setErrorMsg('Silakan masukkan nama guru pengampu.');
      return;
    }

    if (!accessCode.trim()) {
      setErrorMsg('Silakan masukkan kode akses pengajar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherName: teacherName.trim(),
          password: accessCode.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        onLoginSuccess(data.teacherName || teacherName.trim());
      } else {
        setErrorMsg(data.message || 'Kode akses tidak valid. Silakan periksa kembali kode akses pengajar.');
      }
    } catch {
      setErrorMsg('Gagal menghubungi server verifikasi. Pastikan koneksi server aktif.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Autentikasi Dasbor Guru
          </h1>
          <p className="text-xs text-slate-500">
            Masuk dengan nama pendidik dan kode akses resmi pengajar.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Guru Pengampu <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Contoh: Pak Aslam, S.Pd."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode Akses Rahasia <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showCode ? 'text' : 'password'}
                required
                disabled={isSubmitting}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Masukkan kode akses pengajar"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors font-mono disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Tampilkan atau sembunyikan kode"
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              Akses terbatas hanya untuk pendidik dan pengawas resmi.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dasbor Guru</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-4 text-center border-t border-slate-100">
          <button
            type="button"
            onClick={onSwitchToStudent}
            disabled={isSubmitting}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Kembali ke <span className="text-blue-600 underline font-medium">Portal Siswa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
