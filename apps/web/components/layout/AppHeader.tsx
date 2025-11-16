/**
 * AppHeader Component
 * Sticky header that respects iOS safe areas and sits flush under the notch
 */

'use client';

// Simple cn utility for className merging
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface AppHeaderProps {
  title: string;
  left?: React.ReactNode; // RTL: left side is the primary action area
  right?: React.ReactNode; // RTL: right side is secondary
  className?: string;
}

export default function AppHeader({
  title,
  left,
  right,
  className,
}: AppHeaderProps) {
  console.log('[SafeArea] header ok');

  return (
    <header
      className={cn(
        // Stick to very top, under the notch
        'sticky top-0 z-50',
        // Paint behind the status bar; use blur for depth
        'bg-[#0D0E0F]/95 supports-[backdrop-filter]:bg-[#0D0E0F]/80 backdrop-blur',
        // Respect the top safe-area (notch)
        'pt-[env(safe-area-inset-top)]',
        // Border at bottom
        'border-b border-zinc-800',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 h-14">
        {/* RTL: Left side (primary actions like back button) */}
        {left && <div className="flex items-center">{left}</div>}

        {/* Title - centered or right-aligned based on presence of actions */}
        <h1 className={cn(
          'text-xl font-bold',
          left && right ? 'flex-1 text-center' : left ? 'flex-1 text-right' : 'text-right'
        )}>
          {title}
        </h1>

        {/* RTL: Right side (secondary actions) */}
        {right && <div className="flex items-center">{right}</div>}
      </div>
    </header>
  );
}
