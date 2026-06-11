import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { XMarkIcon } from "@heroicons/react/24/outline";

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
      .eq("asset_id", asset.asset_id);

    if (error) {
      alert("Error updating asset: " + error.message);
      setLoading(false);
    } else {
      refreshData();
      onClose();
    }
  };

  // Determine if the "Disposed" option should be visible based on the asset's initial state
  const canDispose = ["Broken", "Disposal Requested", "Disposed"].includes(asset.status);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">Edit Asset Details</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <XMarkIcon className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            label="Asset Tag ID"
            disabled
            value={asset.asset_id}
            className="font-mono bg-slate-100 cursor-not-allowed"
          />

          <Input
            label="Asset Name"
            required
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="Enter asset name"
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Electronics">Electronics</option>
            <option value="Furniture">Furniture</option>
            <option value="Network Equipment">Network Equipment</option>
            <option value="Lab Equipment">Lab Equipment</option>
            <option value="Other">Other</option>
          </Select>

          <Select
            label="Location / Room"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
          >
            <option value="" disabled>Select a Location</option>
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.location_name}
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Active">Operational</option>
            <option value="Under Maintenance">Maintenance</option>
            <option value="Disposal Requested">Request for Disposal</option>
            <option value="Audit Requested">Request for Audit</option>
            <option value="Broken">Broken</option>
            <option value="Lost">Lost</option>
            
            {/* Conditional Rendering for Disposed */}
            {canDispose && (
              <option value="Disposed">Disposed</option>
            )}
          </Select>

          <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
            <Button onClick={onClose} variant="secondary" className="flex-1 py-2.5">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} variant="primary" className="flex-1 py-2.5">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}