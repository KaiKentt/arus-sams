import React, { useState } from "react";
import { supabase } from "../supabaseClient"; 

export default function EditStaffModal({ staff, schools, onClose, refreshData }) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [fullName, setFullName] = useState(staff.full_name || "");
  const [icNumber, setIcNumber] = useState(staff.ic_number || "");
  const [role, setRole] = useState(staff.role || "headmaster");
  const [schoolId, setSchoolId] = useState(staff.school_id || "");
  const [password, setPassword] = useState(staff.stored_password || "");

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!schoolId && role !== "superadmin") {
      setFormError("You must select a school for this user role.");
      return;
    }

    setLoading(true);

    const updatePayload = {
      userId: staff.id,
      fullName: fullName,
      role: role,
      icNumber: icNumber,
      schoolId: role === "superadmin" ? null : schoolId,
    };

    // Only send password if it actually changed
    if (password !== staff.stored_password) {
      updatePayload.password = password;
    }

    const { error } = await supabase.functions.invoke('update-staff-user', {
      body: updatePayload
    });

    if (error) {
      const contextError = error.context ? await error.context.json() : null;
      const actualMessage = contextError?.error || error.message;
      setFormError("Update Error: " + actualMessage);
      setLoading(false);
    } else {
      refreshData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2 border-blue-500">
          ✏️ Edit System User
        </h3>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold">
            {formError}
          </div>
        )}

        <form onSubmit={handleUpdateStaff} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">Full Name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">IC Number</label>
            <input type="text" required value={icNumber} onChange={(e) => setIcNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">System Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="headmaster">Headmaster (School Admin)</option>
              <option value="standard_teacher">Standard Teacher</option>
              <option value="asset_teacher">Asset Management Teacher</option>
              <option value="superadmin">Ministry (Super Admin)</option>
            </select>
          </div>

          {role !== "superadmin" && (
            <div>
              <label className="block text-sm font-bold text-teal-700">Assign to School</label>
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-teal-500 rounded-md bg-teal-50" required>
                <option value="" disabled>-- Select a School --</option>
                {schools.map((school) => (
                  <option key={school.school_id} value={school.school_id}>
                    {school.school_name} ({school.school_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 mt-4">
            <label className="block text-sm font-bold text-slate-700">Login Email (Cannot be changed)</label>
            <input type="email" disabled value={staff.email} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-500 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">Account Password</label>
            <input type="text" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" minLength={8} />
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 rounded-md text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}