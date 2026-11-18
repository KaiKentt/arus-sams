import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { CheckCircleIcon, ExclamationTriangleIcon, ShieldExclamationIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function TelemetryCard({ node }) {
  const getStatusStyles = (status) => {
    switch (status) {
      case "normal":
        return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", variant: "active", icon: CheckCircleIcon };
      case "alert":
        return { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-200", variant: "warning", icon: ExclamationTriangleIcon };
      case "warning":
        return { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", variant: "warning", icon: ExclamationTriangleIcon };
      case "danger":
        return { bg: "bg-red-50", text: "text-red-800", border: "border-red-300", variant: "danger", icon: ShieldExclamationIcon };
      default:
        return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", variant: "neutral", icon: ExclamationCircleIcon };
    }
  };

  const style = getStatusStyles(node.status);

  return (
    <Card className={`relative p-6 !overflow-visible border-t-4 ${style.bg} ${style.border} transition-all hover:shadow-md`}>
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
            {node.currentLevel} <span className="text-lg font-bold opacity-60">m</span>
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
}