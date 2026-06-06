import React, { useState, useEffect } from "react";
import { supabaseAdmin } from "../supabaseAdmin";


export default function SchoolFloodDashboard({ schoolId }) {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      fetchDashboardData();
    }
  }, [schoolId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      // 1. Fetch the 3 mapped stations for this specific school
      const { data: mappings, error: mapError } = await supabaseAdmin
        .from("school_station")
        .select(`
          priority,
          stations (
            station_id,
            station_name,
            danger_level
          )
        `)
        .eq("school_id", schoolId)
        .order("priority", { ascending: true });

      if (mapError) throw mapError;

      // 2. For each station, fetch the SINGLE most recent reading from water_data
      const enrichedData = await Promise.all(
        mappings.map(async (mapping) => {
          const station = mapping.stations;
          
          const { data: waterData, error: waterError } = await supabaseAdmin
            .from("water_data")
            .select("water_level, status, recorded_at")
            .eq("station_id", station.station_id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .single(); // We only want the absolute latest row

          return {
            priority: mapping.priority,
            stationName: station.station_name,
            dangerLevel: station.danger_level,
            // If the python script hasn't run yet, default to N/A
            currentLevel: waterData ? waterData.water_level : "N/A",
            status: waterData ? waterData.status : "unknown",
            lastUpdated: waterData ? new Date(waterData.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Never",
          };
        })
      );

      setTelemetry(enrichedData);
    } catch (error) {
      console.error("Error fetching telemetry:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to color-code the UI based on the database status
  const getStatusStyles = (status) => {
    switch (status) {
      case 'normal':  return { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", icon: "🟢" };
      case 'alert':   return { bg: "bg-yellow-100",  text: "text-yellow-800",  border: "border-yellow-200",  icon: "🟡" };
      case 'warning': return { bg: "bg-orange-100",  text: "text-orange-800",  border: "border-orange-200",  icon: "🟠" };
      case 'danger':  return { bg: "bg-red-100",     text: "text-red-800",     border: "border-red-300",     icon: "🚨" };
      default:        return { bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200",   icon: "⚪" };
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-500 animate-pulse">Loading live iHYDRO telemetry...</div>;
  }

  if (telemetry.length === 0) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <p className="text-slate-500 font-medium">No telemetry stations are currently mapped to this school.</p>
        <p className="text-sm text-slate-400 mt-1">Update the school's coordinates to assign stations.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        🌊 Early Warning Telemetry
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {telemetry.map((node) => {
          const style = getStatusStyles(node.status);
          
          return (
            <div key={node.priority} className={`relative p-5 rounded-2xl border ${style.bg} ${style.border} shadow-sm transition-all hover:shadow-md`}>
              
              {/* Priority Badge */}
              <div className="absolute -top-3 -left-3 bg-slate-800 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full shadow-md">
                #{node.priority}
              </div>

              <div className="flex justify-between items-start mb-2 mt-1">
                <h4 className="font-bold text-slate-800 truncate pr-2">{node.stationName}</h4>
                <span className="text-xl" title={node.status.toUpperCase()}>{style.icon}</span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Level</p>
                  <p className={`text-3xl font-black ${style.text}`}>
                    {node.currentLevel} <span className="text-lg font-bold text-opacity-70">m</span>
                  </p>
                </div>
                
                <div className="text-right">
                   <p className="text-xs font-medium text-slate-500">Danger: {node.dangerLevel}m</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black border-opacity-5 flex justify-between items-center text-xs font-medium text-slate-600">
                <span className="uppercase tracking-wider font-bold text-[10px] opacity-70">Status: {node.status}</span>
                <span>Updated: {node.lastUpdated}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}