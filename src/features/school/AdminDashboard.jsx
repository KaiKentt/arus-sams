import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import AdminStaffTable from "./AdminStaffTable";
import AdminAddStaffForm from "./AdminAddStaffForm";
import AdminEditStaffForm from "./AdminEditStaffForm";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { 
  ClipboardDocumentListIcon, 
  UserPlusIcon, 
  MapPinIcon, 
  ArrowRightIcon 
} from "@heroicons/react/24/outline";

const AdminDashboard = ({ schoolId, onNavigate }) => {
  const [activeTab, setActiveTab] = useState("manage"); 
  const [staffList, setStaffList] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    if (schoolId) fetchSchoolName();
    if (activeTab === "manage") fetchStaffList();
  }, [schoolId, activeTab]);

  const fetchSchoolName = async () => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from("schools")
      .select("school_name")
      .eq("school_id", schoolId)
      .single();
    if (!error && data) setSchoolName(data.school_name);
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

  const handleDeleteStaff = async (staffId, staffName) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete ${staffName}'s access profile?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from("staff").delete().eq("id", staffId);
    if (error) {
      alert("Failed to delete staff: " + error.message);
    } else {
      fetchStaffList(); 
    }
  };

  const triggerEditMode = (staff) => {
    setEditingStaff(staff);
    setActiveTab("edit");
  };

  return (
    <div className="fade-in space-y-6 relative">
      {/* HEADER BANNER */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              School Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {schoolName || "Loading school details..."}
            </p>
          </div>
          
          {onNavigate && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => onNavigate("locations")}
                variant="secondary"
                className="px-4 py-2.5 text-sm"
              >
                <MapPinIcon className="w-5 h-5" />
                Location Manager
                <ArrowRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* TAB NAVIGATION */}
      <div className="flex gap-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("manage")}
          className={`flex items-center gap-2 pb-4 font-bold text-lg transition-all ${
            activeTab === "manage" 
              ? "text-teal-600 border-b-4 border-teal-600" 
              : "text-slate-400 hover:text-slate-600 border-b-4 border-transparent"
          }`}
        >
          <ClipboardDocumentListIcon className="w-6 h-6" />
          Master Staff List
        </button>
        <button
          onClick={() => setActiveTab("register")}
          className={`flex items-center gap-2 pb-4 font-bold text-lg transition-all ${
            activeTab === "register" 
              ? "text-teal-600 border-b-4 border-teal-600" 
              : "text-slate-400 hover:text-slate-600 border-b-4 border-transparent"
          }`}
        >
          <UserPlusIcon className="w-6 h-6" />
          Register New Staff
        </button>
      </div>

      {/* COMPONENTS RENDERING */}
      <div className="pt-2">
        {activeTab === "manage" && (
          <AdminStaffTable 
            staffList={staffList} 
            onEdit={triggerEditMode} 
            onDelete={handleDeleteStaff} 
          />
        )}

        {activeTab === "register" && (
          <AdminAddStaffForm 
            schoolId={schoolId} 
            onSuccess={() => setActiveTab("manage")} 
          />
        )}

        {activeTab === "edit" && editingStaff && (
          <AdminEditStaffForm 
            staff={editingStaff} 
            onSuccess={() => setActiveTab("manage")} 
            onCancel={() => setActiveTab("manage")} 
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;