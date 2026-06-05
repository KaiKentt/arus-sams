import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const AdminDashboard = ({ schoolId }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState("manage"); // 'register', 'manage', or 'edit'

  // Registration Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("standard_teacher");
  const [icNumber, setIcNumber] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Management States
  const [staffList, setStaffList] = useState([]);
  const [schoolName, setSchoolName] = useState("");

  // Fetch staff data on load and when switching to the 'manage' tab
  // Fetch data on load and when switching tabs
  useEffect(() => {
    if (schoolId) {
      fetchSchoolName();
    }
    if (activeTab === "manage") {
      fetchStaffList();
    }
  }, [schoolId, activeTab]);

  // ADD THIS NEW FUNCTION:
  const fetchSchoolName = async () => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from("schools")
      .select("school_name")
      .eq("school_id", schoolId)
      .single();

    if (!error && data) {
      setSchoolName(data.school_name);
    }
  };

  const fetchStaffList = async () => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("school_id", schoolId)
      .order("full_name", { ascending: true });

    if (!error && data) setStaffList(data);
  };

  // ==========================================
  // ACTION: REGISTER STAFF
  // ==========================================
  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    const cleanIcNumber = icNumber.replace(/-/g, "");

    const { data: existingStaff } = await supabase
      .from("staff")
      .select("ic_number")
      .eq("ic_number", cleanIcNumber);
    if (existingStaff && existingStaff.length > 0) {
      alert(
        "Registration Failed: A staff member with IC Number (" +
          cleanIcNumber +
          ") already exists.",
      );
      setIsUploading(false);
      return;
    }

    let finalProfilePicUrl = null;
    if (avatarFile) {
      const MAX_FILE_SIZE = 2 * 1024 * 1024;
      const ALLOWED_TYPES = ["image/jpeg", "image/png"];
      if (
        !ALLOWED_TYPES.includes(avatarFile.type) ||
        avatarFile.size > MAX_FILE_SIZE
      ) {
        alert("Upload Blocked: Invalid format or size. Max 2MB JPG/PNG.");
        setIsUploading(false);
        return;
      }
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${cleanIcNumber}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatar")
        .upload(fileName, avatarFile);
      if (uploadError) {
        alert("Image Upload Failed");
        setIsUploading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("avatar")
        .getPublicUrl(fileName);
      finalProfilePicUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("staff").insert([
      {
        full_name: fullName,
        email: email,
        stored_password: password,
        role: role,
        ic_number: cleanIcNumber,
        phone_no: phoneNo,
        school_id: schoolId,
        profile_pic: finalProfilePicUrl,
      },
    ]);

    setIsUploading(false);

    if (insertError) {
      alert("Database Error: " + insertError.message);
    } else {
      alert("Comprehensive Staff Profile Registered Successfully!");
      setFullName("");
      setEmail("");
      setPassword("");
      setIcNumber("");
      setPhoneNo("");
      setAvatarFile(null);
      setActiveTab("manage"); // Automatically switch back to the list view!
    }
  };

  // ==========================================
  // ACTION: DELETE STAFF
  // ==========================================
  const handleDeleteStaff = async (staffId, staffName) => {
    // Safety prompt before deleting
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete ${staffName}'s access profile?`,
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from("staff").delete().eq("id", staffId);

    if (error) {
      alert("Failed to delete staff: " + error.message);
    } else {
      fetchStaffList(); // Refresh table instantly
    }
  };

  // ==========================================
  // ACTION: PREPARE EDIT
  // ==========================================
  const triggerEditMode = (staff) => {
    setEditingStaff(staff);
    setActiveTab("edit");
  };

  // ==========================================
  // ACTION: SAVE UPDATES
  // ==========================================
  const handleUpdateStaff = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from("staff")
      .update({
        full_name: editingStaff.full_name,
        email: editingStaff.email,
        phone_no: editingStaff.phone_no,
        role: editingStaff.role,
        stored_password: editingStaff.stored_password,
      })
      .eq("id", editingStaff.id);

    if (error) {
      alert("Update Failed: " + error.message);
    } else {
      alert("Staff Profile Updated Successfully!");
      setEditingStaff(null);
      setActiveTab("manage"); // Send back to table
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 fade-in">
      {/* SUB-NAVIGATION TABS */}
      <div className="flex space-x-2 bg-white p-2 rounded-lg shadow border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("manage")}
          className={`px-6 py-2.5 rounded-md font-bold text-sm transition-colors ${activeTab === "manage" ? "bg-teal-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
        >
          📋 Master Staff List
        </button>
        <button
          onClick={() => setActiveTab("register")}
          className={`px-6 py-2.5 rounded-md font-bold text-sm transition-colors ${activeTab === "register" ? "bg-teal-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
        >
          ➕ Register New Staff
        </button>
      </div>

      {/* VIEW: MANAGE STAFF TABLE */}
      {activeTab === "manage" && (
        <div className="bg-white p-8 rounded-xl shadow border border-slate-200 fade-in">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            {schoolName ? `${schoolName} Master Staff List` : "Loading Master Staff List..."}
          </h2>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Profile
                  </th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Staff Details
                  </th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Role Scope
                  </th>
                  <th className="p-4 font-bold text-slate-600 text-xs uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400">
                      No staff members provisioned.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Profile Picture */}
                      <td className="p-4 align-middle">
                        {staff.profile_pic ? (
                          <img
                            src={staff.profile_pic}
                            alt={staff.full_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-500 font-bold">
                            {staff.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>

                      {/* Details */}
                      <td className="p-4 align-middle">
                        <p className="font-bold text-slate-800">
                          {staff.full_name}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          {staff.email} | {staff.phone_no}
                        </p>
                        <p className="font-mono text-slate-400 text-[10px] mt-1">
                          IC: {staff.ic_number}
                        </p>
                      </td>

                      {/* Role */}
                      <td className="p-4 align-middle">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${staff.role === "asset_teacher" ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700"}`}
                        >
                          {staff.role === "asset_teacher"
                            ? "Asset Field Ops"
                            : "Classroom Standard"}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 align-middle text-right space-x-3">
                        <button
                          onClick={() => triggerEditMode(staff)}
                          className="text-xl hover:scale-110 transition-transform"
                          title="Edit Profile"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteStaff(staff.id, staff.full_name)
                          }
                          className="text-xl hover:scale-110 transition-transform"
                          title="Delete Profile"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: REGISTER STAFF FORM */}
      {activeTab === "register" && (
        <div className="bg-white p-8 rounded-xl shadow border border-slate-200 fade-in max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Register School Staff Profile
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Complete personnel provisioning for the institutional tenant.
          </p>
          <form onSubmit={handleRegisterStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Workspace Scope
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="border p-2 w-full rounded bg-slate-50 font-medium text-slate-700"
                >
                  <option value="standard_teacher">
                    Standard Classroom Teacher
                  </option>
                  <option value="asset_teacher">
                    Authorized Asset Field Teacher
                  </option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  IC Number
                </label>
                <input
                  type="text"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Profile Picture
                </label>
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                  className="border p-1.5 w-full rounded text-sm"
                />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-red-500">
                System Password
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border p-2 w-full rounded focus:ring-2 focus:ring-red-400 bg-red-50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isUploading}
              className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg shadow hover:bg-teal-700 mt-6 disabled:bg-teal-400"
            >
              {isUploading
                ? "Provisioning..."
                : "Provision Complete Staff Identity"}
            </button>
          </form>
        </div>
      )}

      {/* VIEW: EDIT STAFF FORM */}
      {activeTab === "edit" && editingStaff && (
        <div className="bg-white p-8 rounded-xl shadow border-t-4 border-blue-500 fade-in max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Update Profile: {editingStaff.full_name}
              </h2>
              <p className="text-sm text-slate-500">
                Modify system credentials and details.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("manage")}
              className="text-slate-400 hover:text-slate-700 font-bold text-xl"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleUpdateStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editingStaff.full_name}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      full_name: e.target.value,
                    })
                  }
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Workspace Scope
                </label>
                <select
                  value={editingStaff.role}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, role: e.target.value })
                  }
                  className="border p-2 w-full rounded bg-slate-50 font-medium text-slate-700"
                >
                  <option value="standard_teacher">
                    Standard Classroom Teacher
                  </option>
                  <option value="asset_teacher">
                    Authorized Asset Field Teacher
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, email: e.target.value })
                  }
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editingStaff.phone_no}
                  onChange={(e) =>
                    setEditingStaff({
                      ...editingStaff,
                      phone_no: e.target.value,
                    })
                  }
                  className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-red-500">
                System Password
              </label>
              <input
                type="text"
                value={editingStaff.stored_password}
                onChange={(e) =>
                  setEditingStaff({
                    ...editingStaff,
                    stored_password: e.target.value,
                  })
                }
                className="border p-2 w-full rounded focus:ring-2 focus:ring-red-400 bg-red-50"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow hover:bg-blue-700 mt-6"
            >
              💾 Save Profile Updates
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
