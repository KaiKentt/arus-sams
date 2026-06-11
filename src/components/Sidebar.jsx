import React from 'react';
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { 
  MapPinIcon, 
  QrCodeIcon, 
  VariableIcon, 
  BuildingOfficeIcon, 
  UsersIcon, 
  ArchiveBoxIcon, 
  PencilSquareIcon, 
  ShieldCheckIcon, 
  ArrowRightOnRectangleIcon, 
  XMarkIcon 
} from "@heroicons/react/24/outline";

export default function Sidebar({ session, userRole, currentTab, navigate, handleSignOut, sidebarOpen, setSidebarOpen }) {
  const role = session?.role || userRole || "";
  
  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`fixed md:static inset-y-0 left-0 w-72 bg-slate-900 text-white p-6 flex flex-col justify-between shadow-2xl z-30 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-6">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold tracking-tight text-teal-400">Arus-SAMS</h1>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <button onClick={() => navigate("my-profile")} className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors text-left ${currentTab === "my-profile" ? "bg-slate-800 border-teal-500 shadow-md" : "bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-600"}`}>
              {session?.profile_pic ? (
                <img src={session.profile_pic} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-slate-500" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold border border-teal-500 shadow-inner">
                  {session?.full_name ? session.full_name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-white truncate mb-1">{session?.full_name}</p>
                <Badge variant={role.toLowerCase() === "superadmin" ? "brand" : "success"}>
                  {role.replace("_", " ")}
                </Badge>
              </div>
            </button>
          </div>
          <div className="space-y-1">
            <button 
              onClick={() => navigate("locations")} 
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${currentTab === "locations" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
            >
              <MapPinIcon className="w-5 h-5" />
              Location Manager
            </button>
            
            <button 
              onClick={() => navigate("mobile-audit")} 
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${currentTab === "mobile-audit" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
            >
              <QrCodeIcon className="w-5 h-5" />
              QR Audit Input
            </button>
            
            <button 
              onClick={() => navigate("hydrological-simulator")} 
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${currentTab === "hydrological-simulator" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
            >
              <VariableIcon className="w-5 h-5" />
              iHYDRO Simulation Panel
            </button>
            
            {userRole !== "superadmin" && (
              <button 
                onClick={() => navigate("school")} 
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${currentTab === "school" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
              >
                <BuildingOfficeIcon className="w-5 h-5" />
                School Profile
              </button>
            )}
            
            {userRole === "headmaster" && (
              <button 
                onClick={() => navigate("admin-management")} 
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors border-t border-slate-800 mt-4 pt-4 ${currentTab === "admin-management" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
              >
                <UsersIcon className="w-5 h-5" />
                Manage School Staff
              </button>
            )}
            
            {userRole !== "superadmin" && (
              <button 
                onClick={() => navigate("asset-master-list")} 
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${currentTab === "asset-master-list" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
              >
                <ArchiveBoxIcon className="w-5 h-5" />
                Master Asset List
              </button>
            )}
            
            {userRole !== "standard_teacher" && userRole !== "superadmin" && (
              <button 
                onClick={() => navigate("asset-registration")} 
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${currentTab === "asset-registration" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
              >
                <PencilSquareIcon className="w-5 h-5" />
                Asset Registration
              </button>
            )}
            
            {userRole === "superadmin" && (
              <button 
                onClick={() => navigate("super-dashboard")} 
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${currentTab === "super-dashboard" ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
              >
                <ShieldCheckIcon className="w-5 h-5" />
                Ministry Portal
              </button>
            )}
          </div>
        </div>
        <div className="pt-6 border-t border-slate-800">
          <Button variant="danger" className="w-full flex items-center justify-center gap-2" onClick={handleSignOut}>
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
