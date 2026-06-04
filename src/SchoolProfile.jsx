import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const SchoolProfile = ({ school_id, userRole }) => {
  // Added all the specific columns from your database schema
  const [school, setSchool] = useState({ 
    school_code: '', 
    school_name: '', 
    latitude: '', 
    longitude: '', 
    address: '', 
    contact_no: '' 
  });
  
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = userRole === 'superadmin' || userRole === 'headmaster';

  useEffect(() => {
    if (school_id) fetchSchoolData();
    else setLoading(false);
  }, [school_id]);

  const fetchSchoolData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('school_id', school_id)
      .single();

    if (error) {
      console.error("Supabase Fetch Error:", error.message);
    } else if (data) {
      setSchool({
        school_code: data.school_code || '',
        school_name: data.school_name || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        address: data.address || '',
        contact_no: data.contact_no || ''
      });
    }
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Convert empty coordinate strings to null to prevent DB errors on numeric fields
    const latValue = school.latitude === '' ? null : school.latitude;
    const lonValue = school.longitude === '' ? null : school.longitude;

    const { error } = await supabase
      .from('schools')
      .update({
        school_code: school.school_code,
        school_name: school.school_name,
        latitude: latValue,
        longitude: lonValue,
        address: school.address,
        contact_no: school.contact_no
      })
      .eq('school_id', school_id);

    if (error) {
      alert("Update Failed: " + error.message);
      console.error("Update Error:", error);
    } else {
      alert("School Profile Updated Successfully!");
      setIsEditing(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading profile data...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow border border-slate-200 fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {isEditing ? "Edit School Information" : "School Information"}
        </h2>
        
        {canEdit && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-slate-200"
          >
            ✏️ Edit Details
          </button>
        )}
      </div>

      {/* VIEW ONLY MODE */}
      {!isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 col-span-1">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">School Code</p>
              <p className="text-lg font-bold text-teal-700">{school.school_code || "N/A"}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 col-span-2">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">School Name</p>
              <p className="text-lg font-bold text-slate-800">{school.school_name || "Not specified"}</p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Official Address</p>
            <p className="text-slate-800 font-medium whitespace-pre-line">{school.address || "Not specified"}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Contact Number</p>
              <p className="text-slate-800 font-medium">{school.contact_no || "Not specified"}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Latitude</p>
              <p className="text-slate-800 font-mono text-sm">{school.latitude || "Not specified"}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">Longitude</p>
              <p className="text-slate-800 font-mono text-sm">{school.longitude || "Not specified"}</p>
            </div>
          </div>
        </div>
      ) : (
      
      /* EDIT MODE FORM */
        <form onSubmit={handleUpdate} className="space-y-5 bg-slate-50 p-6 rounded-lg border border-slate-200">
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School Code</label>
              <input 
                type="text" 
                value={school.school_code} 
                onChange={e => setSchool({...school, school_code: e.target.value})} 
                className="border border-slate-300 p-2.5 w-full rounded focus:ring-2 focus:ring-teal-500 focus:outline-none" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School Name</label>
              <input 
                type="text" 
                value={school.school_name} 
                onChange={e => setSchool({...school, school_name: e.target.value})} 
                className="border border-slate-300 p-2.5 w-full rounded focus:ring-2 focus:ring-teal-500 focus:outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official Address</label>
            <textarea 
              value={school.address || ''} 
              onChange={e => setSchool({...school, address: e.target.value})} 
              className="border border-slate-300 p-2.5 w-full rounded h-24 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Number</label>
              <input 
                type="text" 
                value={school.contact_no || ''} 
                onChange={e => setSchool({...school, contact_no: e.target.value})} 
                className="border border-slate-300 p-2.5 w-full rounded focus:ring-2 focus:ring-teal-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Latitude</label>
              {/* type="number" with step="any" allows decimal coordinates */}
              <input 
                type="number" 
                step="any"
                value={school.latitude || ''} 
                onChange={e => setSchool({...school, latitude: e.target.value})} 
                className="border border-slate-300 p-2.5 w-full rounded focus:ring-2 focus:ring-teal-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Longitude</label>
              <input 
                type="number" 
                step="any"
                value={school.longitude || ''} 
                onChange={e => setSchool({...school, longitude: e.target.value})} 
                className="border border-slate-300 p-2.5 w-full rounded focus:ring-2 focus:ring-teal-500 focus:outline-none" 
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-slate-200">
            <button 
              type="button" 
              onClick={() => setIsEditing(false)} 
              className="w-1/3 bg-white border border-slate-300 text-slate-600 font-bold py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="w-2/3 bg-teal-600 text-white font-bold py-2.5 rounded-lg hover:bg-teal-700 transition-colors shadow-md"
            >
              💾 Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SchoolProfile;