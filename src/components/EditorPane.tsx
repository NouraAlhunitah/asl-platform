'use client';

import { useState } from 'react';

interface EditorPaneProps {
  score: number;
  onScoreChange: (score: number) => void;
}

interface SourceInfo {
  book: string;
  chapter: string;
  hadith_number?: number;
  grade: string;
}

export default function EditorPane({ score, onScoreChange }: EditorPaneProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<SourceInfo[]>([]);

  const handleAudit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      onScoreChange(data.accuracy_score);
      setMessage(data.message);
      setSources(data.sources || []);
    } catch (error) {
      console.error('Error auditing text:', error);
      setMessage('تعذر الاتصال بالمحرك الخلفي، تأكدي من تشغيل السيرفر.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="relative">
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-56 p-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-none leading-relaxed text-slate-800 text-sm md:text-base transition-all placeholder:text-slate-400"
          placeholder="أدخل النص العربي للتدقيق هنا (مثال: لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه)..."
        />
        <span className="absolute bottom-3 left-3 text-xs text-slate-400">
          {text.length} حرف
        </span>
      </div>

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex-wrap gap-3">
        <button
          onClick={handleAudit}
          disabled={loading || !text.trim()}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>جاري التدقيق...</span>
            </>
          ) : (
            <span>فحص الموثوقية الشرعية</span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">تجربة يدوية:</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={score} 
            onChange={(e) => onScoreChange(Number(e.target.value))} 
            className="w-24 accent-emerald-600 cursor-pointer" 
          />
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm border transition-all ${
          score === 100 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          <p className="font-semibold text-xs md:text-sm">{message}</p>
          {sources.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-emerald-200/60 text-xs space-y-1">
              {sources.map((src, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-emerald-800">
                  <span className="text-emerald-600">📖</span>
                  <span className="font-bold">{src.book}</span> — {src.chapter} ({src.grade})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}