
import { 
  ChartBarIcon, 
  CheckCircleIcon, 
  WrenchScrewdriverIcon, 
  ExclamationCircleIcon 
} from "@heroicons/react/24/outline";

export default function AssetAnalytics({ assets, title = "Asset Intelligence" }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <p className="text-slate-500 font-medium">No asset data available yet.</p>
      </div>
    );
  }

  // 1. Calculate Metrics
  const total = assets.length;
  const active = assets.filter((a) => a.status === "Active").length;
  const maintenance = assets.filter((a) => a.status === "Under Maintenance").length;
  const missing = assets.filter((a) => a.status === "Lost" || a.status === "Disposed").length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
      {/* HEADER */}
      <div className="p-6 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
        <div className="p-2 bg-blue-100 rounded-lg">
          <ChartBarIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">Real-time status overview of regional equipment</p>
        </div>
      </div>

      {/* METRIC GRID */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Card */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Assets</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{total}</p>
        </div>

        {/* Operational */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircleIcon className="w-4 h-4" /> Operational
          </p>
          <p className="text-3xl font-black text-green-800 mt-1">{active}</p>
        </div>

        {/* Maintenance */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <WrenchScrewdriverIcon className="w-4 h-4" /> In Repair
          </p>
          <p className="text-3xl font-black text-amber-800 mt-1">{maintenance}</p>
        </div>

        {/* Missing/Disposed */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
            <ExclamationCircleIcon className="w-4 h-4" /> Out of Service
          </p>
          <p className="text-3xl font-black text-red-800 mt-1">{missing}</p>
        </div>
      </div>

      {/* VISUAL HEALTH BAR */}
      <div className="px-6 pb-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inventory Health Distribution</p>
        <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200">
          <div style={{ width: `${(active/total)*100}%` }} className="bg-green-500" title="Operational"></div>
          <div style={{ width: `${(maintenance/total)*100}%` }} className="bg-amber-500" title="In Repair"></div>
          <div style={{ width: `${(missing/total)*100}%` }} className="bg-red-500" title="Out of Service"></div>
        </div>
      </div>
    </div>
  );
}