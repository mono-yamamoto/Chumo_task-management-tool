import { Clock } from 'lucide-react';

export function TaskTableHeader() {
  return (
    <div className="flex items-center gap-2 border-b border-border-default bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-600 dark:bg-teal-950 dark:text-teal-400">
      <div className="w-7 shrink-0" />
      <div className="flex-1 min-w-0 text-center">タイトル</div>
      <div className="w-[100px] shrink-0 text-center">アサイン</div>
      <div className="w-[96px] shrink-0 text-center leading-tight">
        ITアップ/
        <br />
        リリース
      </div>
      <div className="w-[110px] shrink-0 text-center">担当</div>
      <div className="w-[100px] shrink-0 text-center">進捗</div>
      <div className="w-[40px] shrink-0 text-center">区分</div>
      <div className="w-[48px] shrink-0 flex items-center justify-center">
        <Clock size={20} />
      </div>
    </div>
  );
}
