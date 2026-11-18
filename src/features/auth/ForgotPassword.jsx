import { useState } from "react";
import { supabase } from "../../supabaseClient";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  KeyIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function ForgotPassword({ navigate }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  return (
    <AuthLayout
      icon={KeyIcon}
      title="Reset Password"
      subtitle="Enter your official school email to receive a secure recovery link."
      footer={
        <button
          type="button"
          onClick={() => navigate("login")}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-teal-700 transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Sign In
        </button>
      }
    >
      {status === "success" ? (
        <div className="bg-emerald-50 text-emerald-900 p-5 rounded-2xl text-center border border-emerald-200 space-y-3">
          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-base">Recovery Email Sent</p>
            <p className="text-xs sm:text-sm text-emerald-800/90 mt-1 leading-relaxed">
              We have sent a password reset link to{" "}
              <strong className="font-semibold">{email}</strong>. Please check
              your inbox (and spam folder).
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRequestReset} className="space-y-4">
          {status === "error" && (
            <div className="text-red-700 text-xs sm:text-sm font-semibold bg-red-50 p-3.5 rounded-xl border border-red-200">
              {errorMessage}
            </div>
          )}

          <Input
            id="recovery-email"
            label="Institutional Email Address"
            icon={EnvelopeIcon}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.edu.my"
          />

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              disabled={status === "loading"}
            >
              {status === "loading"
                ? "Sending Recovery Link..."
                : "Send Recovery Link"}
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}