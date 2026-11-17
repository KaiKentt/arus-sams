import { useState, useEffect, useCallback } from "react";
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
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  SignalIcon,
  CubeIcon
} from "@heroicons/react/24/outline";

// Helper: Convert Malaysian phone numbers to 60... for 1-click WhatsApp emergency contact
const getWhatsAppUrl = (phone, recipientName, schoolName, riskStatus, waterLevel) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("0")) {
    cleaned = "60" + cleaned.slice(1);
  } else if (!cleaned.startsWith("60")) {
    cleaned = "60" + cleaned;
  }

  const statusText = (riskStatus || "alert").toUpperCase();
  const message = encodeURIComponent(
    ` URGENT [${statusText} - ${waterLevel}m]: Hello ${recipientName || "School Admin"}, this is the Arus-SAMS Ministry Portal contacting you regarding elevated flood telemetry at ${schoolName}. Please confirm asset & school readiness.`
  );
  return `https://wa.me/${cleaned}?text=${message}`;
};

const SEVERITY_ORDER = {
  danger: 1,
  warning: 2,
  alert: 3,
  normal: 4,
};

// Pure async data loader outside component so ESLint never flags useEffect
async function loadOverviewData() {
  const [schoolsRes, staffRes, assetsRes, mappingsRes] = await Promise.all([
    supabase.from("schools").select("*"),
    supabase.from("staff").select("*"),
    supabase.from("assets").select("*"),
    supabase
      .from("school_station")
      .select(
        `school_id, priority, stations (station_id, station_name, normal_level, alert_level, warning_level, danger_level)`
      )
      .order("priority", { ascending: true }),
  ]);

  const schools = schoolsRes.data || [];
  const staff = staffRes.data || [];
  const assets = assetsRes.data || [];
  const mappings = mappingsRes.data || [];

  // Fetch only the LATEST water_data row per unique station_id
  const uniqueStationIds = Array.from(
    new Set(mappings.map((m) => m.stations?.station_id).filter(Boolean))
  );

  const latestWaterByStation = {};
  await Promise.all(
    uniqueStationIds.map(async (stationId) => {
      const { data: waterRow } = await supabase
        .from("water_data")
        .select("water_level, status, recorded_at")
        .eq("station_id", stationId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (waterRow) {
        latestWaterByStation[stationId] = waterRow;
      }
    })
  );

  // Group mapped stations by school_id
  const stationsBySchool = {};
  mappings.forEach((m) => {
    if (!m.stations) return;
    const sId = m.school_id;
    if (!stationsBySchool[sId]) stationsBySchool[sId] = [];

    const reading = latestWaterByStation[m.stations.station_id] || null;
    stationsBySchool[sId].push({
      priority: m.priority,
      stationId: m.stations.station_id,
      stationName: m.stations.station_name,
      dangerLevel: m.stations.danger_level,
      waterLevel: reading ? reading.water_level : null,
      status: reading ? reading.status : "offline",
      recordedAt: reading ? reading.recorded_at : null,
    });
  });

  // Evaluate P1 -> P2 -> P3 failover per school
  const STALE_THRESHOLD_MS = 45 * 60 * 1000;
  const activeAlertsList = [];
  const failoverSchools = [];
  const unmappedSchools = [];
  const missingHeadmasterSchools = [];

  schools.forEach((school) => {
    const sId = school.school_id;
    const schoolStaff = staff.filter((st) => st.school_id === sId);
    const headmaster = schoolStaff.find((st) => st.role === "headmaster") || null;
    const schoolAssets = assets.filter((a) => a.school_id === sId);

    if (!headmaster) {
      missingHeadmasterSchools.push(school.school_name);
    }

    const stationsList = (stationsBySchool[sId] || []).sort(
      (a, b) => a.priority - b.priority
    );

    if (stationsList.length === 0) {
      unmappedSchools.push(school.school_name);
      return;
    }

    const timestamps = stationsList
      .map((st) => (st.recordedAt ? new Date(st.recordedAt).getTime() : 0))
      .filter((t) => t > 0);
    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    let activeStation = null;
    for (const st of stationsList) {
      if (st.waterLevel !== null && st.recordedAt) {
        const stTime = new Date(st.recordedAt).getTime();
        if (newestTimestamp - stTime <= STALE_THRESHOLD_MS) {
          activeStation = st;
          break;
        }
      }
    }

    if (!activeStation) {
      activeStation = stationsList.find((st) => st.waterLevel !== null) || null;
    }

    if (!activeStation) {
      unmappedSchools.push(school.school_name);
      return;
    }

    const isFailover = activeStation.priority > 1;
    if (isFailover) {
      failoverSchools.push({
        schoolName: school.school_name,
        priority: activeStation.priority,
        stationName: activeStation.stationName,
      });
    }

    // If current active station is in danger, warning, or alert, add to Active Flood Watch
    if (["danger", "warning", "alert"].includes(activeStation.status)) {
      activeAlertsList.push({
        schoolId: sId,
        schoolName: school.school_name,
        contact: headmaster?.phone_no || school.contact_no || null,
        headmasterName: headmaster?.full_name || null,
        stationName: activeStation.stationName,
        priority: activeStation.priority,
        isFailover,
        level: activeStation.waterLevel,
        dangerLevel: activeStation.dangerLevel,
        status: activeStation.status,
        assetCount: schoolAssets.length,
        recordedAt: activeStation.recordedAt,
        time: activeStation.recordedAt
          ? new Date(activeStation.recordedAt).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",
      });
    }
  });

  // Sort active alerts by severity (Danger -> Warning -> Alert)
  activeAlertsList.sort((a, b) => {
    const orderA = SEVERITY_ORDER[a.status] || 99;
    const orderB = SEVERITY_ORDER[b.status] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return b.level - a.level;
  });

  // Count assets relocated to temporary flood locations
  const relocatedAssetsCount = assets.filter(
    (a) =>
      Boolean(a.temporary_location) ||
      a.status?.toLowerCase() === "relocated" ||
      a.location?.toLowerCase().includes("temporary")
  ).length;

  return {
    stats: {
      schools: schools.length,
      mappedSchools: schools.length - unmappedSchools.length,
      staff: staff.length,
      headmasters: schools.length - missingHeadmasterSchools.length,
      assets: assets.length,
      relocatedAssets: relocatedAssetsCount,
      atRiskSchools: activeAlertsList.length,
    },
    activeAlerts: activeAlertsList,
    readiness: {
      failoverSchools,
      unmappedSchools,
      missingHeadmasterSchools,
    },
  };
}

export default function MinistryOverview() {
  const [stats, setStats] = useState({
    schools: 0,
    mappedSchools: 0,
    staff: 0,
    headmasters: 0,
    assets: 0,
    relocatedAssets: 0,
    atRiskSchools: 0,
  });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [readiness, setReadiness] = useState({
    failoverSchools: [],
    unmappedSchools: [],
    missingHeadmasterSchools: [],
  });
  const [loading, setLoading] = useState(true);

  // Initial load on mount inside promise callback (zero ESLint warnings)
  useEffect(() => {
    let ignore = false;

    loadOverviewData()
      .then((result) => {
        if (ignore) return;
        setStats(result.stats);
        setActiveAlerts(result.activeAlerts);
        setReadiness(result.readiness);
      })
      .catch((error) => {
        console.error("Error fetching overview data:", error);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadOverviewData();
      setStats(result.stats);
      setActiveAlerts(result.activeAlerts);
      setReadiness(result.readiness);
    } catch (error) {
      console.error("Error refreshing overview data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold tracking-wide">
          Loading Regional Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Total Schools */}
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <BuildingOfficeIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Schools
            </p>
            <p className="text-3xl font-black text-slate-800">{stats.schools}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.mappedSchools} with active telemetry
            </p>
          </div>
        </Card>

        {/* 2. System Users */}
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <UserGroupIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              System Users
            </p>
            <p className="text-3xl font-black text-slate-800">{stats.staff}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.headmasters}/{stats.schools} Headmasters assigned
            </p>
          </div>
        </Card>

        {/* 3. Tracked Assets */}
        <Card className="p-6 flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <ComputerDesktopIcon className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tracked Assets
            </p>
            <p className="text-3xl font-black text-slate-800">{stats.assets}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.relocatedAssets > 0
                ? `${stats.relocatedAssets} in temporary flood location`
                : "All in standard locations"}
            </p>
          </div>
        </Card>

        {/* 4. Live Flood Risk Count */}
        <Card
          className={`p-6 flex items-center gap-4 border ${
            stats.atRiskSchools > 0
              ? "bg-red-50/40 border-red-200"
              : "border-slate-200"
          }`}
        >
          <div
            className={`p-3 rounded-lg border ${
              stats.atRiskSchools > 0
                ? "bg-red-100 border-red-200"
                : "bg-emerald-50 border-emerald-100"
            }`}
          >
            {stats.atRiskSchools > 0 ? (
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            ) : (
              <ShieldCheckIcon className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Schools At Risk
            </p>
            <p
              className={`text-3xl font-black ${
                stats.atRiskSchools > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {stats.atRiskSchools}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.atRiskSchools > 0
                ? "Elevated water levels detected"
                : "All river stations normal"}
            </p>
          </div>
        </Card>
      </div>

      {/* TELEMETRY FAILOVER OR READINESS ADVISORIES (Only shown if attention is needed) */}
      {(readiness.failoverSchools.length > 0 ||
        readiness.unmappedSchools.length > 0 ||
        readiness.missingHeadmasterSchools.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {readiness.failoverSchools.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <SignalIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">
                  ⚡ Active Station Failover ({readiness.failoverSchools.length})
                </p>
                <p className="text-amber-700 mt-1">
                  Primary (P1) sensor offline; automatically switched to backup:{" "}
                  <strong>
                    {readiness.failoverSchools
                      .map((f) => `${f.schoolName} (P${f.priority})`)
                      .join(", ")}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {readiness.unmappedSchools.length > 0 && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <MapPinIcon className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-800">
                  ⚪ Unmapped / Offline Telemetry ({readiness.unmappedSchools.length})
                </p>
                <p className="text-slate-600 mt-1">
                  Needs station mapping or sync:{" "}
                  <strong>{readiness.unmappedSchools.join(", ")}</strong>
                </p>
              </div>
            </div>
          )}

          {readiness.missingHeadmasterSchools.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
              <UserGroupIcon className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-orange-900">
                 Missing Headmaster ({readiness.missingHeadmasterSchools.length})
                </p>
                <p className="text-orange-700 mt-1">
                  Assign a Headmaster in Staff Directory:{" "}
                  <strong>{readiness.missingHeadmasterSchools.join(", ")}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE FLOOD ALERTS PANEL */}
      <Card>
        <div className="bg-slate-900 p-4 flex flex-wrap justify-between items-center gap-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            Active iHYDRO Flood Watch
          </h3>

          <div className="flex items-center gap-3">
            {activeAlerts.length > 0 && (
              <Badge variant="danger" icon={ExclamationCircleIcon}>
                {activeAlerts.length} Active
              </Badge>
            )}
            <button
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 text-teal-400" />
              Refresh Watch
            </button>
          </div>
        </div>

        <div className="p-0">
          {activeAlerts.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center bg-slate-50">
              <ShieldCheckIcon className="w-16 h-16 text-emerald-500 mb-3" />
              <p className="text-slate-800 font-bold text-lg">
                Regional Telemetry Normal
              </p>
              <p className="text-sm text-slate-500 mt-1">
                No schools are currently reporting Alert, Warning, or Danger water levels.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeAlerts.map((alert) => {
                const waUrl = getWhatsAppUrl(
                  alert.contact,
                  alert.headmasterName,
                  alert.schoolName,
                  alert.status,
                  alert.level
                );

                return (
                  <div
                    key={alert.schoolId}
                    className={`p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                      alert.status === "danger"
                        ? "bg-red-50/60"
                        : alert.status === "warning"
                        ? "bg-orange-50/60"
                        : "bg-amber-50/50"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-lg">
                          {alert.schoolName}
                        </h4>
                        {alert.isFailover ? (
                          <span className="text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md">
                            ⚡ Failover Sensor (P{alert.priority})
                          </span>
                        ) : (
                          <span className="text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md">
                            Primary Sensor (P1)
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-md">
                          <CubeIcon className="w-3.5 h-3.5" />
                          {alert.assetCount} Assets at Risk
                        </span>
                      </div>

                      <div className="text-sm text-slate-600 flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <MapPinIcon className="w-4 h-4 text-teal-600" />
                          {alert.stationName} (Danger: {alert.dangerLevel}m)
                        </span>
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="w-4 h-4 text-slate-400" />
                          {alert.headmasterName
                            ? `${alert.headmasterName}: ${alert.contact || "No Phone"}`
                            : `Office: ${alert.contact || "N/A"}`}
                        </span>
                      </div>

                      {/* 1-Click Emergency Contact Actions */}
                      {alert.contact && (
                        <div className="flex items-center gap-2 pt-1">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                            >
                              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                              WhatsApp Emergency Alert
                            </a>
                          )}
                          <a
                            href={`tel:${alert.contact}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                          >
                            <PhoneIcon className="w-3.5 h-3.5" />
                            Call Now
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="md:text-right flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-200/60">
                      <p
                        className={`text-3xl font-black ${
                          alert.status === "danger"
                            ? "text-red-600"
                            : alert.status === "warning"
                            ? "text-orange-500"
                            : "text-amber-600"
                        }`}
                      >
                        {alert.level}m
                      </p>
                      <div className="mt-1">
                        <Badge
                          variant={
                            alert.status === "danger" ? "danger" : "warning"
                          }
                        >
                          {alert.status.toUpperCase()} • {alert.time}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}