export function Logo({ className }: { className?: string }) {
  return (
    <div className={className ?? ''}>
      <h1 className="font-serif text-xl sm:text-2xl tracking-[0.2em] font-bold text-[#1B3A38] uppercase">
        Match Experience
      </h1>
      <div className="w-10 h-[3px] bg-[#DD8B42] mt-2 rounded-full" />
    </div>
  );
}
