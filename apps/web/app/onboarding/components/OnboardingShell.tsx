'use client';
import React from 'react';
import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import OnboardingHeader from './OnboardingHeader';
import { useOnboardingContext } from '../OnboardingContext';

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
  const { hideNavigation, progress, handleBack } = useOnboardingContext();

  // Build the complete header with navigation bar if not hidden
  const fullHeader = !hideNavigation ? (
    <div>
      {/* Navigation bar - pt-safe is handled by OnboardingLayout */}
      <div className="flex items-center gap-4 px-5 pb-3 pt-5">
        {/* Progress Bar */}
        <div className="flex-1" dir="ltr">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleBack}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-white/70 active:text-white active:scale-95 transition"
          aria-label="חזור"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Page title/subtitle */}
      {(title || subtitle) && (
        <div className="px-6 pt-2 pb-4 border-b border-white/5">
          <OnboardingHeader
            title={title || ''}
            subtitle={subtitle}
            className=""
          />
        </div>
      )}
    </div>
  ) : (
    // If navigation is hidden, just show title/subtitle if they exist
    (title || subtitle) ? (
      <div className="px-6 pt-2 pb-4">
        <OnboardingHeader
          title={title || ''}
          subtitle={subtitle}
          className=""
        />
      </div>
    ) : undefined
  );

  return (
    <div dir={dir}>
      <OnboardingLayout
        header={fullHeader}
        footer={
          footer ? (
            <div className="px-6 py-4">
              {footer}
            </div>
          ) : undefined
        }
        contentClassName="px-6"
        disableContentScroll={disableContentScroll}
      >
        {/* Add breathing room at the top of scrollable content */}
        <div className="pt-4 sm:pt-6 pb-4">
          {children}
        </div>
      </OnboardingLayout>
    </div>
  );
}
