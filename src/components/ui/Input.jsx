export default function Input({
  label,
  icon: Icon,
  rightElement,
  className = "",
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          className={`w-full ${Icon ? "pl-11" : "px-4"} ${
            rightElement ? "pr-11" : "pr-4"
          } py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm sm:text-[15px] placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 outline-none transition-all ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}