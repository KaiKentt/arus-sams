import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function AddAssetModal({ schoolId, onClose, refreshData }) {
  const [locations, setLocations] = useState([]);
  const [assetId, setAssetId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("Active");
  const [loading, setLoading] = useState(false);

  // QR duplicate check state
  const [qrChecking, setQrChecking] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [qrValid, setQrValid] = useState(false);

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

  // Debounced real-time QR duplicate check
  useEffect(() => {
    const trimmed = assetId.trim();
    if (!trimmed) {
      setQrError(null);
      setQrValid(false);
      setQrChecking(false);
      return;
    }

    setQrChecking(true);
    setQrError(null);
    setQrValid(false);

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("assets")
        .select("asset_id")
        .eq("asset_id", trimmed.toUpperCase())
        .maybeSingle();

      if (data) {
        setQrError("This QR Tag ID is already registered to another asset. Please use a unique ID.");
        setQrValid(false);
      } else {
        setQrError(null);
        setQrValid(true);
      }
      setQrChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [assetId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (qrError || qrChecking) return;
    setLoading(true);

    const { error } = await supabase.from("assets").insert([
      {
        asset_id: assetId.trim().toUpperCase(),
        asset_name: assetName,
        category: category,
        location_id: parseInt(locationId),
        status: status,
        school_id: schoolId,
      },
    ]);

    if (error) {
      alert("Error adding asset: " + error.message);
      setLoading(false);
    } else {
      refreshData();
      onClose();
    }
  };

  const qrBorderClass = qrError
    ? "border-red-500 focus:ring-red-400"
    : qrValid
    ? "border-green-500 focus:ring-green-400"
    : "border-slate-300 focus:ring-teal-500";

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2 border-teal-500">
          ➕ Register New Asset
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* QR Tag ID with real-time check */}
          <div>
            <label className="block text-sm font-bold text-slate-700">
              Asset Tag ID (QR String)
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                required
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md uppercase font-mono focus:outline-none focus:ring-2 transition-colors ${qrBorderClass}`}
                placeholder="e.g. AST-001"
              />
              {/* Status icon on the right */}
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                {qrChecking && (
                  <span className="text-slate-400 text-xs animate-pulse">checking...</span>
                )}
                {!qrChecking && qrValid && (
                  <span className="text-green-500 font-bold text-lg">✓</span>
                )}
                {!qrChecking && qrError && (
                  <span className="text-red-500 font-bold text-lg">✕</span>
                )}
              </div>
            </div>
            {qrError && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                ⚠ {qrError}
              </p>
            )}
            {qrValid && (
              <p className="mt-1.5 text-xs text-green-600">
                ✓ This ID is available.
              </p>
            )}
          </div>

          {/* Asset Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700">Asset Name</label>
            <input
              type="text"
              required
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Dell Optiplex 7090"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Electronics">Electronics</option>
              <option value="Furniture">Furniture</option>
              <option value="Network Equipment">Network Equipment</option>
              <option value="Lab Equipment">Lab Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-slate-700">Location / Room</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="" disabled>-- Select a Location --</option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Active">Active (Operational)</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Lost">Lost</option>
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
              disabled={loading || !!qrError || qrChecking || !assetId.trim()}
              className="px-4 py-2 bg-teal-600 rounded-md text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Register Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
