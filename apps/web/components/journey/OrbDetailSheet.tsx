/**
 * OrbDetailSheet - Detail sheet wrapper for orb nodes
 *
 * Reuses existing MilestoneDetailSheet logic with orb-specific theming
 */

'use client';

import { MilestoneDetailSheet } from './MilestoneDetailSheet';
import { OrbTask } from '@/lib/journey/stages/useOrbs';

interface OrbDetailSheetProps {
  orb: OrbTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (taskId: string) => Promise<void>;
  onGoToActiveStage?: () => void;
}

export function OrbDetailSheet({
  orb,
  open,
  onOpenChange,
  onComplete,
  onGoToActiveStage,
}: OrbDetailSheetProps) {
  // Pass the original task to MilestoneDetailSheet
  // The orb's accent color is already computed in useOrbs
  return (
    <MilestoneDetailSheet
      task={orb?.originalTask || null}
      open={open}
      onOpenChange={onOpenChange}
      onComplete={onComplete}
      avatarColor={orb?.accentHex || '#E2F163'}
      onGoToActiveStage={onGoToActiveStage}
    />
  );
}
