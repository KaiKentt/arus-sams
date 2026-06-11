import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  MapPinIcon,
  PhoneIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";

export default function MinistryOverview() {
  const [stats, setStats] = useState({ schools: 0, staff: 0, assets: 0 });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMinistryData();
  }, []);

  const fetchMinistryData = async () => {
    setLoading(true);
    try {
      const { count: schoolCount } = await supabase.from("schools").select("*", { count: "exact", head: true });
      const { count: staffCount } = await supabase.from("staff").select("*", { count: "exact", head: true });
      const { count: assetCount } = await supabase.from("assets").select("*", { count: "exact", head: true });

      setStats({
        schools: schoolCount || 0,
        staff: staffCount || 0,
        assets: assetCount || 0,
      });

      const { data: alertsData, error: alertsError } = await supabase
        .from("water_data")
        .select(`
          water_level,
          status,
          recorded_at,
          stations (
            station_name,
            school_station (
              schools (school_name, contact_no)
            )
          )
        `)
        .in("status", ["warning", "danger", "alert"])
        .order("recorded_at", { ascending: false })
        .limit(5);

      if (!alertsError && alertsData) {
        const formattedAlerts = alertsData.map(alert => {
          const school = alert.stations?.school_station?.[0]?.schools;
          return {
            id: alert.recorded_at,
            schoolName: school ? school.school_name : "Unmapped Station",
            contact: school ? school.contact_no : "N/A",
            stationName: alert.stations?.station_name,
            level: alert.water_level,
            status: alert.status,
            time: new Date(alert.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          };
        });
        setActiveAlerts(formattedAlerts);
      }
    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-wide">Loading Regional Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      
      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <BuildingOfficeIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Schools</p>
            <p className="text-3xl font-black text-slate-800">{stats.schools}</p>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <UserGroupIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Users</p>
            <p className="text-3xl font-black text-slate-800">{stats.staff}</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <ComputerDesktopIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tracked Assets</p>
            <p className="text-3xl font-black text-slate-800">{stats.assets}</p>
          </div>
        </Card>
      </div>

      {/* ACTIVE FLOOD ALERTS PANEL */}
      <Card>
        <div className="bg-slate-900 p-4 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            Active iHYDRO Flood Watch
          </h3>
          {activeAlerts.length > 0 && (
            <Badge variant="danger" icon={ExclamationCircleIcon}>
              {activeAlerts.length} Active
            </Badge>
          )}
        </div>
        
        <div className="p-0">
          {activeAlerts.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center bg-slate-50">
              <ShieldCheckIcon className="w-16 h-16 text-slate-300 mb-3" />
              <p className="text-slate-800 font-bold">Regional Telemetry Normal</p>
              <p className="text-sm text-slate-500 mt-1">No schools are currently reporting elevated water levels.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeAlerts.map((alert, idx) => (
                <div key={idx} className={`p-5 flex justify-between items-center ${alert.status === 'danger' ? 'bg-red-50/50' : 'bg-orange-50/50'}`}>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{alert.schoolName}</h4>
                    <div className="text-sm text-slate-600 flex gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" /> {alert.stationName}
                      </span>
                      <span className="flex items-center gap-1">
                        <PhoneIcon className="w-4 h-4" /> {alert.contact}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-black ${alert.status === 'danger' ? 'text-red-600' : 'text-orange-500'}`}>
                      {alert.level}m
                    </p>
                    <div className="mt-1">
                      <Badge 
                        variant={alert.status === 'danger' ? 'danger' : 'warning'}
                      >
                        Status: {alert.status} • {alert.time}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}