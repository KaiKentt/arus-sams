import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { 
  MapPinIcon, 
  QrCodeIcon, 
  BuildingOfficeIcon, 
  UsersIcon, 
  ArchiveBoxIcon, 
  PencilSquareIcon, 
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon, 
  XMarkIcon,
  ExclamationTriangleIcon // <-- Added emergency icon
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  {
    id: "super-dashboard",
    label: "Ministry Portal",
    icon: ShieldCheckIcon,
    allowedRoles: ["superadmin"]
  },
  {
    id: "evacuation-orders",
    label: "Evacuation Tasks",
    icon: ExclamationTriangleIcon,
    allowedRoles: ["headmaster", "asset_teacher", "standard_teacher"],
    requiresActiveEmergency: true // <-- Custom flag for conditional visibility
  },
  {
    id: "asset-master-list",
    label: "Master Asset List",
    icon: ArchiveBoxIcon,
    allowedRoles: ["headmaster", "asset_teacher", "standard_teacher"]
  }, 
  {
    id: "asset-registration",
    label: "Asset Registration",
    icon: PencilSquareIcon,
    allowedRoles: ["headmaster", "asset_teacher"]
  },
  {
    id: "locations",
    label: "Location Manager",
    icon: MapPinIcon,
    allowedRoles: ["superadmin", "headmaster", "asset_teacher", "standard_teacher"]
  },
  {
    id: "mobile-audit",
    label: "QR Audit Input",
    icon: QrCodeIcon,
    allowedRoles: ["headmaster", "asset_teacher"]
  },
  {
    id: "school",
    label: "School Profile",
    icon: BuildingOfficeIcon,
    allowedRoles: ["headmaster", "asset_teacher", "standard_teacher"]
  },
  {
    id: "admin-management",
    label: "Manage School Staff",
    icon: UsersIcon,
    allowedRoles: ["headmaster"],
    hasDivider: true
  }
];

export default function Sidebar({ session, userRole, schoolId, currentTab, navigate, handleSignOut, sidebarOpen, setSidebarOpen }) {
  const role = session?.role || userRole || "";
  const activeSchoolId = schoolId || session?.school_id;
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false);

  useEffect(() => {
    if (!activeSchoolId) return;

    // 1. Check if there are any active/pending evacuation orders for this school
    const checkEmergencyStatus = async () => {
      const { count, error } = await supabase
        .from("evacuation_orders")
        .select("*", { count: "exact", head: true })
        .eq("school_id", activeSchoolId)
        .in("status", ["pending", "in_progress"]);

      if (!error) {
        setHasActiveEmergency((count ?? 0) > 0);
      }
    };

    checkEmergencyStatus();

    // 2. Listen for immediate local trigger from SchoolFloodDashboard
    window.addEventListener("evacuation_generated", checkEmergencyStatus);

    // 3. Listen via Supabase Realtime so all logged-in teachers see the tab instantly
    const channel = supabase
      .channel(`emergency-status-${activeSchoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evacuation_orders",
          filter: `school_id=eq.${activeSchoolId}`,
        },
        () => {
          checkEmergencyStatus();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("evacuation_generated", checkEmergencyStatus);
      supabase.removeChannel(channel);
    };
  }, [activeSchoolId]);

  // Filter by role AND emergency status
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    const hasRole = item.allowedRoles.includes(role);
    if (!hasRole) return false;
    if (item.requiresActiveEmergency && !hasActiveEmergency) return false;
    return true;
  });

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
            {visibleNavItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => navigate(item.id)} 
                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded transition-colors ${
                  item.hasDivider ? "border-t border-slate-800 mt-4 pt-4" : ""
                } ${
                  currentTab === item.id 
                    ? (item.requiresActiveEmergency ? "bg-red-600 font-medium text-white" : "bg-teal-600 font-medium") 
                    : (item.requiresActiveEmergency ? "bg-red-950/50 text-red-300 hover:bg-red-900/60 border border-red-800/50" : "hover:bg-slate-800 text-slate-300")
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${item.requiresActiveEmergency ? "text-red-400 animate-pulse" : ""}`} />
                  {item.label}
                </span>
                {item.requiresActiveEmergency && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                    Live
                  </span>
                )}
              </button>
            ))}
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