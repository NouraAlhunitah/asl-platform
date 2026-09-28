'use client';

import { useState } from 'react';

interface AdaptationStudioProps {
  isLocked: boolean;
}

type Language = 'en' | 'id';

const CARD_DATA = {
  en: {
    label: 'ENGLISH / CULTURAL ADAPTATION',
    text: '"None of you truly believes until he loves for his brother what he loves for himself."',
    source: 'Sahih al-Bukhari 13',
    downloadText: 'تحميل البطاقة (PNG)',
  },
  id: {
    label: 'INDONESIAN / TERTULIS & ADAPTASI',
    text: '"Tidak sempurna iman salah seorang di antara kalian hingga ia menyukai bagi saudaranya apa yang ia sukai bagi dirinya sendiri."',
    source: 'Shahih Al-Bukhari 13',
    downloadText: 'Unduh Kartu (PNG)',
  },
};

export default function AdaptationStudio({ isLocked }: AdaptationStudioProps) {
  const [lang, setLang] = useState<Language>('en');

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[18rem] text-center bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-6">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 border border-slate-200 text-slate-400">
          🔒
        </div>
        <p className="text-slate-700 font-semibold text-sm">الاستوديو مغلق حالياً</p>
        <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
          يتطلب تفعيل التصدير والترجمة وصول مؤشر الموثوقية الشرعية في الجانب الأيمن إلى 100%
        </p>
      </div>
    );
  }

  const currentContent = CARD_DATA[lang];

  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl text-xs md:text-sm flex items-center gap-2">
        <span className="text-emerald-600 font-bold">✓</span>
        <span>تم توثيق النص بنجاح. اختر اللغة لتوليد البطاقات المعرفية المترجمة.</span>
      </div>

      {/* محدد اللغة */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/60">
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            lang === 'en'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🇬🇧 الإنجليزية
        </button>
        <button
          onClick={() => setLang('id')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            lang === 'id'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          🇮🇩 الإندونيسية
        </button>
      </div>

      {/* بطاقة التصدير */}
      <div className="flex-1 border border-slate-800 rounded-2xl p-6 bg-slate-900 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex justify-between items-center text-[11px] text-emerald-400 tracking-wider border-b border-slate-800 pb-3">
          <span className="font-mono">KNOWLEDGE CARD #01</span>
          <span className="font-semibold text-slate-300">{currentContent.label}</span>
        </div>

        <p className="text-base md:text-lg font-serif my-6 leading-relaxed text-slate-100 dir-ltr text-left italic">
          {currentContent.text}
        </p>

        <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-800 dir-ltr">
          <span className="font-mono text-[11px]">{currentContent.source}</span>
          <button 
            onClick={() => alert(`جاري تحميل البطاقة باللغة (${lang.toUpperCase()})...`)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg transition-all text-xs font-semibold shadow-sm dir-rtl"
          >
            {currentContent.downloadText}
          </button>
        </div>
      </div>
    </div>
  );
}