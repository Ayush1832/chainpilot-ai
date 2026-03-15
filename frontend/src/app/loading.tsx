export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="relative w-16 h-16">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border-r-2 border-t-2 border-(--border) animate-spin" />
        {/* Inner static glow */}
        <div className="absolute inset-2 rounded-full bg-(--bg-secondary)/20 blur-sm" />
      </div>
      <p className="mt-6 text-sm font-medium text-(--text-secondary) tracking-wider">
        LOADING CHAINPILOT
      </p>
    </div>
  );
}
