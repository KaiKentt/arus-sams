import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { 
  MagnifyingGlassIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  MapPinIcon,
  BuildingLibraryIcon,
  HashtagIcon,
  FunnelIcon,
  SignalIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CubeIcon,
  UserGroupIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

// Helper: Convert Malaysian phone numbers (e.g. 012-3456789 or 082-123456) to 60... for WhatsApp
const getWhatsAppUrl = (phone, recipientName, schoolName, riskStatus) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("0")) {
    cleaned = "60" + cleaned.slice(1);
  } else if (!cleaned.startsWith("60")) {
    cleaned = "60" + cleaned;
  }

  const statusText = (riskStatus || "normal").toUpperCase();
  const message = encodeURIComponent(
    `Hello ${recipientName || "School Admin"}, this is the Arus-SAMS Ministry Portal reaching out regarding ${schoolName || "your school"} (Current Flood Telemetry Status: ${statusText}).`
  );
  return `https://wa.me/${cleaned}?text=${message}`;
};

// Risk group ordering & visual styling (Danger -> Warning -> Alert -> Normal -> Unmapped)
const RISK_GROUP_CONFIG = {
  danger: {
    order: 1,
    title: "CRITICAL DANGER — IMMEDIATE EVACUATION & ASSET RELOCATION",
    bannerClass: "bg-red-900 text-white",
    badgeClass: "bg-red-800 text-red-100 border border-red-700",
    pillClass: "bg-red-100 text-red-800 border-red-200",
    label: "DANGER",
  },
  warning: {
    order: 2,
    title: "WARNING LEVEL — HIGH FLOOD RISK STANDBY",
    bannerClass: "bg-orange-800 text-white",
    badgeClass: "bg-orange-700 text-orange-100 border border-orange-600",
    pillClass: "bg-orange-100 text-orange-800 border-orange-200",
    label: "WARNING",
  },
  alert: {
    order: 3,
    title: "ALERT LEVEL — RISING WATER MONITOR",
    bannerClass: "bg-amber-700 text-white",
    badgeClass: "bg-amber-600 text-amber-100 border border-amber-500",
    pillClass: "bg-amber-100 text-amber-800 border-amber-200",
    label: "ALERT",
  },
  normal: {
    order: 4,
    title: "NORMAL LEVEL — SAFE OPERATING CONDITIONS",
    bannerClass: "bg-slate-800 text-white",
    badgeClass: "bg-slate-700 text-teal-300",
    pillClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    label: "NORMAL",
  },
  unmapped: {
    order: 5,
    title: "NO TELEMETRY / STATIONS UNMAPPED OR OFFLINE",
    bannerClass: "bg-slate-600 text-white",
    badgeClass: "bg-slate-500 text-slate-100",
    pillClass: "bg-slate-100 text-slate-600 border-slate-200",
    label: "OFFLINE / UNMAPPED",
  },
};

