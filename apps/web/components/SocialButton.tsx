"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import React from "react";

type Provider = "google" | "apple";

export default function SocialButton({
  provider,
  label,
  onClick,
  loading = false,
}: {
  provider: Provider;
  label: string;      // e.g., "התחברות באמצעות Google"
  onClick: () => void;
  loading?: boolean;
}) {
  const icon =
    provider === "google" ? "/icons/google.svg" : "/icons/apple.svg";

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group w-full rounded-full bg-white text-black
                 py-3.5 px-5 shadow-md ring-1 ring-black/5
                 flex items-center justify-between gap-3
                 transition hover:shadow-lg active:scale-[.99]
                 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {/* RTL layout: icon on the right */}
      <span className="flex w-full items-center justify-between flex-row-reverse">
        <span className="inline-flex items-center gap-3">
          <Image src={icon} alt="" width={22} height={22} />
          <span className="font-semibold">{label}</span>
        </span>

        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <span className="opacity-0 group-hover:opacity-100 transition text-black/60">
            •••
          </span>
        )}
      </span>
    </button>
  );
}







