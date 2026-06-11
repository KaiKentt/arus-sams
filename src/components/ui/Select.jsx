

/**
 * Reusable Select component for Arus-SAMS UI library.
 * 
 * @param {Object} props
 * @param {string} props.label - The label for the select dropdown.
 * @param {Array} props.options - Array of options (either strings or { label, value } objects).
 * @param {React.ReactNode} props.children - Optional children to override options array.
 * @param {string} props.className - Additional CSS classes.
 */
export default function Select({ label, options = [], children, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-bold text-slate-700 block mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm ${className}`}
        {...props}
      >
        {children || options.map((option, index) => {
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
