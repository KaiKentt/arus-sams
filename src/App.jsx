import React, { useState } from "react";
import { useArusAuth } from "./hooks/useArusAuth";

// UI Components
import Auth from "./Auth";
import AlertBanner from "./components/AlertBanner";
import TopMobileBar from "./components/TopMobileBar";
import Sidebar from "./components/Sidebar";

// Pages
import AdminDashboard from "./components/AdminDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import SchoolProfile from "./components/SchoolProfile";
import UserProfile from "./components/UserProfile";
import LocationManager from "./pages/LocationManager";
import AssetMasterList from "./components/AssetMasterList";
import AssetRegistration from "./pages/AssetRegistration";
import MobileAudit from "./pages/MobileAudit";
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

  // Authentication Check
  if (!session) return <Auth onDemoLogin={handleDemoLogin} />;

  // Main UI Render
  return (
    <div className="flex h-screen bg-slate-100 font-sans relative overflow-hidden">
      
      <AlertBanner isCritical={isCritical} />
      
      <Sidebar 
        session={session} 
        userRole={userRole} 
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
          {currentTab === "my-profile" && <UserProfile session={session} onSessionUpdate={handleSessionUpdate} />}
          {currentTab === "super-dashboard" && <SuperAdminDashboard />}
          {currentTab === "admin-management" && <AdminDashboard schoolId={userSchoolId} onNavigate={setCurrentTab} />}
          {currentTab === "school" && <SchoolProfile school_id={userSchoolId} userRole={userRole} />}
          {currentTab === "asset-master-list" && <AssetMasterList schoolId={userSchoolId} userRole={userRole} />}
          {currentTab === "locations" && <LocationManager user={session} schoolId={userSchoolId} />}
          {currentTab === "asset-registration" && <AssetRegistration user={session} schoolId={userSchoolId} userRole={userRole} />}
          {currentTab === "mobile-audit" && <MobileAudit />}
          {currentTab === "hydrological-simulator" && <HydrologicalSimulator />}
        </div>
      </div>
      
    </div>
  );
}

export default App;