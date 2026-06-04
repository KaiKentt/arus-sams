import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard'; 
import SchoolProfile from './SchoolProfile'; 

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userSchoolId, setUserSchoolId] = useState(null); 
  const [currentTab, setCurrentTab] = useState('mobile-audit'); 

  // Core Demo Features
  const [isCritical, setIsCritical] = useState(false);       
  const [locations, setLocations] = useState([]);             
  const [blockName, setBlockName] = useState('');             
  const [roomNumber, setRoomNumber] = useState('');           
  const [elevation, setElevation] = useState('');             
  const [scannedAssetId, setScannedAssetId] = useState('');   
  const [auditStatus, setAuditStatus] = useState('Good');     

  useEffect(() => {
    // 1. Check browser memory so you don't get logged out if you accidentally refresh!
    const savedSession = localStorage.getItem('demo_session');
    if (savedSession) {
      handleDemoLogin(JSON.parse(savedSession));
    }

    // 2. Real-time Telemetry (Feature 2)
    const telemetryChannel = supabase
      .channel('public:hydro_telemetry')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hydro_telemetry' }, 
        payload => setIsCritical(payload.new.is_critical_alert)
      )
      .subscribe();

    return () => supabase.removeChannel(telemetryChannel);
  }, []);

  // ==========================================
  // CUSTOM LOGIN HANDLER (Bypasses Auth 500 error)
  // ==========================================
  const handleDemoLogin = (userData) => {
    setSession(userData);
    localStorage.setItem('demo_session', JSON.stringify(userData)); 

    const roleStr = userData.role.toLowerCase().trim();
    setUserRole(roleStr);
    setUserSchoolId(userData.school_id);
    fetchLocations(userData.school_id);

    // Smart Routing based on role
    if (roleStr === 'superadmin') setCurrentTab('super-dashboard');
    else if (roleStr === 'headmaster') setCurrentTab('admin-management');
    else setCurrentTab('mobile-audit'); // Send standard teachers straight to the QR scanner
  };

  const handleSignOut = () => {
    setSession(null);
    setUserRole(null);
    setUserSchoolId(null);
    localStorage.removeItem('demo_session'); // Clear browser memory
  };

  // FEATURE 1: Fetch Locations
  const fetchLocations = async (schoolId) => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from('locations')
      .select('id, block_name, room_number, elevation_meters, school_id')
      .eq('school_id', schoolId);
    if (!error && data) setLocations(data);
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!userSchoolId) return;
    const { error } = await supabase.from('locations').insert([{ 
      block_name: blockName, room_number: roomNumber, elevation_meters: parseFloat(elevation), school_id: userSchoolId 
    }]);
    if (!error) {
      alert("Elevation registry updated successfully!");
      setBlockName(''); setRoomNumber(''); setElevation('');
      fetchLocations(userSchoolId); 
    }
  };

  // FEATURE 2: Telemetry Simulator
  const toggleFloodSimulation = async (statusValue) => {
    await supabase.from('hydro_telemetry').update({ is_critical_alert: statusValue, live_water_level_meters: statusValue ? 5.35 : 1.10 }).eq('id', 1);
  };

  // FEATURE 3: Asset Audit Submit
  const handleAssetAuditSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('asset_inspections').insert([{
      asset_id: scannedAssetId.toUpperCase(), inspection_status: auditStatus, updated_at: new Date().toISOString()
    }]);
    if (!error) {
      alert(`Audit logged for ${scannedAssetId.toUpperCase()}!`);
      setScannedAssetId('');
    }
  };

  // ==========================================
  // ROOT RENDER
  // ==========================================
  if (!session) {
    // If no one is logged in, show Auth.jsx!
    return <Auth onDemoLogin={handleDemoLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans relative overflow-hidden">
      
      {/* EMERGENCY BANNER LINK (FEATURE 2) */}
      {isCritical && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-center py-3 font-bold animate-pulse z-50 shadow-md">
          ⚠️ CRITICAL ALERTS: LIVE iHYDRO TELEMENTRY BREACH AT BATU KAWA. PRIORITIZED EVACUATION ROUTINE ENGAGED!
        </div>
      )}

      {/* SIDEBAR MENU */}
      <div className="w-72 bg-slate-900 text-white p-6 flex flex-col justify-between shadow-2xl z-10">
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-teal-400">Arus-SAMS</h1>
            <p className="text-xs text-teal-200 mt-2 font-bold bg-slate-800 inline-block px-2 py-1 rounded">Logged in as: {session.full_name}</p>
          </div>
          
          <div className="space-y-1">
            <button onClick={() => setCurrentTab('dashboard')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'dashboard' ? 'bg-teal-600 font-medium' : 'hover:bg-slate-800 text-slate-300'}`}>
              📐 Elevation Registry
            </button>

            <button onClick={() => setCurrentTab('mobile-audit')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'mobile-audit' ? 'bg-teal-600 font-medium' : 'hover:bg-slate-800 text-slate-300'}`}>
              📱 Mobile QR Audit Input
            </button>

            <button onClick={() => setCurrentTab('hydrological-simulator')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'hydrological-simulator' ? 'bg-teal-600 font-medium' : 'hover:bg-slate-800 text-slate-300'}`}>
              ⚙️ iHYDRO Simulation Panel
            </button>

            <button onClick={() => setCurrentTab('school')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'school' ? 'bg-teal-600 font-medium' : 'hover:bg-slate-800 text-slate-300'}`}>
              🏫 School Profile
            </button>

            {userRole === 'headmaster' && (
              <button onClick={() => setCurrentTab('admin-management')} className={`block w-full text-left px-4 py-3 rounded transition-colors border-t border-slate-800 mt-4 pt-4 ${currentTab === 'admin-management' ? 'bg-teal-600 font-medium' : 'hover:bg-slate-800 text-slate-300'}`}>
                👥 Manage School Staff
              </button>
            )}

            {userRole === 'superadmin' && (
              <button onClick={() => setCurrentTab('super-dashboard')} className={`block w-full text-left px-4 py-3 rounded transition-colors ${currentTab === 'super-dashboard' ? 'bg-teal-600 font-medium' : 'hover:bg-slate-800 text-slate-300'}`}>
                👑 Ministry Management
              </button>
            )}
          </div>
        </div>

        <button onClick={handleSignOut} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded transition-colors shadow">
          🚪 Sign Out
        </button>
      </div>

      {/* CORE DISPLAY */}
      <div className="flex-1 p-10 overflow-y-auto pt-16">
        {userRole === 'superadmin' && currentTab === 'super-dashboard' && <SuperAdminDashboard />}
        {userRole === 'headmaster' && currentTab === 'admin-management' && <AdminDashboard schoolId={userSchoolId} />}
        
        {/* MODIFIED: Now accessible by all roles, passing userRole for permissions */}
        {currentTab === 'school' && <SchoolProfile school_id={userSchoolId} userRole={userRole} />}

        {/* FEATURE 1 */}
        {currentTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Location & Elevation Registry</h2>
            <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
              <form onSubmit={handleAddLocation} className="grid grid-cols-4 gap-4 items-end">
                <input type="text" placeholder="Building Block (e.g., Block A)" value={blockName} onChange={e => setBlockName(e.target.value)} className="border p-2 rounded" required />
                <input type="text" placeholder="Room Identifier (e.g., Lab G01)" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="border p-2 rounded" required />
                <input type="number" step="0.01" placeholder="Vertical Offset (m)" value={elevation} onChange={e => setElevation(e.target.value)} className="border p-2 rounded" required />
                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded shadow h-10">Save Workspace Data</button>
              </form>
            </div>
            <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-600 text-sm">Block</th>
                    <th className="p-4 font-bold text-slate-600 text-sm">Room Spec</th>
                    <th className="p-4 font-bold text-slate-600 text-sm">Elevation Vector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {locations.length === 0 ? (
                    <tr><td colSpan="3" className="p-4 text-center text-slate-400">No spatial arrays seeded.</td></tr>
                  ) : (
                    locations.map(loc => (
                      <tr key={loc.id} className="hover:bg-slate-50">
                        <td className="p-4 font-semibold text-slate-700">{loc.block_name}</td>
                        <td className="p-4 text-slate-600">{loc.room_number}</td>
                        <td className="p-4 font-bold text-blue-600">{loc.elevation_meters}m above datum</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FEATURE 3 */}
        {currentTab === 'mobile-audit' && (
          <div className="max-w-md mx-auto mt-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Field Audit Operations</h2>
            <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-teal-500 space-y-6">
              <form onSubmit={handleAssetAuditSubmit} className="space-y-4">
                <input type="text" placeholder="SCANNED QR DATA KEY STRING" value={scannedAssetId} onChange={e => setScannedAssetId(e.target.value)} className="border p-3 w-full rounded font-mono uppercase tracking-widest" required />
                <select value={auditStatus} onChange={e => setAuditStatus(e.target.value)} className="border p-3 w-full rounded font-medium bg-slate-50">
                  <option value="Good">🟢 Operational Verification (Good)</option>
                  <option value="Damaged">🟡 Infrastructure Faulty (Damaged)</option>
                  <option value="Submerged">🔴 Inundation Critical (Submerged)</option>
                </select>
                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">Transmit Condition</button>
              </form>
            </div>
          </div>
        )}

        {/* FEATURE 2 */}
        {currentTab === 'hydrological-simulator' && (
          <div className="max-w-xl mx-auto mt-6 bg-white p-8 rounded-xl shadow border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">iHYDRO Regional Telemetry Simulator</h2>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button onClick={() => toggleFloodSimulation(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg">🚨 Fire Torrential Surge Trigger</button>
              <button onClick={() => toggleFloodSimulation(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg">✅ Restore Stream Equilibrium</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;