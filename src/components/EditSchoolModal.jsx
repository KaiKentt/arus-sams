import React, { useState } from "react";
import { supabaseAdmin } from "../supabaseAdmin"; 

export default function EditSchoolModal({ school, onClose, refreshData }) {
  // Pre-fill states with the existing school data
  const [schoolCode, setSchoolCode] = useState(school.school_code || "");
  const [schoolName, setSchoolName] = useState(school.school_name || "");
  const [addressLine, setAddressLine] = useState(school.address_line || "");
  const [postcode, setPostcode] = useState(school.postcode || "");
  const [city, setCity] = useState(school.city || "");
  const [state, setState] = useState(school.state || "");
  const [latitude, setLatitude] = useState(school.latitude || "");
  const [longitude, setLongitude] = useState(school.longitude || "");
  const [contactNo, setContactNo] = useState(school.contact_no || "");

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    const { error } = await supabaseAdmin
      .from("schools")
      .update({
        school_code: schoolCode,
        school_name: schoolName,
        address_line: addressLine,
        postcode: postcode,
        city: city,
        state: state,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        contact_no: contactNo,
      })
      .eq("school_id", school.school_id); // Update by ID

    if (error) {
      alert("Error updating school: " + error.message);
    } else {
      refreshData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2 border-blue-500">
          ✏️ Edit School Profile
        </h3>
        <form onSubmit={handleUpdateSchool} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700">School Code</label>
              <input type="text" required value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700">Contact Number</label>
              <input type="text" value={contactNo} onChange={(e) => setContactNo(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700">School Name</label>
            <input type="text" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700">Address Line 1</label>
            <input type="text" required value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700">Postcode</label>
              <input type="text" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700">City</label>
              <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700">State</label>
              <input type="text" required value={state} onChange={(e) => setState(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4">
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">iHYDRO Flood Telemetry Coordinates</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Latitude</label>
              <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Longitude</label>
              <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 rounded-md text-sm font-bold text-white hover:bg-blue-700 shadow-md">💾 Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}