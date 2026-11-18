export default function Select({
  label,
  options = [],
  children,
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
      <select
        className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm sm:text-[15px] focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 outline-none transition-all ${className}`}
        {...props}
      >
        {children ||
          options.map((option, index) => {
            const value = typeof option === "object" ? option.value : option;
            const labelText = typeof option === "object" ? option.label : option;
            return (
              <option key={`${value}-${index}`} value={value}>
                {labelText}
              </option>
            );
          })}
      </select>
    </div>
  );
}