import { useState } from "react";
import { supabase } from "../../supabaseClient";

export default function AdminEditStaffForm({ staff, onSuccess, onCancel }) {
  // Initialize local state with the passed-in staff prop
  const [formData, setFormData] = useState({
    full_name: staff.full_name,
    email: staff.email,
    phone_no: staff.phone_no,
    role: staff.role,
    stored_password: staff.stored_password,
  });

  const handleUpdateStaff = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("staff")
      .update(formData)
      .eq("id", staff.id);

    if (error) {
      alert("Update Failed: " + error.message);
    } else {
      alert("Staff Profile Updated Successfully!");
      onSuccess(); // Tells parent to switch tabs and refresh
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow border-t-4 border-blue-500 fade-in max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Update Profile: {staff.full_name}</h2>
          <p className="text-sm text-slate-500">Modify system credentials and details.</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 font-bold text-xl">✕</button>
      </div>

      <form onSubmit={handleUpdateStaff} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Workspace Scope</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="border p-2 w-full rounded bg-slate-50 font-medium text-slate-700">
              <option value="standard_teacher">Standard Classroom Teacher</option>
              <option value="asset_teacher">Authorized Asset Field Teacher</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
            <input type="tel" value={formData.phone_no} onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })} className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500" required />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-red-500">System Password</label>
          <input type="text" value={formData.stored_password} onChange={(e) => setFormData({ ...formData, stored_password: e.target.value })} className="border p-2 w-full rounded focus:ring-2 focus:ring-red-400 bg-red-50" required />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow hover:bg-blue-700 mt-6">
          💾 Save Profile Updates
        </button>
      </form>
    </div>
  );
}