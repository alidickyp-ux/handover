import { StatsCardProps } from '@/types';

const colorStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-500',
  blue: 'bg-blue-500/10 text-blue-500',
  amber: 'bg-amber-500/10 text-amber-500',
  violet: 'bg-violet-500/10 text-violet-500',
};

export default function StatsCard({ title, value, icon, color = 'emerald', subtitle }: StatsCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/30 p-6 border border-white/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorStyles[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}