import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // WebP only: AVIF takes several times longer to encode, and every image
    // is encoded on first view on a small server, which made product photos
    // (and colour switches) take seconds to appear on mobile.
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // Cache optimized images for 1 year
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  // Hangtag QR short link: /ig -> Instagram profile (permanent).
  // Matches case-insensitively (/ig, /IG, /Ig ...) so the uppercase QR
  // payload (HTTPS://WEFTONCOPPER.COM/IG) also resolves correctly.
  async redirects() {
    return [
      // One site address: weftoncopper.com/* -> www.weftoncopper.com/* (301).
      // Listed first; the path is kept, so the hangtag short links still work
      // (they then match the rules below on the www host).
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'weftoncopper.com' }],
        destination: 'https://www.weftoncopper.com/:path*',
        permanent: true,
      },
      // Serial short link: /s/WCP01M0103000001 -> "Check your product" for
      // that serial (for a QR on the sticker). Case-insensitive like the others.
      {
        source: '/:s(s|S)/:serial',
        destination: '/check-product?serial=:serial',
        permanent: false,
      },
      {
        source: '/:ig(ig|IG|Ig|iG)',
        destination: 'https://www.instagram.com/weftoncopper',
        permanent: true,
      },
      // Hangtag QR short link: /wc -> wash-care instructions page.
      // Case-insensitive so an uppercase QR payload (/WC) also resolves.
      {
        source: '/:wc(wc|WC|Wc|wC)',
        destination: '/wash-care',
        permanent: true,
      },
    ];
  },
  // Tag QR: HTTPS://WWW.WEFTONCOPPER.COM/WELCOMEUSER/WCP01M0103000001 is in
  // upper case (smaller QR). Custom routes match case-insensitively, so this
  // serves /WELCOMEUSER/… from the lowercase page. A rewrite, not a redirect:
  // a redirect would also match /welcomeuser/… and loop.
  async rewrites() {
    return [{ source: '/welcomeuser/:serial', destination: '/welcomeuser/:serial' }];
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
