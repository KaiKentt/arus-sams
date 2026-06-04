import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard'; // <-- IMPORTED THE NEW DASHBOARD

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userSchoolId, setUserSchoolId] = useState(null); // Multi-tenant anchor
  const [currentTab, setCurrentTab] = useState('mobile-audit'); // Default to staff view

  useEffect(() => {
    // 1. Get Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else {
        setUserRole(null);
        setUserSchoolId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. Fetch the Role and School ID from the Staff Table
  const fetchUserRole = async (userId) => {
    console.log("1. Checking Database for User ID:", userId);
    
    const { data, error } = await supabase
      .from('staff')
      .select('role, school_id') // FETCHING BOTH ROLE AND SCHOOL_ID
      .eq('id', userId)
      .single();

    console.log("2. Supabase Response Data:", data);
    console.log("3. Supabase Error:", error);

    if (data) {
      // Forcing lowercase just in case there is a capital letter in the database
      const roleStr = data.role.toLowerCase().trim();
      setUserRole(roleStr);
      setUserSchoolId(data.school_id); // SAVING THE SCHOOL_ID
      
      // ROUTING LOGIC BASED ON HIERARCHY
      if (roleStr === 'super-admin') {
        setCurrentTab('super-dashboard');
      } else if (roleStr === 'admin') {
        setCurrentTab('admin-management');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-64 bg-slate-900 text-white p-6 shadow-xl z-10 flex flex-col">
        <h1 className="text-2xl font-bold text-teal-400 mb-8 border-b border-slate-700 pb-4">Arus-SAMS</h1>
        <div className="space-y-3 flex-1">
          
          {/* SUPER ADMIN ROUTE: ONLY VISIBLE TO THE PLATFORM OWNER */}
          {userRole === 'super-admin' && (
            <button onClick={() => setCurrentTab('super-dashboard')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'super-dashboard' ? 'bg-teal-600' : 'hover:bg-slate-800'}`}>
              🌍 Ministry Overview
            </button>
          )}

          {/* HEADMASTER ADMIN ROUTE: ONLY VISIBLE TO SCHOOL ADMINS */}
          {userRole === 'admin' && (
            <button onClick={() => setCurrentTab('admin-management')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'admin-management' ? 'bg-teal-600' : 'hover:bg-slate-800'}`}>
              👥 User Management
            </button>
          )}

          {/* STANDARD ROUTES FOR ALL ROLES */}
          <button onClick={() => setCurrentTab('dashboard')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'dashboard' ? 'bg-teal-600' : 'hover:bg-slate-800'}`}>🖥️ Asset Registry</button>
          <button onClick={() => setCurrentTab('mobile-audit')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'mobile-audit' ? 'bg-teal-600' : 'hover:bg-slate-800'}`}>📱 Mobile QR Audit</button>
        </div>
        
        <button onClick={handleSignOut} className="mt-auto block w-full text-left px-4 py-3 text-red-400 hover:bg-slate-800 rounded transition-colors">
          🚪 Sign Out
        </button>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className="flex-1 p-10 overflow-y-auto">
        
        {/* SUPER ADMIN DASHBOARD */}
        {currentTab === 'super-dashboard' && userRole === 'super-admin' && (
          <SuperAdminDashboard />
        )}

        {/* HEADMASTER DASHBOARD */}
        {currentTab === 'admin-management' && userRole === 'admin' && (
          <AdminDashboard schoolId={userSchoolId} /> 
        )}

        {/* ASSET REGISTRY PLACEHOLDER */}
        {currentTab === 'dashboard' && (
          <div className="fade-in">
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Location & Elevation Registry</h2>
            <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
               <p className="text-slate-500">Feature 1: Admin Data Table and Input Form goes here.</p>
            </div>
          </div>
        )}

        {/* MOBILE AUDIT PLACEHOLDER */}
        {currentTab === 'mobile-audit' && (
          <div className="max-w-md mx-auto fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Field Asset Scan</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-teal-500">
              <p className="text-slate-500 text-center">Feature 3: QR Scanner and Condition Update Form goes here.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;