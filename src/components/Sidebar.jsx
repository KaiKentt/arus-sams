
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

const NAV_ITEMS = [
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
    id: "hydrological-simulator",
    label: "iHYDRO Simulation Panel",
    icon: VariableIcon,
    allowedRoles: ["superadmin", "headmaster"]
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
    id: "super-dashboard",
    label: "Ministry Portal",
    icon: ShieldCheckIcon,
    allowedRoles: ["superadmin"]
  }
];

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
            {NAV_ITEMS.filter(item => item.allowedRoles.includes(userRole)).map((item) => (
              <button 
                key={item.id}
                onClick={() => navigate(item.id)} 
                className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded transition-colors ${item.hasDivider ? "border-t border-slate-800 mt-4 pt-4" : ""} ${currentTab === item.id ? "bg-teal-600 font-medium" : "hover:bg-slate-800 text-slate-300"}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
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
