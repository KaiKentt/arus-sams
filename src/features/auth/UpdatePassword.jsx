import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  LockClosedIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

export default function UpdatePassword({ navigate }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [verifyingSession, setVerifyingSession] = useState(true);

  useEffect(() => {
    let ignore = false;

    // Listen for Supabase exchanging the recovery token from the URL
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (ignore) return;
      if (event === "PASSWORD_RECOVERY" || currentSession) {
        setErrorMessage("");
        setStatus("idle");
        setVerifyingSession(false);
      }
    });

    // Fallback check after token exchange completes
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (ignore) return;
        if (!session) {
          setErrorMessage(
            "Invalid or expired recovery link. Please request a new password reset link."
          );
          setStatus("error");
        }
        setVerifyingSession(false);
      });
    }, 800);

    return () => {
      ignore = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    navigate("login");
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      setStatus("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter carefully.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      // Sign out of temporary recovery session so teacher logs in cleanly with new password
      await supabase.auth.signOut();
      setTimeout(() => navigate("login"), 2500);
    }
  };

  return (
    <AuthLayout
      icon={LockClosedIcon}
      title="Set New Password"
      subtitle="Create a strong new password (minimum 8 characters) for your school account."
      footer={
        <button
          type="button"
          onClick={handleBackToLogin}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-teal-700 transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Sign In
        </button>
      }
    >
      {verifyingSession ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">
            Verifying security link...
          </p>
        </div>
      ) : status === "success" ? (
        <div className="bg-emerald-50 text-emerald-900 p-5 rounded-2xl text-center border border-emerald-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircleIcon className="w-7 h-7" />
          </div>
          <div>
            <p className="font-bold text-base">Password Updated Successfully!</p>
            <p className="text-xs sm:text-sm text-emerald-800/90 mt-1">
              Redirecting you to the Sign In portal...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {status === "error" && (
            <div className="text-red-700 text-xs sm:text-sm font-semibold bg-red-50 p-3.5 rounded-xl border border-red-200">
              {errorMessage}
            </div>
          )}

          <Input
            id="new-password"
            label="New Secure Password"
            icon={LockClosedIcon}
            type={showPassword ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
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

          <Input
            id="confirm-password"
            label="Confirm New Password"
            icon={LockClosedIcon}
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              disabled={status === "loading"}
            >
              {status === "loading"
                ? "Updating Password..."
                : "Save New Password"}
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}