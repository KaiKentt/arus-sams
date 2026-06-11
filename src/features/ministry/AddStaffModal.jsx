import { useState } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { 
  UserPlusIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export default function AddStaffModal({ schools, onClose, refreshData }) {
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffFormError, setStaffFormError] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newIcNumber, setNewIcNumber] = useState("");
  const [newRole, setNewRole] = useState("headmaster");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffFormError("");

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

    const { error } = await supabase.functions.invoke("create-staff-user", {
      body: {
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
        role: newRole,
        icNumber: newIcNumber,
        schoolId: newRole === "superadmin" ? null : selectedSchoolId,
      },
    });

    setStaffLoading(false);

    if (error) {
      const contextError = error.context ? await error.context.json() : null;
      const actualMessage = contextError?.error || error.message;
      setStaffFormError("Registration Error: " + actualMessage);
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
      <Card className="w-full max-w-2xl relative fade-in max-h-[90vh] overflow-y-auto shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors z-30"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="sticky top-0 bg-white z-20 pb-4 border-b border-slate-100 mb-6 -mt-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
                <UserPlusIcon className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Create System User</h2>
            </div>
            <p className="text-sm text-slate-500">Provision a new personnel account with specific access roles.</p>
          </div>

          {staffFormError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold animate-shake">
              {staffFormError}
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="e.g. Ahmad bin Ali"
              />
              <Input
                label="IC Number"
                type="text"
                required
                value={newIcNumber}
                onChange={(e) => setNewIcNumber(e.target.value)}
                placeholder="e.g. 040813130993"
              />
              <Select
                label="System Role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                options={roleOptions}
                required
              />
              {newRole !== "superadmin" && (
                <Select
                  label="Assign to School"
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  options={[{ value: "", label: "-- Select a School --" }, ...schoolOptions]}
                  required
                  className="ring-1 ring-teal-100"
                />
              )}
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Login Email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Input
                  label="Temporary Password"
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8-15 characters"
                  className="bg-red-50/30"
                />
              </div>
              <p className="mt-2 text-[10px] font-bold text-red-400 uppercase tracking-widest">High-Security Field</p>
            </div>

            <div className="sticky bottom-0 bg-white z-20 pt-4 pb-2 border-t border-slate-100 mt-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={staffLoading}
                >
                  {staffLoading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Register User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
