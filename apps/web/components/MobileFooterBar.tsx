type Props = { ctaText?: string; onClick?: () => void; children?: React.ReactNode };

export default function MobileFooterBar({ ctaText, onClick, children }: Props) {
  return (
    <footer className="w-full px-4 pt-3 pb-3">
      {children ?? (
        <button
          onClick={onClick}
          className="btn w-full rounded-full py-3 text-black font-bold bg-[#E2F163] active:opacity-90"
        >
          {ctaText ?? "הבא"}
        </button>
      )}
    </footer>
  );
}
