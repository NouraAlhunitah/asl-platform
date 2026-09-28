interface AccuracyHeaderProps {
  score: number;
}

export default function AccuracyHeader({ score }: AccuracyHeaderProps) {
  const isVerified = score === 100;

  return (
    <div className="flex items-center justify-between bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-semibold text-sm text-slate-700">مؤشر الموثوقية الشرعية</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-36 md:w-48 bg-slate-200/80 rounded-full h-2.5 overflow-hidden p-0.5">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isVerified ? 'bg-emerald-600' : score > 0 ? 'bg-amber-500' : 'bg-slate-300'
            }`} 
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-sm font-bold min-w-[3rem] text-left ${
          isVerified ? 'text-emerald-700' : 'text-amber-600'
        }`}>
          {score}%
        </span>
      </div>
    </div>
  );
}