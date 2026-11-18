export default function Textarea({ label, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm sm:text-[15px] placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 outline-none transition-all ${className}`}
        {...props}
      />
    </div>
  );
}