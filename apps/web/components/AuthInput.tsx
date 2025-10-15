import * as React from "react";

export default function AuthInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={
        "input-dark w-full rounded-xl bg-black/30 px-4 py-3 text-white " +
        "placeholder:text-white/50 ring-1 ring-white/10 focus:ring-2 focus:ring-white/20 " +
        (props.className ?? "")
      }
    />
  );
}