export default function SchoolsTable({
  schools = [],
  globalStaff = [],
  globalAssets = [],
  onEdit,
  onDelete,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [selectedSensorMode, setSelectedSensorMode] = useState("ALL");

  const [telemetryBySchool, setTelemetryBySchool] = useState({});
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [syncingSchoolId, setSyncingSchoolId] = useState(null);

  // Pure async helper: fetches from Supabase and RETURNS the evaluated map (no setState inside)
  const getEvaluatedSchoolTelemetry = useCallback(async () => {
    const { data: mappings, error: mapError } = await supabase
      .from("school_station")
      .select(
        `school_id, priority, stations (station_id, station_name, normal_level, alert_level, warning_level, danger_level)`
      )
      .order("priority", { ascending: true });

    if (mapError) throw mapError;

    const uniqueStationIds = Array.from(
      new Set(
        (mappings || [])
          .map((m) => m.stations?.station_id)
          .filter(Boolean)
      )
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

    const schoolMap = {};
    (mappings || []).forEach((m) => {
      if (!m.stations) return;
      const sId = m.school_id;
      if (!schoolMap[sId]) schoolMap[sId] = [];

      const reading = latestWaterByStation[m.stations.station_id] || null;
      schoolMap[sId].push({
        priority: m.priority,
        stationId: m.stations.station_id,
        stationName: m.stations.station_name,
        dangerLevel: m.stations.danger_level,
        warningLevel: m.stations.warning_level,
        alertLevel: m.stations.alert_level,
        waterLevel: reading ? reading.water_level : null,
        status: reading ? reading.status : "offline",
        recordedAt: reading ? reading.recorded_at : null,
      });
    });

    const evaluatedMap = {};
    Object.keys(schoolMap).forEach((sId) => {
      const stationsList = schoolMap[sId].sort((a, b) => a.priority - b.priority);

      const timestamps = stationsList
        .map((st) => (st.recordedAt ? new Date(st.recordedAt).getTime() : 0))
        .filter((t) => t > 0);
      const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : 0;

      const STALE_THRESHOLD_MS = 45 * 60 * 1000;
      let activeStation = null;

      for (const st of stationsList) {
        if (st.waterLevel !== null && st.recordedAt) {
          const stTime = new Date(st.recordedAt).getTime();
          const isStaleComparedToBackup =
            newestTimestamp - stTime > STALE_THRESHOLD_MS;

          if (!isStaleComparedToBackup) {
            activeStation = st;
            break;
          }
        }
      }

      if (!activeStation) {
        activeStation =
          stationsList.find((st) => st.waterLevel !== null) || null;
      }

      evaluatedMap[sId] = {
        stations: stationsList,
        activeStation,
        isFailover: activeStation ? activeStation.priority > 1 : false,
        effectiveStatus: activeStation ? activeStation.status : "unmapped",
      };
    });

    return evaluatedMap;
  }, []);

  // Subscribe to telemetry promise on mount — setState only runs inside async .then() callback
  useEffect(() => {
    let ignore = false;

    getEvaluatedSchoolTelemetry()
      .then((evaluatedMap) => {
        if (!ignore) {
          setTelemetryBySchool(evaluatedMap);
        }
      })
      .catch((err) => {
        console.error("Error fetching school telemetry:", err.message);
      })
      .finally(() => {
        if (!ignore) {
          setLoadingTelemetry(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [getEvaluatedSchoolTelemetry]);

  // Handler for the manual "Refresh Telemetry" button
  const handleManualRefresh = async () => {
    setLoadingTelemetry(true);
    try {
      const evaluatedMap = await getEvaluatedSchoolTelemetry();
      setTelemetryBySchool(evaluatedMap);
    } catch (err) {
      console.error("Error refreshing telemetry:", err.message);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // Ministry Force Sync for a single school
  const handleForceSyncSchool = async (schoolId, schoolName) => {
    setSyncingSchoolId(schoolId);
    try {
      const { data: updatedRows, error: updateError } = await supabase
        .from("schools")
        .update({ sync_requested: true })
        .eq("school_id", schoolId)
        .select("school_id, sync_requested");

      if (updateError) throw new Error(updateError.message);
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(`Could not trigger sync for ${schoolName}.`);
      }

      let isDone = false;
      let attempts = 0;
      while (!isDone && attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const { data } = await supabase
          .from("schools")
          .select("sync_requested")
          .eq("school_id", schoolId)
          .single();

        if (data && data.sync_requested === false) {
          isDone = true;
        }
        attempts++;
      }

      const evaluatedMap = await getEvaluatedSchoolTelemetry();
      setTelemetryBySchool(evaluatedMap);
    } catch (err) {
      alert("Force Sync failed: " + err.message);
    } finally {
      setSyncingSchoolId(null);
    }
  };
  
  // Enrich schools with Telemetry + Headmaster + Asset/Staff counts
  const enrichedSchools = useMemo(() => {
    return schools.map((school) => {
      const sId = school.school_id;
      const telemetryInfo = telemetryBySchool[sId] || {
        stations: [],
        activeStation: null,
        isFailover: false,
        effectiveStatus: "unmapped",
      };

      const schoolStaff = globalStaff.filter((st) => st.school_id === sId);
      const headmaster =
        schoolStaff.find((st) => st.role === "headmaster") || null;

      const schoolAssets = globalAssets.filter((a) => a.school_id === sId);

      return {
        ...school,
        telemetryInfo,
        headmaster,
        staffCount: schoolStaff.length,
        assetCount: schoolAssets.length,
      };
    });
  }, [schools, telemetryBySchool, globalStaff, globalAssets]);

  // Filter schools by Search (Name, PTJ Code, Station Name, Headmaster), Risk Status, and Sensor Mode
  const filteredSchools = useMemo(() => {
    return enrichedSchools.filter((school) => {
      const activeSt = school.telemetryInfo.activeStation;
      const stationNames = school.telemetryInfo.stations
        .map((s) => s.stationName)
        .join(" ");

      const matchesSearch =
        !searchTerm.trim() ||
        school.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.ptj_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.contact_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.headmaster?.full_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        stationNames.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk =
        selectedRisk === "ALL" ||
        school.telemetryInfo.effectiveStatus === selectedRisk;

      const matchesSensorMode =
        selectedSensorMode === "ALL" ||
        (selectedSensorMode === "PRIMARY" &&
          activeSt &&
          activeSt.priority === 1) ||
        (selectedSensorMode === "FAILOVER" &&
          school.telemetryInfo.isFailover) ||
        (selectedSensorMode === "UNMAPPED" && !activeSt);

      return matchesSearch && matchesRisk && matchesSensorMode;
    });
  }, [enrichedSchools, searchTerm, selectedRisk, selectedSensorMode]);

  // Group filtered schools by Risk Level (Layout A: Danger -> Warning -> Alert -> Normal -> Unmapped)
  const groupedSchools = useMemo(() => {
    const groups = {};

    filteredSchools.forEach((school) => {
      const riskKey = RISK_GROUP_CONFIG[school.telemetryInfo.effectiveStatus]
        ? school.telemetryInfo.effectiveStatus
        : "unmapped";

      if (!groups[riskKey]) {
        groups[riskKey] = [];
      }
      groups[riskKey].push(school);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) =>
        (a.school_name || "").localeCompare(b.school_name || "")
      );
    });

    return Object.entries(groups).sort(
      ([keyA], [keyB]) =>
        (RISK_GROUP_CONFIG[keyA]?.order || 99) -
        (RISK_GROUP_CONFIG[keyB]?.order || 99)
    );
  }, [filteredSchools]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedRisk !== "ALL" ||
    selectedSensorMode !== "ALL";

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedRisk("ALL");
    setSelectedSensorMode("ALL");
  };

  return (
    <Card className="fade-in">
      {/* TABLE HEADER, SEARCH & FILTERS */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
              <BuildingLibraryIcon className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Schools Database & Flood Risk Status
              </h3>
              <p className="text-sm text-slate-500">
                Grouped by live flood severity with P1 → P2 → P3 station failover
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredSchools.length}</strong> of{" "}
              <strong className="text-slate-800">{schools.length}</strong> facilities
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200 transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <button
              onClick={handleManualRefresh}
              disabled={loadingTelemetry}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
            >
              <ArrowPathIcon
                className={`w-4 h-4 text-teal-600 ${
                  loadingTelemetry ? "animate-spin" : ""
                }`}
              />
              Refresh Telemetry
            </button>
          </div>
        </div>

        {/* FILTER BAR: SEARCH + RISK LEVEL + SENSOR MODE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* 1. Search by Name, PTJ Code, Station, or Headmaster */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, PTJ code, station, or headmaster..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 2. Flood Risk Filter */}
          <div className="relative">
            <FunnelIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
            >
              <option value="ALL">All Flood Risk Levels</option>
              <option value="danger">🚨 Danger Level</option>
              <option value="warning">⚠️ Warning Level</option>
              <option value="alert">🔔 Alert Level</option>
              <option value="normal">🟢 Normal Level</option>
              <option value="unmapped">⚪ Unmapped / Offline</option>
            </select>
          </div>

          {/* 3. Sensor Failover Mode Filter */}
          <div className="relative">
            <SignalIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedSensorMode}
              onChange={(e) => setSelectedSensorMode(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-teal-600 focus:border-teal-600 outline-none transition-colors"
            >
              <option value="ALL">All Telemetry Sensor Modes</option>
              <option value="PRIMARY">Primary Sensor Active (P1)</option>
              <option value="FAILOVER">Backup Failover Active (P2 / P3)</option>
              <option value="UNMAPPED">No Active Sensor</option>
            </select>
          </div>
        </div>
      </div>

      {/* GROUPED DATA TABLE BY RISK LEVEL */}
      <div className="overflow-x-auto">
        {groupedSchools.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No schools found matching your search or filter criteria.
          </div>
        ) : (
          groupedSchools.map(([riskKey, schoolList]) => {
            const config = RISK_GROUP_CONFIG[riskKey] || RISK_GROUP_CONFIG.unmapped;
            const isAtRiskGroup = ["danger", "warning", "alert"].includes(riskKey);

            return (
              <div
                key={riskKey}
                className="border-b border-slate-200 last:border-b-0"
              >
                {/* RISK LEVEL GROUP BANNER (Matches StaffTable Banner Style) */}
                <div
                  className={`${config.bannerClass} px-6 py-3 flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2.5">
                    {isAtRiskGroup ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-300 shrink-0" />
                    ) : (
                      <ShieldCheckIcon className="w-5 h-5 text-teal-400 shrink-0" />
                    )}
                    <span className="font-bold text-sm tracking-wide">
                      {config.title}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.badgeClass}`}
                  >
                    {schoolList.length}{" "}
                    {schoolList.length === 1 ? "Facility" : "Facilities"}
                  </span>
                </div>

                {/* SCHOOLS ROWS FOR THIS RISK LEVEL */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-4 pl-6 w-1/4">School Details & Readiness</th>
                      <th className="p-4 w-1/6">PTJ & Coordinates</th>
                      <th className="p-4 w-1/3">
                        Active Telemetry (P1 → P2 → P3 Failover)
                      </th>
                      <th className="p-4 w-1/5">Emergency Contact</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schoolList.map((school) => {
                      const {
                        activeStation,
                        stations,
                        isFailover,
                        effectiveStatus,
                      } = school.telemetryInfo;
                      const isSyncingThisSchool =
                        syncingSchoolId === school.school_id;
                      const hm = school.headmaster;

                      // Use Headmaster phone first, or fallback to school.contact_no
                      const primaryPhone = hm?.phone_no || school.contact_no;
                      const contactPersonName = hm?.full_name || "School Office";
                      const waUrl = getWhatsAppUrl(
                        primaryPhone,
                        contactPersonName,
                        school.school_name,
                        effectiveStatus
                      );

                      return (
                        <tr
                          key={school.school_id}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          {/* 1. School Name + Assets & Staff Count */}
                          <td className="p-4 pl-6 align-top">
                            <p className="font-bold text-slate-800">
                              {school.school_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${
                                  isAtRiskGroup && school.assetCount > 0
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                <CubeIcon className="w-3.5 h-3.5" />
                                {school.assetCount}{" "}
                                {isAtRiskGroup ? "Assets at Risk" : "Assets"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                <UserGroupIcon className="w-3.5 h-3.5" />
                                {school.staffCount} Staff
                              </span>
                            </div>
                          </td>

                          {/* 2. PTJ Code Badge & Clickable Coordinates */}
                          <td className="p-4 align-top space-y-2">
                            <div>
                              <Badge variant="neutral" icon={HashtagIcon}>
                                {school.ptj_code || "N/A"}
                              </Badge>
                            </div>
                            {school.latitude && school.longitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${school.latitude},${school.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Google Maps"
                                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-teal-600 font-mono transition-colors"
                              >
                                <MapPinIcon className="w-4 h-4 text-teal-600 shrink-0" />
                                {school.latitude}, {school.longitude}
                              </a>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                                <MapPinIcon className="w-4 h-4 text-slate-300" />
                                No coordinates
                              </div>
                            )}
                          </td>

                          {/* 3. Active Telemetry & P1 -> P2 -> P3 Failover Status */}
                          <td className="p-4 align-top">
                            {activeStation ? (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase ${config.pillClass}`}
                                  >
                                    {config.label} • {activeStation.waterLevel}m
                                  </span>

                                  {isFailover ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md">
                                      ⚡ Failover Active (Using P{activeStation.priority})
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                                      Primary (P1)
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm font-semibold text-slate-800">
                                  {activeStation.stationName}{" "}
                                  <span className="text-xs font-normal text-slate-500">
                                    (Danger: {activeStation.dangerLevel}m)
                                  </span>
                                </p>

                                {/* Mini P1 / P2 / P3 Failover Chain Pills */}
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  {stations.map((st) => {
                                    const isCurrent =
                                      st.stationId === activeStation.stationId;
                                    const hasData = st.waterLevel !== null;

                                    return (
                                      <span
                                        key={st.priority}
                                        title={`${st.stationName}: ${
                                          hasData
                                            ? `${st.waterLevel}m (${st.status.toUpperCase()})`
                                            : "Offline / No Data"
                                        }`}
                                        className={`text-[11px] px-2 py-0.5 rounded border ${
                                          isCurrent
                                            ? "bg-slate-800 text-white border-slate-800 font-bold"
                                            : hasData
                                            ? "bg-white text-slate-600 border-slate-200"
                                            : "bg-red-50 text-red-600 border-red-200 line-through"
                                        }`}
                                      >
                                        P{st.priority}: {st.stationName} (
                                        {hasData ? `${st.waterLevel}m` : "Down"})
                                      </span>
                                    );
                                  })}
                                </div>

                                {activeStation.recordedAt && (
                                  <p className="text-[11px] text-slate-400">
                                    Updated:{" "}
                                    {new Date(
                                      activeStation.recordedAt
                                    ).toLocaleString([], {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                No stations mapped or all sensors offline
                              </span>
                            )}
                          </td>

                          {/* 4. Emergency Contact (Headmaster + School Contact No + 1-Click Buttons) */}
                          <td className="p-4 align-top">
                            <div className="space-y-1.5">
                              {hm ? (
                                <p className="text-sm font-bold text-slate-800">
                                  {hm.full_name}{" "}
                                  <span className="text-xs font-normal text-teal-600">
                                    (HM)
                                  </span>
                                </p>
                              ) : (
                                <p className="text-xs font-semibold text-amber-700">
                                  ⚠️ No Headmaster Assigned
                                </p>
                              )}

                              <p className="text-xs text-slate-600 font-medium">
                                Office: {school.contact_no || "N/A"}
                              </p>

                              {primaryPhone && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {waUrl && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`WhatsApp ${contactPersonName} (${primaryPhone})`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                                    >
                                      <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                      WhatsApp
                                    </a>
                                  )}
                                  <a
                                    href={`tel:${primaryPhone}`}
                                    title={`Call ${primaryPhone}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                                  >
                                    <PhoneIcon className="w-3.5 h-3.5" />
                                    Call
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Actions: Force Sync + Edit + Delete */}
                          <td className="p-4 pr-6 text-right align-top">
                            <div className="flex justify-end items-center gap-1">
                              <button
                                onClick={() =>
                                  handleForceSyncSchool(
                                    school.school_id,
                                    school.school_name
                                  )
                                }
                                disabled={isSyncingThisSchool}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors disabled:opacity-50 mr-1"
                                title="Force Sync this school's iHYDRO stations"
                              >
                                <ArrowPathIcon
                                  className={`w-4 h-4 ${
                                    isSyncingThisSchool ? "animate-spin" : ""
                                  }`}
                                />
                                {isSyncingThisSchool ? "Syncing..." : "Sync"}
                              </button>

                              <button
                                onClick={() => onEdit(school)}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit School"
                              >
                                <PencilSquareIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() =>
                                  onDelete(school.school_id, school.school_name)
                                }
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete School"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}