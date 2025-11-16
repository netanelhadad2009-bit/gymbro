/**
 * PageSafeArea Component
 * Reusable page shell that handles iOS safe areas correctly
 * Fills the entire screen and paints behind the status bar
 */

'use client';

// Simple cn utility for className merging
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function PageSafeArea({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        // Fill the whole screen and paint behind status bar
        'fixed inset-0 flex flex-col bg-[#0D0E0F]',
        // Prevent overscroll revealing transparent areas
        'overscroll-y-contain touch-manipulation',
        className
      )}
    >
      {children}
    </div>
  );
}
