"use client";

import { Search } from "lucide-react";
import { he } from "@/lib/i18n/he";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#b7c0c8]"
        size={20}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || he.workouts.searchPlaceholder}
        className="w-full bg-[#15181c] text-white placeholder-[#b7c0c8] rounded-xl px-4 py-3 pr-11 border border-[#2a3036] focus:border-[#E2F163] focus:outline-none transition-colors"
        dir="rtl"
      />
    </div>
  );
}
