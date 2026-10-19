import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { ArrowPathIcon, CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function EvacuationTracker({ schoolId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("evacuation_orders")
        .select(`
          order_id,
          priority_rank,
          status,
          assets ( asset_name )
        `)
        .eq("school_id", schoolId)
        .order("priority_rank", { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching evacuation orders:", error.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  // Fetch orders when the component loads or school changes
  useEffect(() => {
    if (schoolId) {
      fetchOrders();
    }
  }, [schoolId, fetchOrders]);

  // Listen for the custom event triggered by the Headmaster's button
  useEffect(() => {
    const handleCustomEvent = () => fetchOrders();
    window.addEventListener("evacuation_generated", handleCustomEvent);
    return () => window.removeEventListener("evacuation_generated", handleCustomEvent);
  }, [fetchOrders]);

  if (loading && orders.length === 0) {
    return (
      <div className="mt-8 p-4 text-center text-slate-500 animate-pulse font-medium">
        Loading live evacuation status...
      </div>
    );
  }

  // Hide the tracker completely if no evacuation plan exists yet
  if (orders.length === 0) {
    return null; 
  }

  const completedCount = orders.filter((o) => o.status === "evacuated").length;
  const progress = Math.round((completedCount / orders.length) * 100) || 0;

  return (
    <div className="mt-12">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">
            Live Evacuation Tracker
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Monitoring mobile app updates from ground staff.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchOrders} disabled={loading}>
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing..." : "Refresh Status"}
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-t-4 border-slate-800">
        {/* Progress Bar */}
        <div className="bg-slate-100 w-full h-3">
          <div 
            className="bg-emerald-500 h-3 transition-all duration-500" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Priority</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Asset Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.order_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 w-24">
                    <span className="font-mono font-bold text-slate-400">
                      #{order.priority_rank}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-900">
                    {order.assets?.asset_name || "Unknown Asset"}
                  </td>
                  <td className="p-4 w-48">
                    {order.status === "evacuated" ? (
                      <Badge variant="success" icon={CheckCircleIcon}>
                        Evacuated
                      </Badge>
                    ) : (
                      <Badge variant="warning" icon={ClockIcon}>
                        Pending Rescue
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}