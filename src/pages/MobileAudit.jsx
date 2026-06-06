import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function MobileAudit() {
  const [scannedAssetId, setScannedAssetId] = useState("");
  const [auditStatus, setAuditStatus] = useState("Good");

  const handleAssetAuditSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("asset_inspections").insert([
      {
        asset_id: scannedAssetId.toUpperCase(),
        inspection_status: auditStatus,
        updated_at: new Date().toISOString(),
      },
    ]);
    if (!error) {
      alert(`Audit logged for ${scannedAssetId.toUpperCase()}!`);
      setScannedAssetId("");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Field Audit Operations</h2>
      <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-teal-500 space-y-6">
        <form onSubmit={handleAssetAuditSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="SCANNED QR DATA KEY STRING"
            value={scannedAssetId}
            onChange={(e) => setScannedAssetId(e.target.value)}
            className="border p-3 w-full rounded font-mono uppercase tracking-widest"
            required
          />
          <select value={auditStatus} onChange={(e) => setAuditStatus(e.target.value)} className="border p-3 w-full rounded font-medium bg-slate-50">
            <option value="Good">🟢 Operational Verification (Good)</option>
            <option value="Damaged">🟡 Infrastructure Faulty (Damaged)</option>
            <option value="Submerged">🔴 Inundation Critical (Submerged)</option>
          </select>
          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">
            Transmit Condition
          </button>
        </form>
      </div>
    </div>
  );
}