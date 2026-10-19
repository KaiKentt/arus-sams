import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import {
  SignalIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EvacuationTracker from "./EvacuationTracker";

export default function SchoolFloodDashboard({ schoolId, userRole }) {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Fetch the 3 mapped stations for this specific school using the standard client
      const { data: mappings, error: mapError } = await supabase
        .from("school_station")
        .select(
          `
          priority,
          stations (
            station_id,
            station_name,
            danger_level
          )
        `,
        )
        .eq("school_id", schoolId)
        .order("priority", { ascending: true });

      if (mapError) throw mapError;

      // 2. For each station, fetch the SINGLE most recent reading from water_data
      const enrichedData = await Promise.all(
        mappings.map(async (mapping) => {
          const station = mapping.stations;

          // Use the standard client here as well
          const { data: waterData } = await supabase
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
            lastUpdated: waterData
              ? new Date(waterData.recorded_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never",
          };
        }),
      );

      setTelemetry(enrichedData);
    } catch (error) {
      console.error("Error fetching telemetry:", error.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      fetchDashboardData();
    }
  }, [schoolId, fetchDashboardData]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Flip the switch to tell Python to start
      await supabase
        .from('schools')
        .update({ sync_requested: true })
        .eq('school_id', schoolId);

      // 2. Smart Polling: Check every 2 seconds if Python finished
      let isPythonDone = false;
      let attempts = 0;
      
      while (!isPythonDone && attempts < 10) { // Max 20 seconds wait
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data } = await supabase
          .from('schools')
          .select('sync_requested')
          .eq('school_id', schoolId)
          .single();
          
        if (data && data.sync_requested === false) {
          isPythonDone = true; // Python flipped it back!
        }
        attempts++;
      }

      // 3. Python is done! Fetch the fresh data
      await fetchDashboardData();
      
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  //call the function in Supabase to generate the evacuation plan for the school
  const handleGenerateEvacuationPlan = async () => {
    const confirmTrigger = window.confirm(
      "CRITICAL ACTION: Are you sure you want to trigger the flood evacuation plan? This will immediately notify teachers and assign assets to safe rooms."
    );
    if (!confirmTrigger) return;

    setIsGeneratingPlan(true);
    try {
      const { data, error } = await supabase.rpc('generate_evacuation_plan', {
        p_school_id: schoolId
      });

      if (error) throw error;
      
      alert("Evacuation Plan generated successfully! Ground staff can now view their tasks.");
      console.log("Generated Plan:", data);

      // Add this line to force the tracker component to fetch the new data
      window.dispatchEvent(new Event("evacuation_generated"));
      
    } catch (error) {
      console.error("Failed to generate evacuation plan:", error);
      alert("Failed to generate plan: " + error.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Helper function to color-code the UI based on the database status using Heroicons
  const getStatusStyles = (status) => {
    switch (status) {
      case "normal":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-200",
          variant: "active",
          icon: CheckCircleIcon,
        };
      case "alert":
        return {
          bg: "bg-yellow-50",
          text: "text-yellow-800",
          border: "border-yellow-200",
          variant: "warning",
          icon: ExclamationTriangleIcon,
        };
      case "warning":
        return {
          bg: "bg-orange-50",
          text: "text-orange-800",
          border: "border-orange-200",
          variant: "warning",
          icon: ExclamationTriangleIcon,
        };
      case "danger":
        return {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-300",
          variant: "danger",
          icon: ShieldExclamationIcon,
        };
      default:
        return {
          bg: "bg-slate-50",
          text: "text-slate-600",
          border: "border-slate-200",
          variant: "neutral",
          icon: ExclamationCircleIcon,
        };
    }
  };

  if (loading && !isSyncing) {
    return (
      <div className="p-4 text-center text-slate-500 animate-pulse font-medium">
        Loading live iHYDRO telemetry...
      </div>
    );
  }

  if (telemetry.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-50 border-dashed">
        <p className="text-slate-600 font-bold mb-1">
          No telemetry stations are currently mapped to this school.
        </p>
        <p className="text-sm text-slate-500">
          Update the school's coordinates to assign stations.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <SignalIcon className="w-6 h-6 text-teal-600" />
          Early Warning Telemetry
        </h3>


        {userRole === "headmaster" && (
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={handleGenerateEvacuationPlan}
              disabled={isGeneratingPlan || loading}
              className="shadow-md shadow-red-600/20"
            >
              <ShieldExclamationIcon className={`w-5 h-5 ${isGeneratingPlan ? "animate-pulse" : ""}`} />
              {isGeneratingPlan ? "Generating Plan..." : "Confirm Evacuation"}
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleForceSync}
              disabled={isSyncing || loading}
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Force Sync"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {telemetry.map((node) => {
          const style = getStatusStyles(node.status);

          return (
            <Card
              key={node.priority}
              className={`relative p-6 !overflow-visible border-t-4 ${style.bg} ${style.border} transition-all hover:shadow-md`}
            >
              {/* Priority Badge */}
              <div className="absolute -top-3 -left-3 shadow-md rounded">
                <Badge variant="brand">#{node.priority}</Badge>
              </div>

              <div className="flex justify-between items-start mb-4 mt-2">
                <h4 className="font-bold text-slate-900 text-lg leading-tight pr-4">
                  {node.stationName}
                </h4>
                <style.icon className={`w-6 h-6 ${style.text}`} />
              </div>

              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Current Level
                  </p>
                  <p className={`text-4xl font-black ${style.text}`}>
                    {node.currentLevel}{" "}
                    <span className="text-lg font-bold opacity-60">m</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Danger: {node.dangerLevel}m
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/5 flex justify-between items-center">
                <Badge variant={style.variant} icon={style.icon}>
                  {node.status}
                </Badge>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Updated: {node.lastUpdated}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
      <EvacuationTracker schoolId={schoolId} />
    </div>
  );
}
