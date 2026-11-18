export default function Card({ children, className = "", accentBar = false }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] border border-slate-200/80 overflow-hidden ${className}`}
    >
      {accentBar && <div className="glass-accent-bar w-full" />}
      {children}
    </div>
  );
}