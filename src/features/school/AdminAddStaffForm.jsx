import { useState } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { 
  UserPlusIcon, 
  CheckCircleIcon, 
  ArrowPathIcon 
} from "@heroicons/react/24/outline";

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

  const roleOptions = [
    { value: "standard_teacher", label: "Standard Classroom Teacher" },
    { value: "asset_teacher", label: "Authorized Asset Field Teacher" }
  ];

  return (
    <Card className="p-8 w-full fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
          <UserPlusIcon className="w-8 h-8 text-teal-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Register School Staff Profile</h2>
      </div>
      <p className="text-sm text-slate-500 mb-8">Complete personnel provisioning for the institutional tenant.</p>
      
      <form onSubmit={handleRegisterStaff} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Full Name" 
            type="text" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
          />
          <Select 
            label="Workspace Scope" 
            value={role} 
            onChange={(e) => setRole(e.target.value)} 
            options={roleOptions}
            required
          />
          <Input 
            label="Official Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <Input 
            label="Phone Number" 
            type="tel" 
            value={phoneNo} 
            onChange={(e) => setPhoneNo(e.target.value)} 
            required 
          />
          <Input 
            label="IC Number" 
            type="text" 
            value={icNumber} 
            onChange={(e) => setIcNumber(e.target.value)} 
            required 
          />
          <Input 
            label="Profile Picture" 
            type="file" 
            accept="image/jpeg, image/png" 
            onChange={(e) => setAvatarFile(e.target.files[0])} 
          />
        </div>

        <div className="pt-6 border-t border-slate-100">
          <Input 
            label="System Password" 
            type="text" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="bg-red-50/30"
          />
          <p className="mt-2 text-[10px] font-bold text-red-400 uppercase tracking-widest">High-Security Field</p>
        </div>

        <Button 
          variant="primary" 
          type="submit" 
          disabled={isUploading} 
          className="w-full mt-6"
        >
          {isUploading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Provisioning...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Provision Complete Staff Identity
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}