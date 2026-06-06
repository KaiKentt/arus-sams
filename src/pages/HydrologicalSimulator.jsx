import React from 'react';
import { supabase } from '../supabaseClient';

export default function HydrologicalSimulator() {
  const toggleFloodSimulation = async (statusValue) => {
    const { data: stationData } = await supabase
      .from("stations")
      .select("station_id")
      .eq("station_no", "101251") 
      .single();

    if (stationData) {
      await supabase.from("water_data").insert([{
        station_id: stationData.station_id,
        water_level: statusValue ? 5.35 : 1.1, 
        recorded_at: new Date().toLocaleString(),
        is_critical: statusValue
      }]);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-6 bg-white p-8 rounded-xl shadow border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">iHYDRO Regional Telemetry Simulator</h2>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <button onClick={() => toggleFloodSimulation(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg">
          🚨 Fire Torrential Surge Trigger
        </button>
        <button onClick={() => toggleFloodSimulation(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg">
          ✅ Restore Stream Equilibrium
        </button>
      </div>
    </div>
  );
}