import { useState } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { 
  PencilSquareIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export default function EditStaffModal({
  staff,
  schools,
  onClose,
  refreshData,
}) {
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

    const { error } = await supabase.functions.invoke("update-staff-user", {
      body: updatePayload,
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

  const roleOptions = [
    { value: "headmaster", label: "Headmaster (School Admin)" },
    { value: "standard_teacher", label: "Standard Teacher" },
    { value: "asset_teacher", label: "Asset Management Teacher" },
    { value: "superadmin", label: "Ministry (Super Admin)" }
  ];

  const schoolOptions = schools.map(school => ({
    value: school.school_id,
    label: `${school.school_name} (${school.school_code})`
  }));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl relative fade-in flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* FIXED HEADER */}
        <div className="p-8 pb-4 border-b border-slate-100 flex justify-between items-start bg-white z-20">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
                <PencilSquareIcon className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Edit System User</h2>
            </div>
            <p className="text-sm text-slate-500">Modify personnel details and system access permissions.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 pt-6">
          {formError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold animate-shake">
              {formError}
            </div>
          )}

          <form id="edit-staff-form" onSubmit={handleUpdateStaff} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="IC Number"
                type="text"
                required
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
              />
              <Select
                label="System Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={roleOptions}
                required
              />
              {role !== "superadmin" && (
                <Select
                  label="Assign to School"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  options={[{ value: "", label: "-- Select a School --" }, ...schoolOptions]}
                  required
                  className="ring-1 ring-teal-100"
                />
              )}
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Login Email"
                    type="email"
                    disabled
                    value={staff.email}
                    className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                  />
                  <p className="mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Permanent ID</p>
                </div>
                <div>
                  <Input
                    label="Account Password"
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    className="bg-red-50/30"
                  />
                  <p className="mt-1.5 text-[10px] font-bold text-red-400 uppercase tracking-widest">High-Security Field</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* FIXED FOOTER */}
        <div className="p-8 pt-4 border-t border-slate-100 flex justify-end gap-3 bg-white z-20">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            form="edit-staff-form"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
