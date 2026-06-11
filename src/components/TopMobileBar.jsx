

export default function TopMobileBar({ setSidebarOpen }) {
  return (
    <div className="md:hidden flex items-center gap-3 bg-slate-900 text-white px-4 py-3 sticky top-0 z-10">
      <button onClick={() => setSidebarOpen(true)} className="text-2xl leading-none">
        ☰
      </button>
      <span className="font-bold text-teal-400 text-lg">Arus-SAMS</span>
    </div>
  );
}