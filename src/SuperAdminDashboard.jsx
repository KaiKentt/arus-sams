import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from './supabaseAdmin';

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState([]);
  const [globalStaff, setGlobalStaff] = useState([]);
  
  // Modal States
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // New School Form States
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [newContact, setNewContact] = useState('');

  // New Staff Form States
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffFormError, setStaffFormError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newIcNumber, setNewIcNumber] = useState('');
  const [newRole, setNewRole] = useState('admin'); // Default to headmaster
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    // 1. Fetch schools WITH ordering (schools table has created_at)
    const { data: schoolsData, error: schoolsError } = await supabaseAdmin
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false }); 
    
    // 2. Fetch staff WITHOUT ordering
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .select(`*, schools (school_name)`);

    if (schoolsError) console.error("Schools fetch error:", schoolsError.message);
    if (staffError) console.error("Staff fetch error:", staffError.message);

    if (schoolsData) setSchools(schoolsData);
    if (staffData) setGlobalStaff(staffData);
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    const { error } = await supabaseAdmin
      .from('schools')
      .insert([{
        school_code: newSchoolCode,
        school_name: newSchoolName,
        address: newAddress,
        latitude: parseFloat(newLatitude) || null,
        longitude: parseFloat(newLongitude) || null,
        contact_no: newContact
      }]);

    if (error) {
      alert("Error creating school: " + error.message);
    } else {
      setIsSchoolModalOpen(false);
      setNewSchoolCode('');
      setNewSchoolName('');
      setNewAddress('');
      setNewLatitude('');
      setNewLongitude('');
      setNewContact('');
      fetchSystemData();
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffFormError('');

    // Require a school selection unless they are making another Super Admin
    if (!selectedSchoolId && newRole !== 'super-admin') {
      setStaffFormError("You must select a school for this user role.");
      return;
    }

    const icRegex = /^\d{12}$/;
    if (!icRegex.test(newIcNumber)) {
      setStaffFormError("IC Number must be exactly 12 digits without dashes.");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 15) {
      setStaffFormError("Password must be between 8 and 15 characters.");
      return;
    }

    setStaffLoading(true);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: newEmail,
      password: newPassword,
      email_confirm: true
    });

    if (authError) {
      setStaffFormError("Registration Error: " + authError.message);
      setStaffLoading(false);
      return;
    }

    const newUserId = authData.user.id;

    // Wait 1.5 seconds for trigger, then update profile
    setTimeout(async () => {
      const { error: updateError } = await supabaseAdmin
        .from('staff')
        .update({
          full_name: newFullName, 
          ic_number: newIcNumber,
          role: newRole,
          stored_password: newPassword,
          school_id: newRole === 'super-admin' ? null : selectedSchoolId
        })
        .eq('id', newUserId);

      if (updateError) {
        alert("Account created, but failed to save profile details: " + updateError.message);
      }

      setIsStaffModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewIcNumber('');
      setNewRole('admin');
      setSelectedSchoolId('');
      setStaffFormError('');
      fetchSystemData();
      setStaffLoading(false);
      
    }, 1500); 
  };

  return (
    <div className="fade-in space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-slate-900 p-8 rounded-2xl shadow-lg text-white">
        <div>
          <h2 className="text-3xl font-bold text-teal-400">Ministry Overview (Super Admin)</h2>
          <p className="text-slate-400 mt-2">Manage all registered schools and global staff directory.</p>
        </div>
        <div className="space-x-4">
          <button 
            onClick={() => setIsStaffModalOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors"
          >
            + Add System User
          </button>
          <button 
            onClick={() => setIsSchoolModalOpen(true)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors"
          >
            + Onboard New School
          </button>
        </div>
      </div>

      {/* SCHOOLS MASTER GRID */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">🏢 Registered Schools Network</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">School Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">GPS Coordinates</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Contact</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {schools.map((school) => (
                <tr key={school.school_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-teal-700">{school.school_code || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{school.school_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{school.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                    {school.latitude && school.longitude ? `${school.latitude}, ${school.longitude}` : 'Not mapped'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{school.contact_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GLOBAL STAFF GRID */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">🌍 Global Staff Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Assigned School</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">System Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Password</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {globalStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{staff.full_name || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">
                    {staff.schools?.school_name || (staff.role === 'super-admin' ? 'Ministry (System Owner)' : 'Unassigned')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${staff.role === 'super-admin' ? 'bg-red-100 text-red-800' : 
                        staff.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                        staff.role === 'asset-teacher' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{staff.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{staff.stored_password || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SCHOOL MODAL */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Onboard New School</h3>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700">School Code</label>
                  <input type="text" required value={newSchoolCode} onChange={(e) => setNewSchoolCode(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. YBA1346" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700">Contact Number</label>
                  <input type="text" value={newContact} onChange={(e) => setNewContact(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. 082-123456" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700">School Name</label>
                <input type="text" required value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. SK Rantau Panjang" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700">Address</label>
                <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="Full address" />
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">iHYDRO Flood Telemetry Coordinates</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Latitude</label>
                  <input type="number" step="any" value={newLatitude} onChange={(e) => setNewLatitude(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="1.5333" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Longitude</label>
                  <input type="number" step="any" value={newLongitude} onChange={(e) => setNewLongitude(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="110.3833" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsSchoolModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-teal-600 rounded-md text-sm font-bold text-white hover:bg-teal-700">Register School</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Create System User</h3>
            
            {staffFormError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold">
                {staffFormError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700">Full Name</label>
                <input type="text" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. Ahmad bin Ali" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700">IC Number</label>
                <input type="text" required value={newIcNumber} onChange={(e) => setNewIcNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="e.g. 040813130993" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">System Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white">
                  <option value="admin">Headmaster (School Admin)</option>
                  <option value="teacher">Standard Teacher</option>
                  <option value="asset-teacher">Asset Management Teacher</option>
                  <option value="super-admin">Ministry (Super Admin)</option>
                </select>
              </div>

              {/* DYNAMIC SCHOOL SELECTOR: Hides if creating a Super Admin */}
              {newRole !== 'super-admin' && (
                <div>
                  <label className="block text-sm font-bold text-teal-700">Assign to School</label>
                  <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-teal-500 rounded-md bg-teal-50 shadow-sm" required>
                    <option value="" disabled>-- Select a School --</option>
                    {schools.map(school => (
                      <option key={school.school_id} value={school.school_id}>
                        {school.school_name} ({school.school_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 mt-4">
                <label className="block text-sm font-bold text-slate-700">Login Email</label>
                <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700">Temporary Password</label>
                <input type="text" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="8-15 characters" />
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => {setIsStaffModalOpen(false); setStaffFormError('');}} className="px-4 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={staffLoading} className="px-4 py-2 bg-indigo-600 rounded-md text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {staffLoading ? 'Creating...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}