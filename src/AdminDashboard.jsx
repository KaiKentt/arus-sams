import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';

// 1. Accept schoolId as a prop from App.jsx
export default function AdminDashboard({ schoolId }) {
  const [staffList, setStaffList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form States
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newIcNumber, setNewIcNumber] = useState('');
  const [newRole, setNewRole] = useState('teacher');

  // Re-fetch if the schoolId ever changes or loads
  useEffect(() => {
    if (schoolId) {
      fetchStaff();
    }
  }, [schoolId]);

  const fetchStaff = async () => {
    // 2. SECURITY WALL: Only fetch staff that belong to this Admin's school
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('school_id', schoolId); 
    
    if (error) {
      console.error("Fetch Error:", error.message);
    } else {
      setStaffList(data || []);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setFormError('');

    // --- FRONTEND VALIDATION GATEWAY ---
    const icRegex = /^\d{12}$/;
    if (!icRegex.test(newIcNumber)) {
      setFormError("IC Number must be exactly 12 digits without dashes (e.g., 040813130993).");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 15) {
      setFormError("Password must be between 8 and 15 characters.");
      return;
    }

    // --- SECURE REGISTRATION ---
    setLoading(true);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: newEmail,
      password: newPassword,
      email_confirm: true
    });

    if (authError) {
      setFormError("Registration Error: " + authError.message);
      setLoading(false);
      return;
    }

    const newUserId = authData.user.id;

    // Wait 1.5 seconds, then use Admin bypass to update profile
    setTimeout(async () => {
      const { error: updateError } = await supabaseAdmin
        .from('staff')
        .update({
          full_name: newFullName, 
          ic_number: newIcNumber,
          role: newRole,
          stored_password: newPassword,
          school_id: schoolId // 3. Automatically lock this new user to the Admin's school
        })
        .eq('id', newUserId);

      if (updateError) {
        alert("Account created, but failed to save profile details: " + updateError.message);
      }

      // Close modal, clear form, refresh grid
      setIsModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewIcNumber('');
      setNewRole('teacher');
      setFormError('');
      fetchStaff();
      setLoading(false);
      
    }, 1500); 
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Staff Management Master List</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition-colors"
        >
          + Add New Staff
        </button>
      </div>

      {/* MASTER DATA GRID */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IC Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">System Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Password</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {staffList.map((staff, index) => (
              <tr key={staff.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{staff.full_name || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{staff.ic_number || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{staff.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${staff.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      staff.role === 'asset-teacher' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}`}>
                    {staff.role || 'teacher'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono bg-slate-50">
                  {staff.stored_password || 'Not recorded'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-teal-600 hover:text-teal-900">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* POP-UP REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Register New Staff Account</h3>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input type="text" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="e.g. Ahmad bin Ali" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700">IC Number</label>
                <input type="text" required value={newIcNumber} onChange={(e) => setNewIcNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="e.g. 040813130993" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">System Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 bg-white">
                  <option value="teacher">Standard Teacher</option>
                  <option value="asset-teacher">Asset Management Teacher</option>
                  <option value="admin">System Admin (Headmaster)</option>
                </select>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <label className="block text-sm font-medium text-slate-700">Login Email</label>
                <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700">Temporary Password</label>
                <input type="text" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" placeholder="8-15 characters" />
              </div>

              <div className="flex justify-end space-x-3 mt-8">
                <button type="button" onClick={() => {setIsModalOpen(false); setFormError('');}} className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-teal-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                  {loading ? 'Creating Profile...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}