import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AdminAddStaffForm({ schoolId, onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("standard_teacher");
  const [icNumber, setIcNumber] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    const cleanIcNumber = icNumber.replace(/-/g, "");

    let finalProfilePicUrl = null;
    if (avatarFile) {
      const MAX_FILE_SIZE = 2 * 1024 * 1024;
      const ALLOWED_TYPES = ["image/jpeg", "image/png"];
      if (!ALLOWED_TYPES.includes(avatarFile.type) || avatarFile.size > MAX_FILE_SIZE) {
        alert("Upload Blocked: Invalid format or size. Max 2MB JPG/PNG.");
        setIsUploading(false);
        return;
      }
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${cleanIcNumber}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatar").upload(fileName, avatarFile);
      if (uploadError) {
        alert("Image Upload Failed");
        setIsUploading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("avatar").getPublicUrl(fileName);
      finalProfilePicUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.functions.invoke('create-staff-user', {
        body: {
            email,
            password,
            fullName,
            role,
            icNumber: cleanIcNumber,
            phoneNo,
            schoolId,
            profilePicUrl: finalProfilePicUrl,
        }
    });

    setIsUploading(false);

    // Step 3: Deep error extraction
    if (error) {
        const contextError = error.context ? await error.context.json() : null;
        const actualMessage = contextError?.error || error.message;
        alert("Registration Failed: " + actualMessage);
    } else {
        alert("Comprehensive Staff Profile Registered Successfully!");
        onSuccess();
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow border border-slate-200 fade-in max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Register School Staff Profile</h2>
      <p className="text-sm text-slate-500 mb-6">Complete personnel provisioning for the institutional tenant.</p>
      <form onSubmit={handleRegisterStaff} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Workspace Scope</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="border p-2 w-full rounded bg-slate-50 font-medium text-slate-700">
              <option value="standard_teacher">Standard Classroom Teacher</option>
              <option value="asset_teacher">Authorized Asset Field Teacher</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
            <input type="tel" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IC Number</label>
            <input type="text" value={icNumber} onChange={(e) => setIcNumber(e.target.value)} className="border p-2 w-full rounded focus:ring-2 focus:ring-teal-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profile Picture</label>
            <input id="avatarInput" type="file" accept="image/jpeg, image/png" onChange={(e) => setAvatarFile(e.target.files[0])} className="border p-1.5 w-full rounded text-sm" />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-red-500">System Password</label>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 w-full rounded focus:ring-2 focus:ring-red-400 bg-red-50" required />
        </div>
        <button type="submit" disabled={isUploading} className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg shadow hover:bg-teal-700 mt-6 disabled:bg-teal-400">
          {isUploading ? "Provisioning..." : "Provision Complete Staff Identity"}
        </button>
      </form>
    </div>
  );
}