

export default function Button({ 
  children, 
  onClick, 
  variant = "primary", 
  className = "", 
  type = "button", 
  disabled = false 
}) {
  const baseStyle = "px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2";
  
  const variants = {
    primary: "bg-teal-600 hover:bg-teal-700 text-white shadow-md",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200",
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}