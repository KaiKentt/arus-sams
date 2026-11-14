import { SignalIcon, ShieldExclamationIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Button from "../../components/ui/Button";

const AUTHORIZED_ROLES = ["headmaster", "asset_teacher", "superadmin"];

export default function DashboardHeader({ 
  userRole, 
  loading, 
  isSyncing, 
  isGeneratingPlan, 
  onGeneratePlan, 
  onForceSync 
}) {
  const canTriggerEvacuation = AUTHORIZED_ROLES.includes(userRole);

  return (
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <SignalIcon className="w-6 h-6 text-teal-600" />
        Early Warning Telemetry
      </h3>

      {canTriggerEvacuation && (
        <div className="flex gap-3">
          <Button
            variant="danger"
            onClick={onGeneratePlan}
            disabled={isGeneratingPlan || loading}
            className="shadow-md shadow-red-600/20"
          >
            <ShieldExclamationIcon className={`w-5 h-5 ${isGeneratingPlan ? "animate-pulse" : ""}`} />
            {isGeneratingPlan ? "Generating Plan..." : "Confirm Evacuation"}
          </Button>
          
          <Button
            variant="secondary"
            onClick={onForceSync}
            disabled={isSyncing || loading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Force Sync"}
          </Button>
        </div>
      )}
    </div>
  );
}