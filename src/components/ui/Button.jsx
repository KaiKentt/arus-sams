export default function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  const baseStyle =
    "px-5 py-2.5 rounded-xl font-semibold text-sm sm:text-[15px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none inline-flex justify-center items-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1";

  const variants = {
    primary:
      "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/25 hover:-translate-y-0.5 active:translate-y-0 focus:ring-teal-500",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs hover:border-slate-400 hover:-translate-y-0.5 active:translate-y-0 focus:ring-slate-400",
    danger:
      "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:-translate-y-0.5 active:translate-y-0 focus:ring-red-400",
    ghost:
      "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 focus:ring-slate-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}