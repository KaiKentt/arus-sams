import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Button from "../../components/ui/Button";
import { 
  UserPlusIcon, 
  PlusCircleIcon 
} from "@heroicons/react/24/outline";

import SchoolsTable from "./SchoolsTable";
import StaffTable from "./StaffTable";
import AddSchoolModal from "./AddSchoolModal";
import EditSchoolModal from "./EditSchoolModal";
import AddStaffModal from "./AddStaffModal";
import EditStaffModal from "./EditStaffModal";
import MinistryOverview from "./MinistryOverview";
import AssetAnalytics from "../assets/AssetAnalytics"; 

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState([]);
  const [globalStaff, setGlobalStaff] = useState([]);
  const [globalAssets, setGlobalAssets] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");

  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  
  const [editingSchool, setEditingSchool] = useState(null); 
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    const { data: schoolsData, error: schoolsError } = await supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select(`*, schools (school_name)`);

    const { data: assetsData, error: assetsError } = await supabase
      .from("assets")
      .select("*");

    if (schoolsError) console.error("Schools fetch error:", schoolsError.message);
    if (staffError) console.error("Staff fetch error:", staffError.message);
    if (assetsError) console.error("Assets fetch error:", assetsError.message);

    if (schoolsData) setSchools(schoolsData);
    if (staffData) setGlobalStaff(staffData);
    if (assetsData) setGlobalAssets(assetsData); 
  };

  const handleDeleteSchool = async (schoolId, schoolName) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete ${schoolName}?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from("schools").delete().eq("school_id", schoolId);

    if (error) {
      alert("Failed to delete school. Make sure no staff members are assigned to this school before deleting. \n\nError: " + error.message);
    } else {
      fetchSystemData(); 
    }
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete user ${staffName}?`);
    if (!confirmDelete) return;

    const { error: dbError } = await supabase.from("staff").delete().eq("id", staffId);
    
    if (dbError) {
      alert("Failed to delete user.\n\nError: " + dbError.message);
      return;
    }
    
    fetchSystemData();
  };

  return (
    <div className="fade-in space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-2xl shadow-lg text-white gap-6">
        <div>
          <h2 className="text-3xl font-bold text-teal-400">
            Ministry Portal
          </h2>
          <p className="text-slate-400 mt-2">
            Manage all registered schools and global staff directory.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Button 
            onClick={() => setIsStaffModalOpen(true)} 
            variant="secondary"
            className="whitespace-nowrap"
          >
            <UserPlusIcon className="w-5 h-5" />
            Add System User
          </Button>
          <Button 
            onClick={() => setIsSchoolModalOpen(true)} 
            variant="primary"
            className="whitespace-nowrap"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Onboard New School
          </Button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-6 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("overview")} 
          className={`pb-3 font-bold text-lg transition-colors ${activeTab === "overview" ? "text-teal-600 border-b-4 border-teal-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          Global Overview
        </button>
        <button 
          onClick={() => setActiveTab("schools")} 
          className={`pb-3 font-bold text-lg transition-colors ${activeTab === "schools" ? "text-teal-600 border-b-4 border-teal-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          Schools Database
        </button>
        <button 
          onClick={() => setActiveTab("staff")} 
          className={`pb-3 font-bold text-lg transition-colors ${activeTab === "staff" ? "text-teal-600 border-b-4 border-teal-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          Staff Directory
        </button>
      </div>

      {/* CONDITIONAL RENDERING */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <MinistryOverview />
          <AssetAnalytics assets={globalAssets} />
        </div>
      )}

      {activeTab === "schools" && (
        <div className="fade-in">
          <SchoolsTable schools={schools} onEdit={setEditingSchool} onDelete={handleDeleteSchool} />
        </div>
      )}

      {activeTab === "staff" && (
        <div className="fade-in">
          <StaffTable globalStaff={globalStaff} onEdit={setEditingStaff} onDelete={handleDeleteStaff} />
        </div>
      )}

      {/* MODALS */}
      {isSchoolModalOpen && (
        <AddSchoolModal onClose={() => setIsSchoolModalOpen(false)} refreshData={fetchSystemData} />
      )}

      {editingSchool && (
        <EditSchoolModal school={editingSchool} onClose={() => setEditingSchool(null)} refreshData={fetchSystemData} />
      )}

      {isStaffModalOpen && (
        <AddStaffModal schools={schools} onClose={() => setIsStaffModalOpen(false)} refreshData={fetchSystemData} />
      )}

      {editingStaff && (
        <EditStaffModal staff={editingStaff} schools={schools} onClose={() => setEditingStaff(null)} refreshData={fetchSystemData} />
      )}
    </div>
  );
}