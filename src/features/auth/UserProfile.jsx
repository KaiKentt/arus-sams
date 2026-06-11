import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

const getPasswordStrength = (pwd) => {
  if (!pwd) return null;
  if (pwd.length < 6) return { label: "Too short", color: "text-red-500", bar: "bg-red-400", width: "w-1/4" };
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 2 && pwd.length >= 10) return { label: "Strong", color: "text-green-600", bar: "bg-green-500", width: "w-full" };
  if (score >= 1 || pwd.length >= 8) return { label: "Medium", color: "text-yellow-600", bar: "bg-yellow-400", width: "w-3/4" };
  return { label: "Weak", color: "text-orange-500", bar: "bg-orange-400", width: "w-1/2" };
};

const UserProfile = ({ session, onSessionUpdate }) => {
  const [profile, setProfile] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState({ name: "", code: "" });
  const [loading, setLoading] = useState(true);

  // Avatar edit
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (session && session.id) fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select("*")
      .eq("id", session.id)
      .single();

    if (staffError) {
      console.error("Error fetching profile:", staffError.message);
      setLoading(false);
      return;
    }
    setProfile(staffData);

    if (staffData.school_id) {
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("school_name, school_code")
        .eq("school_id", staffData.school_id)
        .single();
      if (!schoolError && schoolData) {
        setSchoolInfo({ name: schoolData.school_name, code: schoolData.school_code });
      }
    }
    setLoading(false);
  };

  const handleUpdateAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) { alert("Please select a new image file first."); return; }
    setIsUploading(true);

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png"];
    if (!ALLOWED_TYPES.includes(avatarFile.type) || avatarFile.size > MAX_FILE_SIZE) {
      alert("Upload Blocked: Invalid format or size. Max 2MB JPG/PNG.");
      setIsUploading(false);
      return;
    }

    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${profile.ic_number}-update-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatar").upload(fileName, avatarFile);

    if (uploadError) {
      alert("Image Upload Failed: " + uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatar").getPublicUrl(fileName);
    const finalProfilePicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("staff").update({ profile_pic: finalProfilePicUrl }).eq("id", profile.id);

    if (updateError) {
      alert("Database Update Failed: " + updateError.message);
    } else {
      setProfile({ ...profile, profile_pic: finalProfilePicUrl });
      if (onSessionUpdate) onSessionUpdate({ profile_pic: finalProfilePicUrl });
      setIsEditing(false);
      setAvatarFile(null);
    }
    setIsUploading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwLoading(true);

    // Verify current password
    const { data, error } = await supabase
      .from("staff").select("stored_password").eq("id", profile.id).single();

    if (error || !data) {
      setPwError("Could not verify your current password. Try again.");
      setPwLoading(false);
      return;
    }

    if (data.stored_password !== currentPassword) {
      setPwError("Current password is incorrect.");
      setPwLoading(false);
      return;
    }

    // Save new password
    const { error: updateError } = await supabase
      .from("staff").update({ stored_password: newPassword }).eq("id", profile.id);

    if (updateError) {
      setPwError("Failed to update password: " + updateError.message);
    } else {
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPwSuccess(false);
        setShowPasswordSection(false);
      }, 2500);
    }
    setPwLoading(false);
  };

  const cancelPasswordChange = () => {
    setShowPasswordSection(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwError(null);
    setPwSuccess(false);
  };

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  if (loading) return <div className="p-8 text-slate-500">Loading your profile...</div>;
  if (!profile) return <div className="p-8 text-red-500">Error: Could not load profile data.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">

      {/* ── MAIN PROFILE CARD ── */}
      <div className="bg-white p-8 rounded-xl shadow border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">My Personal Profile</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-slate-200"
            >
              📷 Change Picture
            </button>
          )}
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center space-x-6 mb-8">
          {profile.profile_pic ? (
            <img src={profile.profile_pic} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-4xl border-4 border-slate-100 shadow-sm">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-slate-800">{profile.full_name}</h3>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold capitalize
              ${profile.role === "superadmin" ? "bg-purple-100 text-purple-700"
                : profile.role === "headmaster" ? "bg-amber-100 text-amber-700"
                : "bg-teal-100 text-teal-700"}`}>
              {profile.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Avatar upload form */}
        {isEditing && (
          <form onSubmit={handleUpdateAvatar} className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Upload New Profile Picture</h4>
            <input
              type="file"
              accept="image/jpeg, image/png"
              onChange={(e) => setAvatarFile(e.target.files[0])}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 mb-4 border border-slate-300 p-2 rounded bg-white"
              required
            />
            <div className="flex space-x-3">
              <button type="button" onClick={() => { setIsEditing(false); setAvatarFile(null); }}
                className="w-1/3 bg-white border border-slate-300 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-50 transition-colors" disabled={isUploading}>
                Cancel
              </button>
              <button type="submit"
                className="w-2/3 bg-teal-600 text-white font-bold py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50" disabled={isUploading}>
                {isUploading ? "Uploading..." : "💾 Save Picture"}
              </button>
            </div>
          </form>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Email Address</p>
            <p className="text-slate-800 font-medium">{profile.email}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Phone Number</p>
            <p className="text-slate-800 font-medium">{profile.phone_no}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">IC Number</p>
            <p className="text-slate-800 font-mono">{profile.ic_number}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Assigned Institution</p>
            <p className="text-slate-800 font-medium">
              {profile.school_id
                ? `${schoolInfo.name || "Loading..."} (${schoolInfo.code || "..."})`
                : "Ministry Level (Superadmin)"}
            </p>
          </div>
        </div>
      </div>

      {/* ── PASSWORD CHANGE CARD ── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        {/* Section header — always visible, acts as toggle */}
        <button
          onClick={() => showPasswordSection ? cancelPasswordChange() : setShowPasswordSection(true)}
          className="w-full flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
              🔒
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800">Change Password</p>
              <p className="text-xs text-slate-400 mt-0.5">Update your account access password</p>
            </div>
          </div>
          <span className={`text-slate-400 text-sm font-bold transition-transform duration-200 ${showPasswordSection ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {/* Expandable form */}
        {showPasswordSection && (
          <div className="px-8 pb-8 border-t border-slate-100">

            {/* Success state */}
            {pwSuccess ? (
              <div className="mt-6 flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl">
                  ✓
                </div>
                <p className="font-bold text-green-700 text-lg">Password Updated!</p>
                <p className="text-sm text-slate-400">Your new password is now active.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-6 space-y-5">

                {/* Error banner */}
                {pwError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <span className="font-bold text-base">⚠</span>
                    {pwError}
                  </div>
                )}

                {/* Current password */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Enter your current password"
                      className="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold select-none">
                      {showCurrent ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 pt-1" />

                {/* New password */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
                      className="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold select-none">
                      {showNew ? "HIDE" : "SHOW"}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {newPassword.length > 0 && strength && (
                    <div className="mt-2 space-y-1">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.bar} ${strength.width}`} />
                      </div>
                      <p className={`text-xs font-semibold ${strength.color}`}>
                        Strength: {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      className={`w-full px-4 py-2.5 pr-12 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors
                        ${passwordsMatch ? "border-green-400 focus:ring-green-400"
                          : passwordsMismatch ? "border-red-400 focus:ring-red-400"
                          : "border-slate-300 focus:ring-teal-500"}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold select-none">
                      {showConfirm ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                  {passwordsMatch && (
                    <p className="mt-1.5 text-xs text-green-600 font-semibold">✓ Passwords match</p>
                  )}
                  {passwordsMismatch && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">✕ Passwords do not match</p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={cancelPasswordChange}
                    className="w-1/3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading || !currentPassword || !passwordsMatch}
                    className="w-2/3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pwLoading ? "Updating..." : "🔒 Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
