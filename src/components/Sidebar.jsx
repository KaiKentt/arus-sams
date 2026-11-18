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
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  {
    id: "super-dashboard",
    label: "Ministry Portal",
    icon: ShieldCheckIcon,
    allowedRoles: ["superadmin"],
  },
  {
    id: "evacuation-orders",
    label: "Evacuation Tasks",
    icon: ExclamationTriangleIcon,
    allowedRoles: ["headmaster", "asset_teacher", "standard_teacher"],
    requiresActiveEmergency: true,
  },
  {
    id: "asset-master-list",
    label: "Master Asset List",
    icon: ArchiveBoxIcon,
    allowedRoles: ["headmaster", "asset_teacher", "standard_teacher"],
  },
  {
    id: "asset-registration",
    label: "Asset Registration",
    icon: PencilSquareIcon,
    allowedRoles: ["headmaster", "asset_teacher"],
  },
  {
    id: "locations",
    label: "Location Manager",
    icon: MapPinIcon,
    allowedRoles: [
      "superadmin",
      "headmaster",
      "asset_teacher",
      "standard_teacher",
    ],
  },
  {
    id: "mobile-audit",
    label: "QR Audit Input",
    icon: QrCodeIcon,
    allowedRoles: ["headmaster", "asset_teacher"],
  },
  {
    id: "school",
    label: "School Profile",
    icon: BuildingOfficeIcon,
    allowedRoles: ["headmaster", "asset_teacher", "standard_teacher"],
  },
  {
    id: "admin-management",
    label: "Manage School Staff",
    icon: UsersIcon,
    allowedRoles: ["headmaster"],
    hasDivider: true,
  },
];

// Pure async helper outside component (prevents ESLint set-state-in-effect warnings)
async function fetchActiveEmergencyStatus(schoolId) {
  const { count, error } = await supabase
    .from("evacuation_orders")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .in("status", ["pending", "in_progress"]);

  if (error) return false;
  return (count ?? 0) > 0;
}

export default function Sidebar({
  session,
  userRole,
  schoolId,
  currentTab,
  navigate,
  handleSignOut,
  sidebarOpen,
  setSidebarOpen,
}) {
  const role = session?.role || userRole || "";
  const activeSchoolId = schoolId || session?.school_id;
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false);

  useEffect(() => {
    if (!activeSchoolId) return;
    let ignore = false;

    const refreshStatus = () => {
      fetchActiveEmergencyStatus(activeSchoolId).then((isActive) => {
        if (!ignore) setHasActiveEmergency(isActive);
      });
    };

    refreshStatus();

    window.addEventListener("evacuation_generated", refreshStatus);

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
          refreshStatus();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      window.removeEventListener("evacuation_generated", refreshStatus);
      supabase.removeChannel(channel);
    };
  }, [activeSchoolId]);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    const hasRole = item.allowedRoles.includes(role);
    if (!hasRole) return false;
    if (item.requiresActiveEmergency && !hasActiveEmergency) return false;
    return true;
  });

  const handleNavClick = (tabId) => {
    navigate(tabId);
    if (setSidebarOpen) setSidebarOpen(false);
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 bg-slate-900 text-white p-6 flex flex-col justify-between shadow-2xl border-r border-slate-800/80 z-30 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Brand & Profile Card */}
          <div className="border-b border-slate-800 pb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_10px_#2dd4bf]" />
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-teal-400">
                  Arus-SAMS
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation menu"
                className="md:hidden text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleNavClick("my-profile")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                currentTab === "my-profile"
                  ? "bg-slate-800 border-teal-500/80 shadow-md"
                  : "bg-slate-800/40 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600"
              }`}
            >
              {session?.profile_pic ? (
                <img
                  src={session.profile_pic}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border border-slate-500 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold border border-teal-400/50 shadow-inner shrink-0">
                  {session?.full_name
                    ? session.full_name.charAt(0).toUpperCase()
                    : "U"}
                </div>
              )}
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-white truncate mb-1">
                  {session?.full_name || "System User"}
                </p>
                <Badge
                  variant={
                    role.toLowerCase() === "superadmin" ? "brand" : "success"
                  }
                >
                  {role.replaceAll("_", " ")}
                </Badge>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {visibleNavItems.map((item) => {
              const isActive = currentTab === item.id;
              const isEmergency = item.requiresActiveEmergency;

              return (
                <div
                  key={item.id}
                  className={
                    item.hasDivider ? "border-t border-slate-800 mt-4 pt-4" : ""
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                      isActive
                        ? isEmergency
                          ? "bg-red-600 font-bold text-white shadow-md shadow-red-600/25"
                          : "bg-gradient-to-r from-teal-600 to-emerald-600 font-bold text-white shadow-md shadow-teal-900/30"
                        : isEmergency
                        ? "bg-red-950/50 text-red-300 hover:bg-red-900/60 border border-red-800/50 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon
                        className={`w-5 h-5 shrink-0 ${
                          isEmergency
                            ? isActive
                              ? "text-white animate-pulse"
                              : "text-red-400 animate-pulse"
                            : isActive
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {isEmergency && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full border border-red-400/40">
                        Live
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sign Out Footer */}
        <div className="pt-6 border-t border-slate-800 shrink-0">
          <Button
            variant="danger"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSignOut}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}