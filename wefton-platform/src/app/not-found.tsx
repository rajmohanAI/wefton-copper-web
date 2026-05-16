import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-8xl font-light text-[var(--copper-main)] mb-4">404</p>
        <h1 className="text-2xl font-light text-[var(--text-light)] mb-3">Page not found</h1>
        <p className="text-[var(--text-muted)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-12 px-8 bg-[var(--copper-main)] text-white text-xs tracking-widest uppercase rounded hover:bg-[var(--copper-light)] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
