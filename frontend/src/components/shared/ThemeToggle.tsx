import { Sun, Moon } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <IconButton
      aria-label={theme === 'light' ? 'ダークモードに切替' : 'ライトモードに切替'}
      onPress={toggleTheme}
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </IconButton>
  );
}
