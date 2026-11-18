import { useState } from "react";
import { supabase } from "../../supabaseClient";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import {
  ShieldCheckIcon,
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

  const supportFooter = (
    <>
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
    </>
  );

  return (
    <AuthLayout
      icon={ShieldCheckIcon}
      title={
        <>
          Staff Access<span className="text-teal-600">@</span>Portal
        </>
      }
      subtitle={
        <>
          Please sign in using your{" "}
          <strong className="text-teal-700 font-semibold">
            registered school email
          </strong>
        </>
      }
      footer={supportFooter}
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          id="staff-email"
          label="Institutional Email"
          icon={EnvelopeIcon}
          type="email"
          placeholder="teacher@school.edu.my"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

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
              className="text-xs font-bold text-teal-600 hover:text-teal-800 underline-offset-2 hover:underline transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          <Input
            id="staff-password"
            icon={LockClosedIcon}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="p-1 text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            }
          />
        </div>

        {/* JoC-Style Primary Submit Button */}
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
    </AuthLayout>
  );
}