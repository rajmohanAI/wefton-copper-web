'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_SERVICES } from '@/config/adminServices';

/** Desktop "Admin" menu item, shown only to admin users (WC-Issue-8). */
export function AdminMenuDesktop() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = pathname === '/admin' || pathname === '/serialgen';

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = setTimeout(() => setOpen(false), 80);
  };

  return (
    <li className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className={cn(
          'flex items-center gap-1 whitespace-nowrap text-sm tracking-widest uppercase transition-colors duration-200',
          active ? 'text-[var(--copper-light)]' : 'text-[var(--text-light)] hover:text-[var(--copper-light)]',
        )}
      >
        Admin
        <ChevronDown size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-3 z-50 w-72 p-2 rounded-xl glass-menu before:absolute before:inset-x-0 before:-top-4 before:h-4 before:content-['']"
            aria-label="Admin services"
          >
            {ADMIN_SERVICES.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/60 transition-colors"
                >
                  <s.icon size={16} className="mt-0.5 shrink-0 text-[var(--copper-main)]" />
                  <span>
                    <span className="block text-sm font-semibold text-[var(--glass-menu-ink)]">{s.label}</span>
                    <span className="block text-xs text-[var(--glass-menu-ink)] opacity-70">{s.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Admin section of the mobile menu, shown only to admin users. */
export function AdminMenuMobile() {
  return (
    <div>
      <p className="pt-6 pb-2 text-xs tracking-widest uppercase text-[var(--copper-light)]">Admin</p>
      <div className="flex flex-col">
        {ADMIN_SERVICES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-3 py-2.5 text-sm text-[var(--text-light)] border-b border-white/5"
          >
            <s.icon size={15} className="text-[var(--copper-light)]" />
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
