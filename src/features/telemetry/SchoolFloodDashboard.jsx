import Card from "../../components/ui/Card";
import EvacuationTracker from "./EvacuationTracker";
import DashboardHeader from "./DashboardHeader";
import TelemetryCard from "./TelemetryCard";
import { useFloodDashboard } from "./useFloodDashboard";

export default function SchoolFloodDashboard({ schoolId, userRole }) {
  const {
    telemetry,
    loading,
    isSyncing,
    isGeneratingPlan,
    handleForceSync,
    handleGenerateEvacuationPlan,
  } = useFloodDashboard(schoolId);

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
      <DashboardHeader
        userRole={userRole}
        loading={loading}
        isSyncing={isSyncing}
        isGeneratingPlan={isGeneratingPlan}
        onGeneratePlan={handleGenerateEvacuationPlan}
        onForceSync={handleForceSync}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {telemetry.map((node) => (
          <TelemetryCard key={node.priority} node={node} />
        ))}
      </div>

      <EvacuationTracker schoolId={schoolId} userRole={userRole} />
    </div>
  );
}
