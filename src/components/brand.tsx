export function Mark({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 270 190" fill="none" className={className} aria-hidden="true">
    <g stroke="currentColor" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 95v40a40 40 0 0 0 80 0V55a40 40 0 0 1 80 0v80" />
      <path d="M95 135a40 40 0 0 0 80 0V55a40 40 0 0 1 80 0v40" />
    </g>
    <path d="M169 33a40 40 0 0 0-9-10M101 157a40 40 0 0 1-6-22" stroke="currentColor" strokeWidth="20" opacity=".3" />
  </svg>;
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="CEO Club CPE">
    <Mark /><span className="brand-text">CEO Club<span>CPE</span></span>
  </span>;
}
