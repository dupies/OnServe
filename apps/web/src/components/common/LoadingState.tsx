export function LoadingState({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}
