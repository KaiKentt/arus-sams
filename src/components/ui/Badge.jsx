

export default function Badge({ children, variant = "neutral", icon: Icon }) {
  const baseStyle = "inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border";
  
  const variants = {
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    active: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    brand: "bg-teal-50 text-teal-700 border-teal-200"
  };

  return (
    <span className={`${baseStyle} ${variants[variant]}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}