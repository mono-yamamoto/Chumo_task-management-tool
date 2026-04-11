import { Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { StatsCard } from './StatsCard';

interface StatsRowProps {
  active: number;
  dueSoon: number;
  overdue: number;
  done: number;
}

export function StatsRow({ active, dueSoon, overdue, done }: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatsCard label="対応中" value={active} icon={<Activity size={20} />} variant="default" />
      <StatsCard
        label="IT期限1週間以内"
        value={dueSoon}
        icon={<Clock size={20} />}
        variant="warning"
      />
      <StatsCard
        label="IT期限超過"
        value={overdue}
        icon={<AlertTriangle size={20} />}
        variant="error"
      />
      <StatsCard label="完了" value={done} icon={<CheckCircle size={20} />} variant="success" />
    </div>
  );
}
