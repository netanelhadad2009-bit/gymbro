'use client';
import React from 'react';
import OnboardingHeader from './OnboardingHeader';

type Props = {
  title?: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dir?: 'rtl' | 'ltr';
  /** When true, the content area won't auto-scroll (useful for custom scroll pickers) */
  disableContentScroll?: boolean;
};

export default function OnboardingShell({
  title,
  subtitle,
  children,
  footer,
  dir = 'rtl',
  disableContentScroll = false
}: Props) {
  return (
    <div
      dir={dir}
      className="bg-[#0D0E0F] text-white min-h-full flex flex-col relative"
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-6 pt-4 pb-8 flex-shrink-0">
          <OnboardingHeader
            title={title || ''}
            subtitle={subtitle}
            className=""
          />
        </div>
      )}

      {/* Content Area - Add bottom padding to prevent content from being hidden behind footer */}
      <div
        className={`
          ${disableContentScroll ? 'flex-1' : 'flex-1 px-6'}
        `}
        style={{ paddingBottom: footer ? 'calc(5rem + env(safe-area-inset-bottom, 0px) + 1.5rem)' : '1.5rem' }}
      >
        {children}
      </div>

      {/* Footer with safe-area - Fixed at bottom of viewport with spacing */}
      {footer && (
        <footer
          className="fixed left-0 right-0 z-40 bg-[#0D0E0F] px-6 pt-3 border-t border-white/5"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
            paddingBottom: '0.75rem'
          }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}
