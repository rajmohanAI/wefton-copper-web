'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-5 h-5" />; // SSR placeholder

  const cycle = () => {
    if (theme === 'dark') setTheme('system');
    else if (theme === 'system') setTheme('light');
    else setTheme('dark');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={cycle}
      aria-label={`Current theme: ${theme}. Click to switch.`}
      className="text-[var(--color-muted)] hover:text-[var(--color-accent-light)] transition-colors"
    >
      <Icon size={18} />
    </button>
  );
}
