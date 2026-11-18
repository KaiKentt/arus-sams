import {
  ShieldCheckIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

export default function AuthLayout({
  icon: CardIcon = ShieldCheckIcon,
  title,
  subtitle,
  children,
  footer,
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-10 auth-backdrop text-slate-800">
      {/* AMBIENT BACKGROUND LAYER (Centralized in index.css) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Soft Drifting Teal & Emerald Glows */}
        <div className="auth-glow-1 absolute -top-28 -left-24 w-[480px] h-[480px] rounded-full blur-3xl opacity-35" />
        <div className="auth-glow-2 absolute -bottom-24 -right-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-30" />
        <div className="auth-glow-3 absolute top-1/2 left-[60%] w-[320px] h-[320px] rounded-full blur-3xl opacity-25" />

        {/* Floating Geometric Ring Orbs */}
        <div className="auth-orb-1 absolute top-[14%] left-[8%] w-44 h-44 rounded-full border border-teal-600/15" />
        <div className="auth-orb-2 absolute top-[70%] left-[76%] w-28 h-28 rounded-full border border-emerald-600/15" />
        <div className="auth-orb-3 absolute top-[38%] left-[84%] w-16 h-16 rounded-full border border-teal-500/20" />
      </div>

      {/* CENTERED CONTENT WRAPPER */}
      <div className="fade-in relative z-10 w-full max-w-[450px] flex flex-col items-center gap-6">
        {/* HERO HEADER */}
        <header className="text-center flex flex-col items-center gap-2.5">
          <h1 className="font-display text-4xl sm:text-[2.65rem] font-extrabold text-slate-900 leading-tight tracking-tight">
            Arus-SAMS
            <span className="block font-light italic text-xl sm:text-2xl text-teal-600 tracking-normal mt-0.5">
              Asset &amp; Flood Mitigation
            </span>
          </h1>

          {/* School Collaboration Identity Badge */}
          <div className="flex items-center gap-3 mt-1 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-teal-900/10 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-teal-600/10 border border-teal-600/20 flex items-center justify-center text-teal-700 shrink-0">
              <AcademicCapIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                SK Rantau Panjang, Kuching
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                In collaboration with Arus-SAMS System
              </p>
            </div>
          </div>
        </header>

        {/* FROSTED GLASS CARD */}
        <div className="glass-card w-full rounded-[24px] px-6 sm:px-7 pb-7 overflow-hidden relative">
          {/* Top Gradient Accent Bar */}
          <div className="glass-accent-bar -mx-6 sm:-mx-7 mb-5" />

          {/* Partner Emblems Strip */}
          <div className="flex items-center justify-center gap-4 py-2.5 px-4 bg-teal-50/80 border border-teal-600/15 rounded-2xl mb-5">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6 text-teal-600 shrink-0" />
              <span className="font-display text-xs font-bold text-teal-900 tracking-tight">
                Arus-SAMS
              </span>
            </div>
            <div className="w-px h-5 bg-teal-900/15" />
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="text-xs font-bold text-slate-700">
                SK Rantau Panjang
              </span>
            </div>
          </div>

          {/* Card Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-teal-600/25">
              <CardIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 leading-tight tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-[13px] text-slate-600 mt-0.5 leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Form / Page Body */}
          {children}

          {/* Optional Card Footer */}
          {footer && (
            <div className="mt-6 pt-5 border-t border-slate-200/80">
              {footer}
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER TAGLINE */}
        <p className="text-center text-xs text-slate-500 leading-relaxed">
          SK Rantau Panjang, Kuching &bull; Arus-SAMS Initiative
        </p>
      </div>
    </div>
  );
}