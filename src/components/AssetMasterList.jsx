import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import AddAssetModal from "./AddAssetModal";
import EditAssetModal from "./EditAssetModal";
import AssetAnalytics from "./AssetAnalytics";

export default function AssetMasterList({ schoolId, userRole }) {
  const [assets, setAssets] = useState([]);
  const [locationPaths, setLocationPaths] = useState({});
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const canEdit = userRole === "headmaster" || userRole === "asset_teacher";

  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAssets(), fetchLocationPaths()]);
    setLoading(false);
  };

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (!error && data) setAssets(data);
  };

  const fetchLocationPaths = async () => {
    const { data } = await supabase
      .from("locations")
      .select("location_id, location_name, parent_location_id")
      .eq("school_id", schoolId);

    if (!data) return;

    // Build id → node map
    const map = {};
    data.forEach(loc => { map[loc.location_id] = loc; });

    // Walk up parent chain to build full path for each node
    const paths = {};
    data.forEach(loc => {
      const parts = [];
      let current = loc;
      while (current) {
        parts.unshift(current.location_name);
        current = current.parent_location_id ? map[current.parent_location_id] : null;
      }
      paths[loc.location_id] = parts.join(" › ");
    });

    setLocationPaths(paths);
  };

  const handleDeleteAsset = async (assetId, assetName) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete the asset: ${assetName}?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from("assets").delete().eq("asset_id", assetId);

    if (error) {
      alert("Failed to delete asset. Error: " + error.message);
    } else {
      fetchData();
    }
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
  };

  if (loading) {
    return <div className="text-slate-500 font-bold p-8">Loading master list...</div>;
  }

  return (
    <div className="fade-in space-y-6 relative">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📦 Asset Master List</h2>
          <p className="text-slate-500 text-sm mt-1">
            {canEdit
              ? "Manage and track all physical assets registered to this school."
              : "View all physical assets registered to this school."}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg font-bold shadow transition-colors"
          >
            + Register New Asset
          </button>
        )}
      </div>

      <AssetAnalytics assets={assets} title="📊 School Asset Health Overview" />

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tag ID (QR)</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Asset Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                {canEdit && (
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? "6" : "5"} className="px-6 py-8 text-center text-slate-500">
                    No assets found for this school.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-teal-700">
                      {asset.asset_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                      {asset.asset_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">
                        {asset.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {locationPaths[asset.location_id] || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${asset.status === 'Active' ? 'bg-green-100 text-green-800' :
                          asset.status === 'Under Maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          asset.status === 'Lost' ? 'bg-orange-100 text-orange-800' :
                          asset.status === 'Disposed' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                        {asset.status || "Unknown"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                        <button onClick={() => handleEditAsset(asset)} className="text-xl hover:scale-110 transition-transform" title="Edit Asset">
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteAsset(asset.asset_id, asset.asset_name)} className="text-xl hover:scale-110 transition-transform" title="Delete Asset">
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <AddAssetModal
          schoolId={schoolId}
          onClose={() => setIsAddModalOpen(false)}
          refreshData={fetchData}
        />
      )}

      {editingAsset && (
        <EditAssetModal
          schoolId={schoolId}
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          refreshData={fetchData}
        />
      )}
    </div>
  );
}
