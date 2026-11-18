import { useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  ShieldCheckIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowRightIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

export default function Auth({ onDemoLogin, navigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setLoading(false);
      alert(authError.message || "Invalid credentials. Please try again.");
      return;
    }

    if (authData.user) {
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, role, full_name, school_id, email")
        .eq("id", authData.user.id)
        .single();

      setLoading(false);

      if (staffError) {
        alert(
          "Login successful, but failed to fetch staff profile: " +
            staffError.message
        );
      } else if (staffData) {
        onDemoLogin(staffData);
      } else {
        alert("Login successful, but no matching staff profile found.");
      }
    }
  };

  return (
    <div className="joc-light-root min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-10 bg-gradient-to-br from-slate-50 via-teal-50/70 to-emerald-50/80 text-slate-800">
      {/* Scoped Fonts & JoC Motion Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Sora:wght@300;400;600;700;800&display=swap');

        .joc-light-root {
          font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
        }
        .joc-font-sora {
          font-family: 'Sora', ui-sans-serif, system-ui, sans-serif;
        }
        @keyframes driftGlowLight {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(28px, -28px) scale(1.12); }
        }
        @keyframes floatOrbLight {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.45; }
          50% { transform: translateY(-24px) rotate(180deg); opacity: 0.85; }
          100% { transform: translateY(0) rotate(360deg); opacity: 0.45; }
        }
        @keyframes fadeUpCard {
          0% { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-drift-1 { animation: driftGlowLight 14s ease-in-out infinite alternate; }
        .animate-drift-2 { animation: driftGlowLight 11s ease-in-out -4s infinite alternate; }
        .animate-drift-3 { animation: driftGlowLight 16s ease-in-out -8s infinite alternate; }
        .animate-orb-a { animation: floatOrbLight 22s linear infinite; }
        .animate-orb-b { animation: floatOrbLight 18s linear -6s infinite; }
        .animate-orb-c { animation: floatOrbLight 25s linear -12s infinite; }
        .animate-fade-up { animation: fadeUpCard 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      {/* BACKGROUND AMBIENT LAYER (Daytime Teal & Emerald Glows + Floating Orbs) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Soft Daylight Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(240, 253, 250, 0.92) 0%, rgba(236, 253, 245, 0.85) 45%, rgba(224, 242, 254, 0.88) 100%)",
          }}
        />

        {/* Blurred Color Blobs */}
        <div
          className="animate-drift-1 absolute -top-28 -left-24 w-[480px] h-[480px] rounded-full blur-3xl opacity-35"
          style={{
            background: "radial-gradient(circle, #14b8a6, transparent 70%)",
          }}
        />
        <div
          className="animate-drift-2 absolute -bottom-24 -right-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
          style={{
            background: "radial-gradient(circle, #10b981, transparent 70%)",
          }}
        />
        <div
          className="animate-drift-3 absolute top-1/2 left-[60%] w-[320px] h-[320px] rounded-full blur-3xl opacity-25"
          style={{
            background: "radial-gradient(circle, #06b6d4, transparent 70%)",
          }}
        />

        {/* Floating Geometric Ring Orbs (Matching JoC) */}
        <div className="animate-orb-a absolute top-[14%] left-[8%] w-44 h-44 rounded-full border border-teal-600/15" />
        <div className="animate-orb-b absolute top-[70%] left-[76%] w-28 h-28 rounded-full border border-emerald-600/15" />
        <div className="animate-orb-c absolute top-[38%] left-[84%] w-16 h-16 rounded-full border border-teal-500/20" />
      </div>

      {/* CENTERED CONTENT WRAPPER */}
      <div className="animate-fade-up relative z-10 w-full max-w-[450px] flex flex-col items-center gap-6">
        {/* HERO HEADER (Matching JoC Hierarchy) */}
        <header className="text-center flex flex-col items-center gap-2.5">
          <h1 className="joc-font-sora text-4xl sm:text-[2.65rem] font-extrabold text-slate-900 leading-tight tracking-tight">
            Arus-SAMS
            <span className="block font-light italic text-xl sm:text-2xl text-teal-600 tracking-normal mt-0.5">
              Asset &amp; Flood Mitigation
            </span>
          </h1>

          {/* Collaboration Identity Row */}
          <div className="flex items-center gap-3 mt-1 bg-white/75 backdrop-blur-md px-4 py-2 rounded-2xl border border-teal-900/10 shadow-sm">
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

        {/* FROSTED GLASS LOGIN CARD */}
        <div className="w-full bg-white/90 backdrop-blur-2xl border border-teal-900/10 rounded-[24px] px-6 sm:px-7 pb-7 shadow-[0_24px_60px_-15px_rgba(13,148,136,0.16)] overflow-hidden relative">
          {/* 3px Top Accent Gradient Bar */}
          <div className="h-[4px] bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500 -mx-6 sm:-mx-7 mb-5" />

          {/* Partner / System Logos Row (Matching JoC .logos-row) */}
          <div className="flex items-center justify-center gap-4 py-2.5 px-4 bg-teal-50/80 border border-teal-600/15 rounded-2xl mb-5">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6 text-teal-600 shrink-0" />
              <span className="joc-font-sora text-xs font-bold text-teal-900 tracking-tight">
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

          {/* Card Header (Icon Badge + Title + Clear Instruction) */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-teal-600/25">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="joc-font-sora text-xl font-bold text-slate-900 leading-tight tracking-tight">
                Staff Access<span className="text-teal-600">@</span>Portal
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-600 mt-0.5 leading-snug">
                Please sign in using your{" "}
                <strong className="text-teal-700 font-semibold">
                  registered school email
                </strong>
              </p>
            </div>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="staff-email"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5"
              >
                Institutional Email
              </label>
              <input
                id="staff-email"
                type="email"
                placeholder="teacher@school.edu.my"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                required
              />
            </div>

            {/* Password Field + Forgot Password Link */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="staff-password"
                  className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
                >
                  Access Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate("forgot-password")}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800 underline-offset-2 hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 text-base text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-teal-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* JoC-Style Action Button with Icon Box & Sliding Arrow */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-base shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center shrink-0 transition-colors">
                  <LockClosedIcon className="w-5 h-5 text-white" />
                </div>
                <span className="flex-1 text-left tracking-wide">
                  {loading ? "Authenticating..." : "Sign In to Portal"}
                </span>
                <ArrowRightIcon className="w-5 h-5 text-white/80 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </form>

          {/* Divider + System Support Contact */}
          <div className="mt-6 pt-5 border-t border-slate-200/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Need Assistance? System Support
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5 text-xs sm:text-sm text-slate-600 font-medium">
              <a
                href="mailto:support@arus-sams.gov.my"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 transition-colors"
              >
                <EnvelopeIcon className="w-4 h-4 text-teal-600" />
                support@arus-sams.gov.my
              </a>
              <a
                href="tel:+6082000000"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 transition-colors"
              >
                <PhoneIcon className="w-4 h-4 text-teal-600" />
                +60 82-000 000
              </a>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER TAGLINE */}
        <p className="text-center text-xs text-slate-500 leading-relaxed">
          SK Rantau Panjang, Kuching &bull; Arus-SAMS Initiative
        </p>
      </div>
    </div>
  );
}