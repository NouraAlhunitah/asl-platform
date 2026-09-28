'use client';

import { useState } from 'react';
import { loginUser, registerUser, setStoredToken, syncGuestProjectsToCloud } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      let data;
      if (isLoginTab) {
        data = await loginUser(email, password);
      } else {
        data = await registerUser(email, password, fullName);
      }
      setStoredToken(data.access_token);

      // مزامنة مشاريع الزائر محلياً إلى الحساب السحابي فور الدخول
      await syncGuestProjectsToCloud();

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ في الاتصال، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
        >
          ✕
        </button>

        {/* أزرار التبديل */}
        <div className="flex border-b border-slate-100 mb-6 pb-2 gap-6">
          <button
            onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
            className={`font-bold pb-2 text-sm border-b-2 transition-all ${
              isLoginTab ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-400'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setErrorMsg(''); }}
            className={`font-bold pb-2 text-sm border-b-2 transition-all ${
              !isLoginTab ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-400'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginTab && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">الاسم الكامل</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أحمد علي"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-700 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
          >
            {loading ? 'جاري المعالجة والمزامنة...' : isLoginTab ? 'دخول' : 'إنشاء الحساب ومزامنة مشاريعي'}
          </button>
        </form>
      </div>
    </div>
  );
}