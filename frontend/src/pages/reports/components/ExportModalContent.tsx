import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

type ExportRange = 'all' | 'normal' | 'brg';
type ExportMethod = 'create' | 'update';

export function ExportModalContent() {
  const [range, setRange] = useState<ExportRange>('all');
  const [method, setMethod] = useState<ExportMethod>('create');

  return (
    <div className="space-y-6">
      {/* 出力範囲 */}
      <div className="space-y-3">
        <span className="text-sm font-medium text-text-primary">出力範囲</span>
        <div className="space-y-2">
          <RadioOption
            name="range"
            value="all"
            label="全て"
            checked={range === 'all'}
            onChange={() => setRange('all')}
          />
          <RadioOption
            name="range"
            value="normal"
            label="通常のみ"
            checked={range === 'normal'}
            onChange={() => setRange('normal')}
          />
          <RadioOption
            name="range"
            value="brg"
            label="BRGのみ"
            checked={range === 'brg'}
            onChange={() => setRange('brg')}
          />
        </div>
      </div>

      {/* 出力方法 */}
      <div className="space-y-3">
        <span className="text-sm font-medium text-text-primary">出力方法</span>
        <div className="space-y-2">
          <RadioOption
            name="method"
            value="create"
            label="新規作成"
            checked={method === 'create'}
            onChange={() => setMethod('create')}
          />
          <RadioOption
            name="method"
            value="update"
            label="更新"
            checked={method === 'update'}
            onChange={() => setMethod('update')}
          />
        </div>
      </div>
    </div>
  );
}

interface FooterProps {
  onCancel: () => void;
}

ExportModalContent.Footer = function ExportModalFooter({ onCancel }: FooterProps) {
  return (
    <>
      <Button variant="outline" size="sm" onPress={onCancel}>
        キャンセル
      </Button>
      <Button variant="primary" size="sm">
        <Upload size={16} />
        出力
      </Button>
    </>
  );
};

interface RadioOptionProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}

function RadioOption({ name, value, label, checked, onChange }: RadioOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-[18px] w-[18px] accent-primary-default"
      />
      <span className="text-sm text-text-primary">{label}</span>
    </label>
  );
}
