// Wheez's face: a smiling shirt button with a small sparkle (WC-Issue-13).
// Drawn in currentColor so it follows the copper text colour it sits in.

export default function WheezMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="22" strokeWidth="3" />
      <circle cx="32" cy="32" r="16" strokeWidth="1.8" opacity="0.5" />
      <circle cx="26" cy="28" r="3" fill="currentColor" stroke="none" />
      <circle cx="38" cy="28" r="3" fill="currentColor" stroke="none" />
      <path d="M25 37q7 6 14 0" strokeWidth="2.6" />
      <path d="M46 14l4-5M50 20l6-2" strokeWidth="2.4" />
    </svg>
  );
}
