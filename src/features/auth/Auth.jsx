import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { 
  ShieldCheckIcon, 
  InformationCircleIcon, 
  EnvelopeIcon, 
  PhoneIcon 
} from "@heroicons/react/24/outline";

export default function Auth({ onDemoLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
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
        alert("Login successful, but failed to fetch staff profile: " + staffError.message);
      } else if (staffData) {
        onDemoLogin(staffData);
      } else {
        alert("Login successful, but no matching staff profile found.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      
      {/* LEFT SIDE: BRAND & OBJECTIVES */}
      <div className="w-full md:w-1/2 bg-slate-900 p-12 flex flex-col justify-center text-white">
        <div className="max-w-md mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Arus-SAMS</h1>
            <p className="text-slate-400 font-medium">School Asset Management & Flood Mitigation System</p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <ShieldCheckIcon className="w-8 h-8 text-teal-500 shrink-0" />
              <div>
                <h3 className="font-bold">Project Objective</h3>
                <p className="text-sm text-slate-400">To centralize asset tracking and provide real-time hydrological flood alerts for educational facilities.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <InformationCircleIcon className="w-8 h-8 text-teal-500 shrink-0" />
              <div>
                <h3 className="font-bold">System Reliability</h3>
                <p className="text-sm text-slate-400">Powered by iHYDRO live telemetry data, ensuring school assets are protected by proactive intelligence.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: YOUR FUNCTIONAL LOGIN FORM */}
      <div className="w-full md:w-1/2 p-12 flex flex-col justify-center items-center bg-slate-50">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Staff Access Portal</h2>
            <p className="text-sm text-slate-500 mt-1">Please sign in to continue</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Institutional Email</label>
              <input 
                type="email" placeholder="teacher@school.edu.my"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Access Password</label>
              <input 
                type="password" placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow-md"
            >
              {loading ? "Authenticating..." : "Secure Login"}
            </button>
          </form>

          {/* FOOTER CONTACT */}
          <div className="pt-8 border-t border-slate-200 mt-8 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase">System Support</p>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <EnvelopeIcon className="w-4 h-4" /> support@arus-sams.gov.my
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <PhoneIcon className="w-4 h-4" /> +60 82-000 000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}