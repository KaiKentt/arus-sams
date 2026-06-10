import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddStaffModal({ schools, onClose, refreshData }) {
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffFormError, setStaffFormError] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newIcNumber, setNewIcNumber] = useState("");
  const [newRole, setNewRole] = useState("headmaster"); // Updated default
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffFormError("");

    // Updated check for 'superadmin' without the dash
    if (!selectedSchoolId && newRole !== "superadmin") {
      setStaffFormError("You must select a school for this user role.");
      return;
    }

    const icRegex = /^\d{12}$/;
    if (!icRegex.test(newIcNumber)) {
      setStaffFormError("IC Number must be exactly 12 digits without dashes.");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 15) {
      setStaffFormError("Password must be between 8 and 15 characters.");
      return;
    }

    setStaffLoading(true);

    const { error } = await supabase.functions.invoke('create-staff-user', {
      body: {
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
        role: newRole,
        icNumber: newIcNumber,
        schoolId: newRole === "superadmin" ? null : selectedSchoolId,
      }
    });
    
    setStaffLoading(false);

    // Step 3: Deep error extraction
    if (error) {
      const contextError = error.context ? await error.context.json() : null;
      const actualMessage = contextError?.error || error.message;
      setStaffFormError("Registration Error: " + actualMessage);
    } else {
      refreshData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-bold text-slate-800 mb-6">Create System User</h3>

        {staffFormError && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold">
            {staffFormError}
          </div>
        )}

        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">Full Name</label>
            <input type="text" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. Ahmad bin Ali" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">IC Number</label>
            <input type="text" required value={newIcNumber} onChange={(e) => setNewIcNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. 040813130993" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">System Role</label>
            {/* Updated options to strictly match database check constraint */}
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white">
              <option value="headmaster">Headmaster (School Admin)</option>
              <option value="standard_teacher">Standard Teacher</option>
              <option value="asset_teacher">Asset Management Teacher</option>
              <option value="superadmin">Ministry (Super Admin)</option>
            </select>
          </div>

          {newRole !== "superadmin" && (
            <div>
              <label className="block text-sm font-bold text-teal-700">Assign to School</label>
              <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-teal-500 rounded-md bg-teal-50 shadow-sm" required>
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
            <label className="block text-sm font-bold text-slate-700">Login Email</label>
            <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">Temporary Password</label>
            <input type="text" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="8-15 characters" />
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={staffLoading} className="px-4 py-2 bg-indigo-600 rounded-md text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              {staffLoading ? "Creating..." : "Register User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}