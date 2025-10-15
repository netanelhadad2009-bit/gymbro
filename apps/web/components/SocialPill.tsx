"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
};

export default function SocialPill({ children, onClick, icon, className }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      // key idea: neutralize any global resets
      className={[
        // fully reset most unwanted inherited styles
        "all-[unset]",
        // strong pill styling that SHOULD win (with !)
        "!w-full !rounded-full !bg-white/10 !backdrop-blur-sm !text-white !font-semibold",
        "!px-5 !py-4 !border !border-white/20 hover:!bg-white/15 !cursor-pointer",
        "!flex !items-center !justify-between",
        "!select-none !leading-none",
        "active:!scale-[0.99] transition",
        className || "",
      ].join(" ")}
      style={{
        WebkitAppearance: "none",
        appearance: "none",
      }}
    >
      {/* text right, icon left (RTL) */}
      <span className="!text-base !md:text-lg !mx-auto">{children}</span>
      {icon ? <span className="!ml-2 !text-xl">{icon}</span> : null}
    </div>
  );
}
