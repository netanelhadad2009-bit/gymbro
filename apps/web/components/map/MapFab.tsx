'use client';
import { Map as MapIcon } from 'lucide-react';

interface MapFabProps {
  onClick?: () => void;
  className?: string;
}

export default function MapFab({ onClick, className = '' }: MapFabProps) {
  return (
    <div
      className={`relative z-[10] inline-flex items-center justify-center [--fab-size:68px] md:[--fab-size:76px] ${className}`}
      style={{ width: 'var(--fab-size)', height: 'var(--fab-size)' }}
    >
      <button
        onClick={onClick}
        aria-label="Map"
        className="w-full h-full rounded-full bg-[#E2F163] hover:bg-[#D7EA5F] active:bg-[#C7DA54] text-black shadow-2xl ring-4 ring-[#E2F163]/30 flex items-center justify-center transition-all active:scale-95"
      >
        <MapIcon className="w-[42%] h-[42%]" strokeWidth={2.5} />
      </button>
    </div>
  );
}
