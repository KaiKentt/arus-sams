import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function EditAssetModal({
  schoolId,
  asset,
  onClose,
  refreshData,
}) {
  const [locations, setLocations] = useState([]);
  const [assetName, setAssetName] = useState(asset.asset_name || "");
  const [category, setCategory] = useState(asset.category || "Electronics");
  const [locationId, setLocationId] = useState(asset.location_id || "");
  const [status, setStatus] = useState(asset.status || "Active");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .from("locations")
        .select("location_id, location_name")
        .eq("school_id", schoolId)
        .eq("location_type", "room");
      if (data) setLocations(data);
    };
    fetchLocations();
  }, [schoolId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("assets")
      .update({
        asset_name: assetName,
        category: category,
        location_id: parseInt(locationId),
        status: status,
      })
      .eq("asset_id", asset.asset_id); // Update by ID

    if (error) {
      alert("Error updating asset: " + error.message);
      setLoading(false);
    } else {
      refreshData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2 border-blue-500">
          ✏️ Edit Asset Details
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700">
              Asset Tag ID
            </label>
            {/* Read-only because QR codes shouldn't change! */}
            <input
              type="text"
              disabled
              value={asset.asset_id}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">
              Asset Name
            </label>
            <input
              type="text"
              required
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Electronics">Electronics</option>
              <option value="Furniture">Furniture</option>
              <option value="Network Equipment">Network Equipment</option>
              <option value="Lab Equipment">Lab Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">
              Location / Room
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="" disabled>
                -- Select a Location --
              </option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Active">Active (Operational)</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Lost">Lost</option>
              <option value="Safe">Safe (Stored)</option>
              <option value="Disposed">Disposed</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 rounded-md text-sm font-bold text-white hover:bg-blue-700 shadow-md disabled:opacity-50"
            >
              {loading ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
