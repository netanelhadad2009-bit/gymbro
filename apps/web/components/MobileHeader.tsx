export default function MobileHeader({ title }: { title: string }) {
  return (
    <header className="w-full">
      <div className="h-12 flex items-center justify-center">
        <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
      </div>
      <div className="h-px bg-white/10" />
    </header>
  );
}
