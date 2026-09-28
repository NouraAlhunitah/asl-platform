'use client';

import { useState } from 'react';
import AccuracyHeader from './AccuracyHeader';
import EditorPane from './EditorPane';
import AdaptationStudio from './AdaptationStudio';

export default function Workspace() {
  const [accuracyScore, setAccuracyScore] = useState<number>(0);
  
  // شرط الفتح الصارم (Guardrail): يتطلب مطابقة تامة 100% لتفعيل التكييف والتوليد
  const isVerified = accuracyScore === 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* الجانب الأيمن: محرر التدقيق والتحقق */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6 flex flex-col gap-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-bold text-slate-800 text-lg">محرر التدقيق والتحقق</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            أدخل النص الشرعي للتحقق المباشر الموثق عبر المصادر المعتمدة
          </p>
        </div>
        <AccuracyHeader score={accuracyScore} />
        <EditorPane score={accuracyScore} onScoreChange={setAccuracyScore} />
      </section>

      {/* الجانب الأيسر: استوديو التكييف والتصدير */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6 flex flex-col gap-5">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">استوديو التكييف والترجمة</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              توليد البطاقات المعرفية المترجمة تلقائياً بعد اكتمال التوثيق
            </p>
          </div>
          {!isVerified && (
            <span className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 px-2.5 py-1 rounded-full">
              مقفل لحين التوثيق (100%)
            </span>
          )}
        </div>
        <AdaptationStudio isLocked={!isVerified} />
      </section>
    </div>
  );
}