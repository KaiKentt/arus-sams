import { Bars3Icon } from "@heroicons/react/24/outline";

export default function TopMobileBar({ setSidebarOpen }) {
  return (
    <header className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3.5 sticky top-0 z-20 border-b border-slate-800 shadow-md">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
          <span className="font-display font-extrabold text-teal-400 text-lg tracking-tight">
            Arus-SAMS
          </span>
        </div>
      </div>
    </header>
  );
}