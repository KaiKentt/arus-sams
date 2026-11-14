import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  HandRaisedIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const COMMAND_ROLES = ["headmaster", "asset_teacher", "superadmin"];

// Helper to resolve "Block A › Ground Floor" parent hierarchy from a location map
function getLocationHierarchy(locationObj, locationMap) {
  if (!locationObj) {
    return { roomName: "Unassigned Location", parentPath: null };
  }

  const parents = [];
  const visited = new Set([locationObj.location_id]);
  let currentParentId = locationObj.parent_location_id;

  while (
    currentParentId &&
    locationMap[currentParentId] &&
    !visited.has(currentParentId)
  ) {
    visited.add(currentParentId);
    const parentNode = locationMap[currentParentId];
    parents.unshift(parentNode.location_name);
    currentParentId = parentNode.parent_location_id;
  }

  return {
    roomName: locationObj.location_name,
    parentPath: parents.length > 0 ? parents.join(" › ") : null,
  };
}

export default function EvacuationTracker({
  schoolId,
  userRole = "",
  currentUserName = "Staff Member",
}) {
  const [orders, setOrders] = useState([]);
  const [locationMap, setLocationMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Filter & Admin Controls
  const [selectedRoom, setSelectedRoom] = useState("ALL");
  const [hideEvacuated, setHideEvacuated] = useState(false);
  const [confirmStandDown, setConfirmStandDown] = useState(false);
  const [isStandingDown, setIsStandingDown] = useState(false);

  const canCommandEvacuation = COMMAND_ROLES.includes(userRole.toLowerCase());
  const staffDisplayName = currentUserName?.trim() || "Staff Member";

  const fetchOrders = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setActionError(null);

    try {
      const [ordersRes, locationsRes] = await Promise.all([
        supabase
          .from("evacuation_orders")
          .select(
            `
            order_id,
            asset_id,
            priority_rank,
            status,
            handled_by_name,
            created_at,
            updated_at,
            assets (
              asset_name,
              criticality_level
            ),
            from_location:locations!evacuation_orders_from_location_id_fkey (
              location_id,
              location_name,
              parent_location_id
            ),
            target_location:locations!evacuation_orders_target_location_id_fkey (
              location_id,
              location_name,
              parent_location_id
            )
          `,
          )
          .eq("school_id", schoolId)
          .neq("status", "cancelled") // Hide stood-down orders from previous evacuations
          .order("priority_rank", { ascending: true }),

        supabase
          .from("locations")
          .select("location_id, location_name, parent_location_id")
          .eq("school_id", schoolId),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (locationsRes.error) throw locationsRes.error;

      const rawOrders = ordersRes.data || [];

      // Isolate only the current/latest evacuation wave so prior emergencies don't mix in
      const activeWaveOrders = rawOrders.filter((o) =>
        ["pending", "in_progress"].includes(o.status),
      );

      let currentWaveOrders = rawOrders;
      if (activeWaveOrders.length > 0) {
        const earliestActiveMs = Math.min(
          ...activeWaveOrders.map((o) =>
            o.created_at ? new Date(o.created_at).getTime() : 0,
          ),
        );
        currentWaveOrders = rawOrders.filter((o) => {
          const orderMs = o.created_at ? new Date(o.created_at).getTime() : 0;
          return orderMs >= earliestActiveMs - 10000;
        });
      } else if (rawOrders.length > 0) {
        // When 100% evacuated, show only the most recently completed wave
        const latestCompletedMs = Math.max(
          ...rawOrders.map((o) =>
            o.created_at ? new Date(o.created_at).getTime() : 0,
          ),
        );
        currentWaveOrders = rawOrders.filter((o) => {
          const orderMs = o.created_at ? new Date(o.created_at).getTime() : 0;
          return orderMs >= latestCompletedMs - 10000;
        });
      }

      const locLookup = {};
      (locationsRes.data || []).forEach((loc) => {
        locLookup[loc.location_id] = loc;
      });

      setLocationMap(locLookup);
      setOrders(currentWaveOrders);
    } catch (error) {
      console.error("Error fetching evacuation orders:", error.message);
      setActionError("Failed to load live evacuation orders. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  // Initial load + Supabase Realtime subscription for live multi-teacher sync
  useEffect(() => {
    if (!schoolId) return;

    fetchOrders();

    const handleCustomEvent = () => fetchOrders();
    window.addEventListener("evacuation_generated", handleCustomEvent);

    const channel = supabase
      .channel(`tracker-orders-${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evacuation_orders",
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("evacuation_generated", handleCustomEvent);
      supabase.removeChannel(channel);
    };
  }, [schoolId, fetchOrders]);

  // Update a single asset's evacuation status ("in_progress", "evacuated", or "pending")
  const handleStatusChange = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    setActionError(null);

    const assignedName = nextStatus === "pending" ? null : staffDisplayName;

    try {
      const { error } = await supabase
        .from("evacuation_orders")
        .update({
          status: nextStatus,
          handled_by_name: assignedName,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);

      if (error) throw error;

      // Optimistic local update for instant button feedback
      setOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId
            ? { ...order, status: nextStatus, handled_by_name: assignedName }
            : order,
        ),
      );
    } catch (error) {
      console.error("Error updating evacuation order:", error.message);
      setActionError(
        `Could not update task: ${error.message}. Ensure your account has Supabase UPDATE permissions.`,
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Headmaster / Asset Teacher stand-down: closes remaining unmoved tasks while keeping evacuated records
  const handleEndEvacuation = async () => {
    setIsStandingDown(true);
    setActionError(null);

    try {
      const { error } = await supabase
        .from("evacuation_orders")
        .update({
          status: "cancelled",
          handled_by_name: `Closed by ${staffDisplayName}`,
          updated_at: new Date().toISOString(),
        })
        .eq("school_id", schoolId)
        .in("status", ["pending", "in_progress"]);

      if (error) throw error;

      setConfirmStandDown(false);
      await fetchOrders();
    } catch (error) {
      console.error("Error ending evacuation:", error.message);
      setActionError(`Failed to stand down evacuation: ${error.message}`);
    } finally {
      setIsStandingDown(false);
    }
  };

  // Build unique list of origin rooms for the room filter dropdown
  const originRooms = useMemo(() => {
    const roomCounts = {};
    orders.forEach((o) => {
      const roomName = o.from_location?.location_name || "Unassigned Location";
      roomCounts[roomName] = (roomCounts[roomName] || 0) + 1;
    });
    return Object.entries(roomCounts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [orders]);

  // Apply room and "hide evacuated" filters
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const roomName =
        order.from_location?.location_name || "Unassigned Location";
      if (selectedRoom !== "ALL" && roomName !== selectedRoom) return false;
      if (hideEvacuated && order.status === "evacuated") return false;
      return true;
    });
  }, [orders, selectedRoom, hideEvacuated]);

  if (loading && orders.length === 0) {
    return (
      <div className="mt-8 p-6 text-center text-slate-500 animate-pulse font-medium">
        Loading live evacuation task list...
      </div>
    );
  }

  // Hide completely if no evacuation orders exist yet
  if (orders.length === 0) {
    return null;
  }

  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const evacuatedCount = activeOrders.filter(
    (o) => o.status === "evacuated",
  ).length;
  const inProgressCount = activeOrders.filter(
    (o) => o.status === "in_progress",
  ).length;
  const remainingActiveCount = activeOrders.filter((o) =>
    ["pending", "in_progress"].includes(o.status),
  ).length;
  const progress =
    activeOrders.length > 0
      ? Math.round((evacuatedCount / activeOrders.length) * 100)
      : 100;

  return (
    <div className="mt-8">
      {/* Header & Admin Stand-Down Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl font-bold text-slate-800">
              Live Evacuation Task Board
            </h3>
            {remainingActiveCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                Active Emergency
              </span>
            ) : (
              <Badge variant="success" icon={ShieldCheckIcon}>
                All Clear
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Claim assets as you move them so staff can coordinate across rooms
            in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canCommandEvacuation &&
            remainingActiveCount > 0 &&
            !confirmStandDown && (
              <Button
                variant="danger"
                onClick={() => setConfirmStandDown(true)}
              >
                <ExclamationTriangleIcon className="w-4 h-4" />
                End Evacuation
              </Button>
            )}

          <Button variant="secondary" onClick={fetchOrders} disabled={loading}>
            <ArrowPathIcon
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>

      {/* Two-step confirmation banner for Headmaster / Asset Teacher Stand-Down */}
      {confirmStandDown && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-red-900">
            <span className="font-bold">Confirm Emergency Stand-Down?</span>{" "}
            This will cancel the remaining{" "}
            <span className="font-bold">{remainingActiveCount}</span> unmoved
            tasks and clear the live emergency alert for all staff. Evacuated
            logs will be preserved.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="danger"
              onClick={handleEndEvacuation}
              disabled={isStandingDown}
            >
              {isStandingDown ? "Closing..." : "Confirm Stand Down"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConfirmStandDown(false)}
              disabled={isStandingDown}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {actionError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-sm rounded-lg">
          {actionError}
        </div>
      )}

      <Card className="p-0 overflow-hidden border-t-4 border-red-600 shadow-sm">
        {/* Summary Metrics & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-bold text-slate-800">
                {evacuatedCount} of {activeOrders.length} Assets Evacuated (
                {progress}%)
              </span>
              <span className="text-xs font-medium text-slate-500">
                {inProgressCount} in transit ·{" "}
                {remainingActiveCount - inProgressCount} waiting
              </span>
            </div>
            <div className="bg-slate-200 w-full h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  progress === 100 ? "bg-emerald-500" : "bg-teal-600"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Room Filter & Hide Completed Toggle */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
              <FunnelIcon className="w-4 h-4 text-slate-400" />
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none"
                aria-label="Filter by origin room"
              >
                <option value="ALL">All Origin Rooms ({orders.length})</option>
                {originRooms.map(([room, count]) => (
                  <option key={room} value={room}>
                    {room} ({count})
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={hideEvacuated}
                onChange={(e) => setHideEvacuated(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              Hide Evacuated
            </label>
          </div>
        </div>

        {/* Evacuation Routing Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase w-20">
                  Rank
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                  Asset & Tag ID
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                  Evacuation Route (From ➔ To)
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                  Status & Handler
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-sm text-slate-500"
                  >
                    No evacuation tasks match the current room or status filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isEvacuated = order.status === "evacuated";
                  const isInProgress = order.status === "in_progress";
                  const isCancelled = order.status === "cancelled";
                  const isRowUpdating = updatingId === order.order_id;

                  const origin = getLocationHierarchy(
                    order.from_location,
                    locationMap,
                  );
                  const destination = order.target_location
                    ? getLocationHierarchy(order.target_location, locationMap)
                    : { roomName: "Designated Safe Zone", parentPath: null };

                  return (
                    <tr
                      key={order.order_id}
                      className={`transition-colors ${
                        isEvacuated || isCancelled
                          ? "bg-slate-50/70 opacity-75"
                          : isInProgress
                            ? "bg-amber-50/40"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Col 1: Priority Rank */}
                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-bold ${
                            isEvacuated || isCancelled
                              ? "bg-slate-200 text-slate-500"
                              : order.priority_rank <= 3
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          #{order.priority_rank}
                        </span>
                      </td>

                      {/* Col 2: Asset Name + Asset ID */}
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-900">
                          {order.assets?.asset_name || "Unknown Asset"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            {order.asset_id}
                          </span>
                          {order.assets?.criticality_level >= 4 &&
                            !isEvacuated && (
                              <span className="text-[11px] font-semibold text-red-600">
                                High Criticality
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Col 3: From -> To Spatial Route */}
                      <td className="p-4 align-top">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          {/* Origin Room */}
                          <div className="bg-red-50/70 border border-red-200/80 rounded-lg px-3 py-1.5">
                            {origin.parentPath && (
                              <div className="text-[11px] font-medium text-red-600/80">
                                {origin.parentPath}
                              </div>
                            )}
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <MapPinIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              {origin.roomName}
                            </div>
                          </div>

                          <ArrowRightIcon className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />

                          {/* Destination Safe Zone */}
                          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-1.5">
                            {destination.parentPath && (
                              <div className="text-[11px] font-medium text-emerald-700/80">
                                {destination.parentPath}
                              </div>
                            )}
                            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              {destination.roomName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 4: Status Badge + Staff Attribution */}
                      <td className="p-4 align-top">
                        {isEvacuated ? (
                          <div>
                            <Badge variant="success" icon={CheckCircleIcon}>
                              Evacuated
                            </Badge>
                            {order.handled_by_name && (
                              <p className="text-xs text-slate-500 mt-1">
                                By{" "}
                                <span className="font-medium text-slate-700">
                                  {order.handled_by_name}
                                </span>
                              </p>
                            )}
                          </div>
                        ) : isInProgress ? (
                          <div>
                            <Badge variant="brand" icon={HandRaisedIcon}>
                              In Progress
                            </Badge>
                            {order.handled_by_name && (
                              <p className="text-xs text-amber-800 mt-1">
                                Claimed by{" "}
                                <span className="font-semibold">
                                  {order.handled_by_name}
                                </span>
                              </p>
                            )}
                          </div>
                        ) : isCancelled ? (
                          <div>
                            <Badge variant="warning">Stood Down</Badge>
                            {order.handled_by_name && (
                              <p className="text-xs text-slate-500 mt-1">
                                {order.handled_by_name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="warning" icon={ClockIcon}>
                            Pending Rescue
                          </Badge>
                        )}
                      </td>

                      {/* Col 5: Interactive Task Buttons */}
                      <td className="p-4 align-top text-right">
                        {!isEvacuated && !isCancelled && (
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            {!isInProgress ? (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  handleStatusChange(
                                    order.order_id,
                                    "in_progress",
                                  )
                                }
                                disabled={isRowUpdating}
                              >
                                <HandRaisedIcon className="w-4 h-4" />
                                Moving Now
                              </Button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusChange(order.order_id, "pending")
                                }
                                disabled={isRowUpdating}
                                className="text-xs text-slate-500 hover:text-slate-700 underline px-2 py-1"
                              >
                                Release
                              </button>
                            )}

                            <Button
                              variant="primary"
                              onClick={() =>
                                handleStatusChange(order.order_id, "evacuated")
                              }
                              disabled={isRowUpdating}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              {isRowUpdating ? "Saving..." : "Mark Evacuated"}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
