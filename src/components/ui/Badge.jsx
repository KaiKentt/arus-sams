export default function Badge({ children, variant = "neutral", icon: Icon }) {
  const baseStyle =
    "inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border";

  const variants = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
    alert: "bg-amber-50 text-amber-800 border-amber-200",
    warning: "bg-orange-50 text-orange-800 border-orange-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    brand: "bg-teal-50 text-teal-700 border-teal-200",
  };

  return (
    <span className={`${baseStyle} ${variants[variant] || variants.neutral}`}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}