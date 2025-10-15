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
        hover:bg-[#d9f04f] active:scale-[0.99]
        transition
        disabled:opacity-30 disabled:cursor-not-allowed
        ${props.className || ''}
      `}
    >
      {children}
    </button>
  );
}
