'use client';

export default function PrimaryButton(
  { children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={`
        w-full h-12 rounded-full font-bold
        bg-[#E2F163] text-black
        active:scale-[0.98] active:opacity-90
        transition-all duration-100
        disabled:opacity-30 disabled:cursor-not-allowed
        ${props.className || ''}
      `}
    >
      {children}
    </button>
  );
}
