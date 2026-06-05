import React from "react";

export default function AssetAnalytics({ assets, title = "📊 Asset Intelligence" }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center">
        <p className="text-slate-500 font-medium">No asset data available yet.</p>
      </div>
    );
  }

  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => a.status === "Active").length;
  const maintenanceAssets = assets.filter((a) => a.status === "Under Maintenance").length;
  const lostDisposedAssets = assets.filter((a) => a.status === "Lost" || a.status === "Disposed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Total Assets */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 flex flex-col justify-center items-center">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Assets</p>
          <p className="text-4xl font-black text-slate-800">{totalAssets}</p>
        </div>

        {/* Operational */}
        <div className="bg-white rounded-xl shadow-md border-b-4 border-b-green-500 p-6 flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20 text-4xl">🟢</div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Operational</p>
          <p className="text-4xl font-black text-green-600">{activeAssets}</p>
        </div>

        {/* Under Maintenance */}
        <div className="bg-white rounded-xl shadow-md border-b-4 border-b-yellow-500 p-6 flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20 text-4xl">🔧</div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Under Maintenance</p>
          <p className="text-4xl font-black text-yellow-600">{maintenanceAssets}</p>
        </div>

        {/* Lost / Disposed */}
        <div className="bg-white rounded-xl shadow-md border-b-4 border-b-red-500 p-6 flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20 text-4xl">🚨</div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Lost / Disposed</p>
          <p className="text-4xl font-black text-red-600">{lostDisposedAssets}</p>
        </div>
      </div>
    </div>
  );
}
