import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { 
  ComputerDesktopIcon,
  WrenchScrewdriverIcon,
  ExclamationCircleIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  MapPinIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon,
  UserPlusIcon
} from "@heroicons/react/24/outline";

export default function SchoolCommandCenter({ session }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    operational: 0,
    inRepair: 0,
    outOfService: 0
  });
  const [floodWatch, setFloodWatch] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([
    { id: 1, type: "condemnation", label: "3 Assets pending condemnation approval", icon: ClipboardDocumentCheckIcon },
    { id: 2, type: "verification", label: "2 New standard teacher accounts awaiting verification", icon: UserPlusIcon }
  ]);

  const schoolId = session?.user?.user_metadata?.school_id || session?.school_id;

  useEffect(() => {
    if (schoolId) {
      fetchSchoolData();
    }
  }, [schoolId]);

  const fetchSchoolData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Asset Stats
      const { data: assets, error: assetError } = await supabase
        .from("assets")
        .select("status")
        .eq("school_id", schoolId);

      if (!assetError && assets) {
        setStats({
          total: assets.length,
          operational: assets.filter(a => a.status === "operational").length,
          inRepair: assets.filter(a => a.status === "maintenance").length,
          outOfService: assets.filter(a => a.status === "broken" || a.status === "condemned").length
        });
      }

      // 2. Fetch Local Flood Watch (iHYDRO)
      const { data: alertsData, error: alertsError } = await supabase
        .from("water_data")
        .select(`
          water_level,
          status,
          recorded_at,
          stations!inner (
            station_name,
            school_station!inner (
              school_id
            )
          )
        `)
        .eq("stations.school_station.school_id", schoolId)
        .order("recorded_at", { ascending: false })
        .limit(3);

      if (!alertsError && alertsData) {
        const formatted = alertsData.map(alert => ({
          id: alert.recorded_at,
          stationName: alert.stations.station_name,
          level: alert.water_level,
          status: alert.status,
          time: new Date(alert.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setFloodWatch(formatted);
      }

    } catch (error) {
      console.error("Error fetching school dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-wide">Loading Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      
      {/* 1. LOCAL ASSET SNAPSHOT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <ComputerDesktopIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Assets</p>
            <p className="text-3xl font-black text-slate-800">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <ShieldCheckIcon className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational</p>
            <p className="text-3xl font-black text-slate-800">{stats.operational}</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <WrenchScrewdriverIcon className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Repair</p>
            <p className="text-3xl font-black text-slate-800">{stats.inRepair}</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <NoSymbolIcon className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Out of Service</p>
            <p className="text-3xl font-black text-slate-800">{stats.outOfService}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. LOCAL FLOOD WATCH */}
        <Card>
          <div className="bg-slate-900 p-4 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              Local iHYDRO Telemetry
            </h3>
            {floodWatch.some(f => f.status !== 'normal') && (
              <Badge variant="danger" icon={ExclamationCircleIcon}>Active Alert</Badge>
            )}
          </div>
          <div className="p-0">
            {floodWatch.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center bg-slate-50">
                <ShieldCheckIcon className="w-16 h-16 text-slate-300 mb-3" />
                <p className="text-slate-800 font-bold">Station Connectivity Normal</p>
                <p className="text-sm text-slate-500 mt-1">No alerts for your school's mapped stations.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {floodWatch.map((alert, idx) => (
                  <div key={idx} className={`p-5 flex justify-between items-center ${alert.status === 'danger' ? 'bg-red-50/50' : alert.status === 'warning' ? 'bg-orange-50/50' : 'bg-white'}`}>
                    <div>
                      <h4 className="font-bold text-slate-800">{alert.stationName}</h4>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <ClockIcon className="w-3 h-3" /> Last sync: {alert.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${alert.status === 'danger' ? 'text-red-600' : alert.status === 'warning' ? 'text-orange-500' : 'text-slate-800'}`}>
                        {alert.level}m
                      </p>
                      <Badge 
                        variant={alert.status === 'danger' ? 'danger' : alert.status === 'warning' ? 'warning' : 'active'}
                      >
                        {alert.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 3. ACTION CENTER */}
        <Card>
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-teal-600" />
              Action Center
            </h3>
          </div>
          <div className="p-0">
            {pendingTasks.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500 italic">No pending actions</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded group-hover:bg-white transition-colors">
                        <task.icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{task.label}</span>
                    </div>
                    <Badge variant="neutral">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}