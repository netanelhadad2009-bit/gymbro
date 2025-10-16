'use client';
import React from 'react';
import MobileShell from '@/components/MobileShell';
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
    <div dir={dir} className="h-full">
      <MobileShell
        header={
          (title || subtitle) ? (
            <div className="px-6 pt-4 pb-6">
              <OnboardingHeader
                title={title || ''}
                subtitle={subtitle}
                className=""
              />
            </div>
          ) : undefined
        }
        footer={
          footer ? (
            <div className="px-6 pt-3 pb-3">
              {footer}
            </div>
          ) : undefined
        }
        className={disableContentScroll ? '' : 'px-6'}
        autoScroll={true} // Enable scrolling only on small screens
      >
        {children}
      </MobileShell>
    </div>
  );
}
