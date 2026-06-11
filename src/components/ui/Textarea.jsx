import React from "react";

/**
 * Reusable Textarea component for Arus-SAMS UI library.
 * 
 * @param {Object} props
 * @param {string} props.label - The label for the textarea.
 * @param {string} props.className - Additional CSS classes.
 */
export default function Textarea({ label, className = "", ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-bold text-slate-700 block mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-sm ${className}`}
        {...props}
      />
    </div>
  );
}
