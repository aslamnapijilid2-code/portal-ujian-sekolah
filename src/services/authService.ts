import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface TeacherUserDoc {
  displayName?: string;
  email?: string;
  role: 'teacher' | 'admin' | string;
  active: boolean;
  school?: string;
  createdAt?: string;
}

export interface TeacherAuthResult {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
}

/**
 * Autentikasi guru menggunakan Firebase Authentication (Email/Password)
 * Disertai verifikasi dokumen role di Cloud Firestore: users/{uid}
 * Syarat izin masuk: role === 'teacher' (atau 'admin') dan active === true
 */
export async function loginTeacherWithFirebase(
  email: string,
  pass: string
): Promise<TeacherAuthResult> {
  if (!auth || !db) {
    throw new Error('Layanan Firebase belum siap. Silakan refresh halaman dan coba kembali.');
  }

  // 1. Autentikasi kredensial Firebase Auth
  let user: User;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    user = userCredential.user;
  } catch (authError: unknown) {
    const err = authError as { code?: string; message?: string };
    const code = err.code || '';

    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      throw new Error('Email atau kata sandi pengajar tidak valid. Silakan periksa kembali.');
    } else if (code === 'auth/invalid-email') {
      throw new Error('Format email tidak valid. Masukkan format email yang benar.');
    } else if (code === 'auth/user-disabled') {
      throw new Error('Akun pengajar ini telah dinonaktifkan di Firebase Authentication.');
    } else if (code === 'auth/too-many-requests') {
      throw new Error('Terlalu banyak percobaan masuk yang gagal. Silakan tunggu beberapa saat.');
    } else if (code === 'auth/network-request-failed') {
      throw new Error('Koneksi internet bermasalah. Periksa sambungan jaringan Anda.');
    }
    throw new Error(err.message || 'Gagal melakukan autentikasi dengan server Firebase.');
  }

  // 2. Verifikasi dokumen pengguna di koleksi users/{uid}
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      await signOut(auth);
      throw new Error(
        `Autentikasi akun berhasil, namun data dokumen guru di Cloud Firestore (koleksi "users", ID: "${user.uid}") belum ditemukan. Pastikan dokumen profil telah dibuat di Firestore dengan field role: "teacher" dan active: true.`
      );
    }

    const userData = userDocSnap.data() as TeacherUserDoc;

    // 3. Validasi hak akses role (harus 'teacher' atau 'admin')
    const role = (userData.role || '').toLowerCase().trim();
    if (role !== 'teacher' && role !== 'admin') {
      await signOut(auth);
      throw new Error(
        `Akses ditolak: Akun ini tidak memiliki hak akses sebagai pendidik (role di Firestore saat ini: "${userData.role || 'kosong'}", syarat: "teacher" atau "admin").`
      );
    }

    // 4. Validasi status aktif akun (harus true)
    if (userData.active !== true) {
      await signOut(auth);
      throw new Error(
        'Akses ditolak: Status akun guru ini tidak aktif (active: false). Hubungi administrator untuk mengaktifkannya.'
      );
    }

    return {
      uid: user.uid,
      email: user.email || email,
      displayName: userData.displayName || user.displayName || 'Pak Aslam, S.Pd.',
      role: userData.role,
      active: userData.active,
    };
  } catch (firestoreError: unknown) {
    // Jika verifikasi Firestore melempar error kustom kita, teruskan
    if (firestoreError instanceof Error) {
      throw firestoreError;
    }
    // Jika ada error jaringan/permission lain dari Firestore
    await signOut(auth);
    throw new Error('Gagal memverifikasi dokumen izin hak akses di Firestore.');
  }
}

/**
 * Keluar dari sesi Firebase Auth
 */
export async function logoutTeacher(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

/**
 * Mendengarkan perubahan status autentikasi guru
 */
export function subscribeToTeacherAuth(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
