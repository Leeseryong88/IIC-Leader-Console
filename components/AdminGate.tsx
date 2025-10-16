import React, { PropsWithChildren, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

const ADMIN_EMAIL = 'monster1003@gentlemonster.com';

const AdminGate: React.FC<PropsWithChildren> = ({ children }) => {
  const [initializing, setInitializing] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAuthed(!!user);
      setInitializing(false);
    });
    return () => unsub();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    } catch (err: any) {
      setError('로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <h1 className="text-lg font-semibold text-center mb-6 text-slate-300">ADMIN 비밀번호를 입력하세요</h1>
          {error && <div className="mb-4 text-sm text-rose-300 bg-rose-900/40 border border-rose-800 rounded p-3">{error}</div>}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md focus:ring-sky-500 focus:border-sky-500 block p-2.5"
              placeholder="비밀번호"
              required
            />
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 rounded-md font-medium disabled:bg-slate-600">{loading? '확인 중...' : '확인'}</button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGate;


