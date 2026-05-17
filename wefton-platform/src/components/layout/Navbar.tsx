'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';
import { useSearchStore } from '@/store/searchStore';
import { MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/config/brand';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Men', href: '/men', dropdown: MEN_CATEGORIES },
  { label: 'Women', href: '/women', dropdown: WOMEN_CATEGORIES },
  { label: 'New Arrivals', href: '/new-arrivals' },
  { label: 'Vision', href: '/vision' },
  { label: 'About', href: '/about' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartCount = useCartStore((s) => s.getItemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { user } = useAuthStore();
  const { openSearch } = useSearchStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setActiveDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'glass border-b border-[var(--glass-border)] py-3'
            : 'bg-transparent py-5'
        )}
      >
        <nav className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-[var(--copper-light)] font-bold tracking-[4px] uppercase text-sm hover:text-[var(--copper-main)] transition-colors"
          >
            WEFTON COPPER
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li
                key={link.label}
                className="relative"
                onMouseEnter={() => link.dropdown && handleDropdownEnter(link.label)}
                onMouseLeave={() => link.dropdown && handleDropdownLeave()}
              >
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1 text-xs tracking-widest uppercase transition-colors duration-200',
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'text-[var(--copper-light)]'
                      : 'text-[var(--text-light)] hover:text-[var(--copper-light)]'
                  )}
                >
                  {link.label}
                  {link.dropdown && <ChevronDown size={12} />}
                </Link>

                {/* Dropdown */}
                <AnimatePresence>
                  {link.dropdown && activeDropdown === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-4 glass rounded-lg border border-[var(--glass-border)] shadow-2xl shadow-black/60 min-w-[180px] py-2 z-50"
                      onMouseEnter={() => handleDropdownEnter(link.label)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.id}
                          href={`${link.href}?category=${item.slug}`}
                          className="block px-5 py-2.5 text-xs tracking-wider text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:bg-white/5 transition-colors"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={openSearch}
              className="text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            <Link
              href="/wishlist"
              className="relative text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              aria-label="Wishlist"
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[var(--copper-main)] text-white text-[9px] flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href={user ? '/account' : '/auth/login'}
              className="text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              aria-label="Account"
            >
              <User size={18} />
            </Link>

            <button
              onClick={() => useCartStore.getState().openCart()}
              className="relative text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[var(--copper-main)] text-white text-[9px] flex items-center justify-center font-bold"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-40 glass lg:hidden pt-[var(--nav-height)]"
          >
            <nav className="flex flex-col p-8 gap-2">
              {NAV_LINKS.map((link) => (
                <div key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      'block py-3 text-sm tracking-widest uppercase border-b border-white/5',
                      pathname === link.href
                        ? 'text-[var(--copper-light)]'
                        : 'text-[var(--text-light)]'
                    )}
                  >
                    {link.label}
                  </Link>
                  {link.dropdown && (
                    <div className="pl-4 mt-1 mb-2 flex flex-col gap-1">
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.id}
                          href={`${link.href}?category=${item.slug}`}
                          className="py-1.5 text-xs tracking-wider text-[var(--text-muted)] hover:text-[var(--copper-light)]"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
