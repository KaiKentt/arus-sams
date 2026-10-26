import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";

export function useFloodDashboard(schoolId) {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: mappings, error: mapError } = await supabase
        .from("school_station")
        .select(`priority, stations (station_id, station_name, danger_level)`)
        .eq("school_id", schoolId)
        .order("priority", { ascending: true });

      if (mapError) throw mapError;

      const enrichedData = await Promise.all(
        mappings.map(async (mapping) => {
          const station = mapping.stations;
          const { data: waterData } = await supabase
            .from("water_data")
            .select("water_level, status, recorded_at")
            .eq("station_id", station.station_id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .single();

          return {
            priority: mapping.priority,
            stationName: station.station_name,
            dangerLevel: station.danger_level,
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
    if (schoolId) fetchDashboardData();
  }, [schoolId, fetchDashboardData]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await supabase.from("schools").update({ sync_requested: true }).eq("school_id", schoolId);
      let isPythonDone = false;
      let attempts = 0;
      
      while (!isPythonDone && attempts < 10) { 
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const { data } = await supabase.from("schools").select("sync_requested").eq("school_id", schoolId).single();
        if (data && data.sync_requested === false) isPythonDone = true; 
        attempts++;
      }
      await fetchDashboardData();
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateEvacuationPlan = async () => {
    const confirmTrigger = window.confirm(
      "CRITICAL ACTION: Are you sure you want to trigger the flood evacuation plan? This will immediately notify teachers and assign assets to safe rooms."
    );
    if (!confirmTrigger) return;

    setIsGeneratingPlan(true);
    try {
      const { data, error } = await supabase.rpc("generate_evacuation_plan", { p_school_id: schoolId });
      if (error) throw error;
      
      alert("Evacuation Plan generated successfully! Ground staff can now view their tasks.");
      console.log("Generated Plan:", data);
      window.dispatchEvent(new Event("evacuation_generated"));
    } catch (error) {
      console.error("Failed to generate evacuation plan:", error);
      alert("Failed to generate plan: " + error.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return {
    telemetry,
    loading,
    isSyncing,
    isGeneratingPlan,
    handleForceSync,
    handleGenerateEvacuationPlan,
  };
}