import { useState } from "react";

// --- 1. HOOKS & CONTEXT ---
import { useArusAuth } from "./hooks/useArusAuth";

// --- 2. GLOBAL UI & LAYOUT ---
import Sidebar from "./components/Sidebar";
import TopMobileBar from "./components/TopMobileBar";
import AlertBanner from "./components/AlertBanner";

// --- 3. FEATURE MODULES ---
// Auth Identity
import Auth from "./features/auth/Auth";
import UserProfile from "./features/auth/UserProfile";
import ForgotPassword from "./features/auth/ForgotPassword"; // NEW
import UpdatePassword from "./features/auth/UpdatePassword"; // NEW

// Ministry (Super Admin)
import SuperAdminDashboard from "./features/ministry/SuperAdminDashboard";

// School Admin (Headmaster)
import AdminDashboard from "./features/school/AdminDashboard"; 
import SchoolProfile from "./components/SchoolProfile";

// Telemetry (iHYDRO)
import SchoolFloodDashboard from "./features/telemetry/SchoolFloodDashboard";
import EvacuationTracker from "./features/telemetry/EvacuationTracker";

// --- 4. LEGACY COMPONENTS & PAGES ---
// Asset Management
import AssetMasterList from "./features/assets/AssetMasterList";
import AssetRegistration from "./pages/AssetRegistration";
import MobileAudit from "./pages/MobileAudit";

// Utilities
import LocationManager from "./pages/LocationManager";
import HydrologicalSimulator from "./pages/HydrologicalSimulator";

function App() {
  // Routing UI State
  const [currentTab, setCurrentTab] = useState("mobile-audit");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Bring in all the complex logic from our Custom Hook!
  const {
    session,
    userRole,
    userSchoolId,
    isCritical,
    handleDemoLogin,
    handleSignOut,
    handleSessionUpdate,
  } = useArusAuth(setCurrentTab);

  const navigate = (tab) => {
    setCurrentTab(tab);
    setSidebarOpen(false);
  };

  // --- UNAUTHENTICATED ROUTING ---
  // If the user is not logged in, only allow them to see Auth-related pages
  if (!session) {
    if (currentTab === "forgot-password") {
      return <ForgotPassword navigate={navigate} />;
    }
    if (currentTab === "update-password") {
      return <UpdatePassword navigate={navigate} />;
    }
    // Default fallback is the Login screen (pass navigate so the Forgot Password button works!)
    return <Auth onDemoLogin={handleDemoLogin} navigate={navigate} />;
  }

  // --- MAIN UI RENDER (AUTHENTICATED) ---
  return (
    <div className="flex h-screen bg-slate-100 font-sans relative overflow-hidden">
      <AlertBanner isCritical={isCritical} />

      <Sidebar
        session={session}
        userRole={userRole}
        schoolId={userSchoolId}
        currentTab={currentTab}
        navigate={navigate}
        handleSignOut={handleSignOut}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        <TopMobileBar setSidebarOpen={setSidebarOpen} />

        <div className="p-4 md:p-10 pt-4 md:pt-16">
          {currentTab === "my-profile" && (
            <UserProfile
              session={session}
              onSessionUpdate={handleSessionUpdate}
            />
          )}
          {currentTab === "super-dashboard" && <SuperAdminDashboard />}
          {currentTab === "admin-management" && (
            <AdminDashboard
              schoolId={userSchoolId}
              onNavigate={setCurrentTab}
            />
          )}
          {currentTab === "school" && (
            <SchoolProfile school_id={userSchoolId} userRole={userRole} />
          )}
          {currentTab === "evacuation-orders" && (
            <EvacuationTracker schoolId={userSchoolId} />
          )}
          {currentTab === "asset-master-list" && (
            <AssetMasterList schoolId={userSchoolId} userRole={userRole} navigate={navigate} />
          )}
          {currentTab === "locations" && (
            <LocationManager user={session} schoolId={userSchoolId} />
          )}
          {currentTab === "asset-registration" && (
            <AssetRegistration
              user={session}
              schoolId={userSchoolId}
              userRole={userRole}
              navigate={navigate}
            />
          )}
          {currentTab === "mobile-audit" && <MobileAudit user={session} />}
          {currentTab === "hydrological-simulator" && <HydrologicalSimulator />}
        </div>
      </div>
    </div>
  );
}

export default App;