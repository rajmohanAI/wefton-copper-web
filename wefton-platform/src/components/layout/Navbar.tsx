'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import ThemeSwitcher from './ThemeSwitcher';

/**
 * NavbarActionsSkeleton — rendered before hydration completes
 * to reserve space for the action icons (search, wishlist, user, cart, menu).
 * Matches the exact dimensions (18px icon size + 4px gap) to prevent CLS.
 */
function NavbarActionsSkeleton() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      {/* Search */}
      <div className="w-[18px] h-[18px] rounded bg-muted/30 animate-pulse" />
      {/* Wishlist */}
      <div className="w-[18px] h-[18px] rounded bg-muted/30 animate-pulse" />
      {/* User */}
      <div className="w-[18px] h-[18px] rounded bg-muted/30 animate-pulse" />
      {/* Cart */}
      <div className="w-[18px] h-[18px] rounded bg-muted/30 animate-pulse" />
    </div>
  );
}

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
  const [mounted, setMounted] = useState(false);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartCount = useCartStore((s) => s.getItemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { user } = useAuthStore();
  const { openSearch } = useSearchStore();

  useEffect(() => {
    setMounted(true);
  }, []);

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
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 80);
  };

  return (
    <>
      <header
        className={cn(
          'top-0 left-0 right-0 z-50 transition-all duration-500',
          pathname === '/' ? 'fixed' : 'sticky -mb-[1px]',
          scrolled
            ? 'glass border-b border-[var(--glass-border)] py-5'
            : 'bg-[var(--bg-dark)]/80 backdrop-blur-sm py-7'
        )}
      >
        <nav className="w-full min-h-[48px] px-[0.5cm] flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-[var(--copper-light)] font-bold tracking-[4px] uppercase text-base hover:text-[var(--copper-main)] transition-colors"
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
                    'flex items-center gap-1 text-sm tracking-widest uppercase transition-colors duration-200',
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'text-[var(--copper-light)]'
                      : 'text-[var(--text-light)] hover:text-[var(--copper-light)]'
                  )}
                >
                  {link.label}
                  {link.dropdown && <ChevronDown size={12} />}
                </Link>

                {/* Dropdown — Liquid Glass Mega Menu with Tiles */}
                <AnimatePresence>
                  {link.dropdown && activeDropdown === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50 w-[min(95vw,1400px)] p-5 rounded-2xl border border-white/10 shadow-[0_8px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(20,22,28,0.85) 0%, rgba(30,32,40,0.75) 100%)',
                        backdropFilter: 'blur(24px) saturate(1.5)',
                        WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
                      }}
                      onMouseEnter={() => handleDropdownEnter(link.label)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      {/* Inner glow effect */}
                      <div className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(214,143,100,0.15) 0%, transparent 60%)' }} />
                      
                      <div className="relative flex flex-wrap justify-center gap-4">
                        {link.dropdown.map((item) => (
                          <Link
                            key={item.id}
                            href={`${link.href}?category=${item.slug}`}
                            className="group flex flex-col items-center gap-2.5 p-3 rounded-xl hover:bg-white/8 transition-all duration-200 w-[120px]"
                          >
                            <div className="w-[96px] h-[96px] rounded-xl overflow-hidden border border-white/10 relative bg-gradient-to-br from-[var(--bg-darker)] to-[var(--bg-card)] shadow-inner">
                              <Image
                                src={item.thumbnail}
                                alt={item.name}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                sizes="96px"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              {/* Fallback initial when image fails */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-light text-[var(--copper-light)]/60">{item.name.charAt(0)}</span>
                              </div>
                            </div>
                            <span className="text-xs text-center leading-tight text-white font-bold group-hover:text-[var(--copper-light)] transition-colors">
                              {item.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {!mounted ? (
              <NavbarActionsSkeleton />
            ) : (
              <>
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
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[var(--copper-main)] text-white text-[0.5625rem] flex items-center justify-center font-bold">
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
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[var(--copper-main)] text-white text-[0.5625rem] flex items-center justify-center font-bold"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
              </>
            )}
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
