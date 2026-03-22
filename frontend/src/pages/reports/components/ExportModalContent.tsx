import { Upload } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

type ExportRange = 'all' | 'normal' | 'brg';

interface ExportModalContentProps {
  range: ExportRange;
  onRangeChange: (range: ExportRange) => void;
}

export function ExportModalContent({ range, onRangeChange }: ExportModalContentProps) {
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
            onChange={() => onRangeChange('all')}
          />
          <RadioOption
            name="range"
            value="normal"
            label="通常のみ"
            checked={range === 'normal'}
            onChange={() => onRangeChange('normal')}
          />
          <RadioOption
            name="range"
            value="brg"
            label="BRGのみ"
            checked={range === 'brg'}
            onChange={() => onRangeChange('brg')}
          />
        </div>
      </div>
    </div>
  );
}

interface FooterProps {
  onCancel: () => void;
  onExport: () => void;
}

ExportModalContent.Footer = function ExportModalFooter({ onCancel, onExport }: FooterProps) {
  return (
    <>
      <Button variant="outline" size="sm" onPress={onCancel}>
        キャンセル
      </Button>
      <Button variant="primary" size="sm" onPress={onExport}>
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
