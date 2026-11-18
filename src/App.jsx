import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

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
import ForgotPassword from "./features/auth/ForgotPassword";
import UpdatePassword from "./features/auth/UpdatePassword";

// Ministry (Super Admin)
import SuperAdminDashboard from "./features/ministry/SuperAdminDashboard";

// School Admin (Headmaster)
import AdminDashboard from "./features/school/AdminDashboard";
import SchoolProfile from "./components/SchoolProfile";

// Telemetry (iHYDRO)
import EvacuationTracker from "./features/telemetry/EvacuationTracker";

// --- 4. LEGACY COMPONENTS & PAGES ---
// Asset Management
import AssetMasterList from "./features/assets/AssetMasterList";
import AssetRegistration from "./pages/AssetRegistration";
import MobileAudit from "./pages/MobileAudit";

// Utilities
import LocationManager from "./pages/LocationManager";

function isRecoveryUrl() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    path === "/update-password" ||
    hash.includes("type=recovery") ||
    search.includes("type=recovery")
  );
}

function App() {
  // Routing UI State
  const [currentTab, setCurrentTab] = useState(() =>
    isRecoveryUrl() ? "update-password" : "mobile-audit"
  );
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() =>
    isRecoveryUrl()
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Bring in all the complex logic from our Custom Hook
  const {
    session,
    userRole,
    userSchoolId,
    isCritical,
    handleDemoLogin,
    handleSignOut,
    handleSessionUpdate,
  } = useArusAuth(setCurrentTab);

  // Listen for Supabase PASSWORD_RECOVERY event when user arrives from email link
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setCurrentTab("update-password");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate = (tab) => {
    // Clean up URL path & recovery flag when returning to normal login
    if (tab === "login" && isPasswordRecovery) {
      setIsPasswordRecovery(false);
      window.history.replaceState({}, "", "/");
    }
    setCurrentTab(tab);
    setSidebarOpen(false);
  };

  // --- PASSWORD RECOVERY ROUTE (Takes priority even while Supabase holds temporary recovery session) ---
  if (isPasswordRecovery || currentTab === "update-password") {
    return <UpdatePassword navigate={navigate} />;
  }

  // --- UNAUTHENTICATED ROUTING ---
  if (!session) {
    if (currentTab === "forgot-password") {
      return <ForgotPassword navigate={navigate} />;
    }
    return <Auth onDemoLogin={handleDemoLogin} navigate={navigate} />;
  }

  // --- MAIN UI RENDER (AUTHENTICATED) ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
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
            <EvacuationTracker
              schoolId={userSchoolId}
              userRole={userRole}
              currentUserName={session?.full_name}
            />
          )}
          {currentTab === "asset-master-list" && (
            <AssetMasterList
              schoolId={userSchoolId}
              userRole={userRole}
              navigate={navigate}
            />
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
          
        </div>
      </div>
    </div>
  );
}

export default App;