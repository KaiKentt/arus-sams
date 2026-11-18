import { useState, useEffect, useMemo, useCallback } from "react";
import QRCode from "qrcode";
import {
  QrCodeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PrinterIcon,
  PlusIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import ImportAssetsModal from "./ImportAssetsModal";
import { supabase } from "../../supabaseClient";
import EditAssetModal from "./EditAssetModal";
import AssetAnalytics from "./AssetAnalytics";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  generateQrId,
  generateAndSaveQR,
  incrementQrCounter,
} from "../../hooks/useAssets";

// ── Sort button ───────────────────────────────────────────────────────────────

function SortButton({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 group"
    >
      <span
        className={`text-xs font-bold uppercase ${active ? "text-teal-600" : "text-slate-500"}`}
      >
        {label}
      </span>
      <span
        className={`w-3 h-3 ${active ? "text-teal-600" : "text-slate-300 group-hover:text-slate-400"}`}
      >
        {active ? (
          sortDir === "asc" ? (
            <ChevronUpIcon />
          ) : (
            <ChevronDownIcon />
          )
        ) : (
          <ArrowsUpDownIcon />
        )}
      </span>
    </button>
  );
}

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QrModal({ asset, locationPath, schoolName, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (!asset?.qr_code_id) return;
    QRCode.toDataURL(asset.qr_code_id, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then((url) => setQrDataUrl(url));
  }, [asset?.qr_code_id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${asset.qr_code_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Label — ${asset.qr_code_id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: white;
          }
          .label {
            width: 6cm;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .app-name { font-size: 8px; color: #0d9488; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px; }
          .qr-img { width: 180px; height: 180px; display: block; margin: 0 auto 8px; }
          .qr-id { font-family: monospace; font-size: 13px; font-weight: bold; color: #000; margin-bottom: 3px; }
          .reg-no { font-size: 8px; color: #666; margin-bottom: 6px; word-break: break-all; }
          .asset-name { font-size: 10px; font-weight: bold; color: #111; margin-bottom: 2px; }
          .label-location { font-size: 8px; color: #888; margin-bottom: 2px; }
          .label-school { font-size: 8px; color: #888; }
          @media print { body { background: white; } .label { border: 1px solid #ccc; } }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="app-name">ARUS-SAMS</div>
          <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
          <div class="qr-id">${asset.qr_code_id}</div>
          <div class="reg-no">${asset.registration_no || "No Registration No."}</div>
          <div class="asset-name">${asset.asset_name}</div>
          <div class="label-location">${locationPath}</div>
          <div class="label-school">${schoolName}</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800">Asset QR Code</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-center">
          {/* QR image */}
          <div className="flex items-center justify-center mb-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${asset.qr_code_id}`}
                className="w-56 h-56 border border-slate-100 rounded-xl"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* IDs */}
          <p className="font-mono font-bold text-teal-600 text-lg tracking-wide mb-1">
            {asset.qr_code_id}
          </p>
          {asset.registration_no && (
            <p className="text-xs text-slate-400 break-all mb-3">
              {asset.registration_no}
            </p>
          )}

          {/* Asset details */}
          <div className="text-left bg-slate-50 rounded-xl p-3 mb-4 space-y-1">
            <p className="text-sm font-bold text-slate-800">
              {asset.asset_name}
            </p>
            {asset.category && (
              <p className="text-xs text-slate-500">{asset.category}</p>
            )}
            {locationPath && (
              <p className="text-xs text-slate-400">{locationPath}</p>
            )}
            {schoolName && (
              <p className="text-xs text-slate-400">{schoolName}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <Button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex-1 py-2.5 text-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download PNG
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!qrDataUrl}
              variant="secondary"
              className="flex-1 py-2.5 text-sm"
            >
              <PrinterIcon className="w-4 h-4" />
              Print Label
            </Button>
          </div>

          <Button
            onClick={onClose}
            variant="secondary"
            className="w-full py-2.5 text-sm"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssetMasterList({ schoolId, userRole, navigate }) {
  const [assets, setAssets] = useState([]);
  const [locationPaths, setLocationPaths] = useState({});
  const [lastUsageMap, setLastUsageMap] = useState({});
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);

  // New State for Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const [editingAsset, setEditingAsset] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [qrModalAsset, setQrModalAsset] = useState(null);
  const [qrToast, setQrToast] = useState(null);
  const [generatingQrFor, setGeneratingQrFor] = useState(null);

  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const canEdit = userRole === "headmaster" || userRole === "asset_teacher";

  // Dynamically generate tabs based on user role
  const TABS = useMemo(() => {
    const base = [
      "All",
      "Operational",
      "Evacuated",
      "Request for Audit",
      "In Repair",
      "Written Off",
    ];
    if (userRole === "headmaster") {
      // Insert the special Disposal Requests tab at index 4
      base.splice(4, 0, "Disposal Requests");
    }
    return base;
  }, [userRole]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // 1. First layer of sorting: Text Search and Tabs
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Text Search
      const matchesSearch =
        (asset.asset_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (asset.qr_code_id || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status Tab Filter
      if (activeTab === "All") return true;
      if (activeTab === "Operational" && asset.status === "Active") return true;
      if (activeTab === "Evacuated" && Boolean(asset.home_location_id))
        return true;
      if (
        activeTab === "Request for Audit" &&
        asset.status === "Audit Requested"
      )
        return true;
      if (
        activeTab === "Disposal Requests" &&
        asset.status === "Disposal Requested"
      )
        return true;
      if (
        activeTab === "In Repair" &&
        (asset.status === "Under Maintenance" || asset.status === "Broken")
      )
        return true;
      if (
        activeTab === "Written Off" &&
        (asset.status === "Lost" || asset.status === "Disposed")
      )
        return true;

      return false;
    });
  }, [assets, searchTerm, activeTab]);

  // 2. Second layer: Sorting the filtered results
  const sortedAssets = useMemo(() => {
    if (!sortField) return filteredAssets;
    return [...filteredAssets].sort((a, b) => {
      const va = (a[sortField] || "").toString().toLowerCase();
      const vb = (b[sortField] || "").toString().toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortField, sortDir]);

  const handleGenerateQR = async (assetId) => {
    setGeneratingQrFor(assetId);
    try {
      const { qrId, newNumber } = await generateQrId(supabase, schoolId);
      await generateAndSaveQR(supabase, assetId, qrId);
      await incrementQrCounter(supabase, schoolId, newNumber);
      setQrToast(`QR generated: ${qrId}`);
      setTimeout(() => setQrToast(null), 4000);
      fetchData();
    } catch (err) {
      alert("QR generation failed: " + err.message);
    } finally {
      setGeneratingQrFor(null);
    }
  };

  const handleBulkPrint = async () => {
    const printable = assets.filter((a) => a.qr_code_id);
    if (printable.length === 0) {
      alert("No assets with QR codes found.");
      return;
    }

    const qrUrls = await Promise.all(
      printable.map(async (a) => {
        const url = await QRCode.toDataURL(a.qr_code_id, {
          width: 300,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });
        return { asset: a, url };
      }),
    );

    const labelsHtml = qrUrls
      .map(
        ({ asset: a, url }) => `
      <div class="label">
        <div class="app-name">ARUS-SAMS</div>
        <img class="qr-img" src="${url}" />
        <div class="qr-id">${a.qr_code_id}</div>
        <div class="reg-no">${a.registration_no || ""}</div>
        <div class="asset-name">${a.asset_name}</div>
        <div class="school">${schoolName}</div>
      </div>
    `,
      )
      .join("");

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk QR Labels — ${schoolName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: white; padding: 10mm; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; }
          .label {
            border: 1px dashed #ccc;
            border-radius: 4px;
            padding: 6px;
            text-align: center;
            page-break-inside: avoid;
          }
          .app-name { font-size: 7px; color: #0d9488; font-weight: bold; margin-bottom: 4px; letter-spacing: 1px; }
          .qr-img { width: 100px; height: 100px; display: block; margin: 0 auto 4px; }
          .qr-id { font-family: monospace; font-size: 9px; font-weight: bold; margin-bottom: 2px; }
          .reg-no { font-size: 6px; color: #666; margin-bottom: 3px; word-break: break-all; }
          .asset-name { font-size: 8px; font-weight: bold; margin-bottom: 1px; }
          .school { font-size: 6px; color: #888; }
          @media print { body { padding: 5mm; } }
        </style>
      </head>
      <body>
        <div class="grid">${labelsHtml}</div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRequestDisposal = async (assetId, assetName) => {
    const confirmDisposal = window.confirm(
      `Are you sure you want to request disposal for ${assetName}?`,
    );
    if (!confirmDisposal) return;

    try {
      const { error } = await supabase
        .from("assets")
        .update({ status: "Disposal Requested" })
        .eq("asset_id", assetId);

      if (error) throw error;

      alert(`Disposal requested for ${assetName}.`);
      fetchData();
    } catch (err) {
      alert("Failed to request disposal: " + err.message);
    }
  };

  const handleApproveDisposal = async (assetId, assetName) => {
    const confirm = window.confirm(
      `Approve disposal for ${assetName}? This will permanently mark it as Disposed.`,
    );
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("assets")
        .update({ status: "Disposed" })
        .eq("asset_id", assetId);

      if (error) throw error;

      alert(`Disposal approved for ${assetName}.`);
      fetchData();
    } catch (err) {
      alert("Failed to approve disposal: " + err.message);
    }
  };

  const handleRejectDisposal = async (assetId, assetName) => {
    const confirm = window.confirm(
      `Reject disposal request for ${assetName}? This will return it to Active status.`,
    );
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("assets")
        .update({ status: "Active" })
        .eq("asset_id", assetId);

      if (error) throw error;

      alert(`Disposal rejected for ${assetName}.`);
      fetchData();
    } catch (err) {
      alert("Failed to reject disposal: " + err.message);
    }
  };

  const handleReturnToHome = async (asset) => {
    const homePath =
      locationPaths[asset.home_location_id] || "its original room";
    const confirmed = window.confirm(
      `Confirm that ${asset.asset_name} has been physically returned to ${homePath}?`,
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("assets")
        .update({
          location_id: asset.home_location_id,
          home_location_id: null,
        })
        .eq("asset_id", asset.asset_id);

      if (error) throw error;

      setQrToast(`${asset.asset_name} returned to ${homePath}`);
      setTimeout(() => setQrToast(null), 4000);
      fetchData();
    } catch (err) {
      alert("Failed to restore asset location: " + err.message);
    }
  };

  useEffect(() => {
    if (!schoolId) return;
    fetchData();

    const channel = supabase
      .channel(`assets-master-${schoolId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assets",
          filter: `school_id=eq.${schoolId}`,
        },
        () => {
          fetchAssets();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAssets(), fetchLocationPaths(), fetchSchoolName()]);
    setLoading(false);
  };

  const fetchSchoolName = async () => {
    const { data } = await supabase
      .from("schools")
      .select("school_name")
      .eq("school_id", schoolId)
      .single();
    if (data) setSchoolName(data.school_name || "");
  };

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssets(data);
      fetchLastUsageStatus(data.map((a) => a.asset_id));
    }
  };

  const fetchLastUsageStatus = async (assetIds) => {
    if (!assetIds.length) return;
    const { data } = await supabase
      .from("asset_inspection")
      .select("asset_id, usage_status, verified_at")
      .in("asset_id", assetIds)
      .order("verified_at", { ascending: false });

    if (!data) return;
    const map = {};
    data.forEach((row) => {
      if (!map[row.asset_id]) map[row.asset_id] = row.usage_status;
    });
    setLastUsageMap(map);
  };

  const fetchLocationPaths = async () => {
    const { data } = await supabase
      .from("locations")
      .select("location_id, location_name, parent_location_id")
      .eq("school_id", schoolId);

    if (!data) return;
    const map = {};
    data.forEach((loc) => {
      map[loc.location_id] = loc;
    });
    const paths = {};
    data.forEach((loc) => {
      const parts = [];
      let current = loc;
      while (current) {
        parts.unshift(current.location_name);
        current = current.parent_location_id
          ? map[current.parent_location_id]
          : null;
      }
      paths[loc.location_id] = parts.join(" › ");
    });
    setLocationPaths(paths);
  };

  const closeQrModal = useCallback(() => setQrModalAsset(null), []);

  if (loading) {
    return (
      <div className="text-slate-500 font-bold p-8">Loading master list...</div>
    );
  }

  const colSpan = canEdit ? 7 : 6;
  const hasQrAssets = assets.some((a) => a.qr_code_id);

  return (
    <div className="fade-in space-y-6 relative">
      {/* Toast */}
      {qrToast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 bg-teal-600 text-white text-sm font-bold rounded-xl shadow-lg animate-pulse flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5" />
          {qrToast}
        </div>
      )}

      {/* Header bar */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              Asset Master List
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {canEdit
                ? "Manage and track all physical assets registered to this school."
                : "View all physical assets registered to this school."}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {hasQrAssets && (
              <Button
                onClick={handleBulkPrint}
                variant="secondary"
                className="px-4 py-2.5 text-sm"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Print All QR</span>
              </Button>
            )}
            {canEdit && (
           <>
             <Button
               onClick={() => setShowImportModal(true)}
               variant="secondary"
               className="px-4 py-2.5 text-sm"
             >
               <ArrowUpTrayIcon className="w-4 h-4" />
               <span>Import SPPA CSV</span>
             </Button>
             <Button
               onClick={() => navigate("asset-registration")}
               className="px-4 py-2.5 text-sm"
             >
               <PlusIcon className="w-4 h-4" />
               Register New Asset
             </Button>
           </>
         )}
          </div>
        </div>
      </Card>

      <AssetAnalytics assets={assets} title="School Asset Health Overview" />

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or QR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <SortButton
                    label="Tag ID (QR)"
                    field="qr_code_id"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-4 text-left">
                  <SortButton
                    label="Asset Name"
                    field="asset_name"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Usage
                </th>
                {canEdit && (
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sortedAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No assets match your search or filter.
                  </td>
                </tr>
              ) : (
                sortedAssets.map((asset) => {
                  const usage = lastUsageMap[asset.asset_id];

                  // Status to Badge Variant mapping
                  let statusVariant = "neutral";
                  if (asset.status === "Active") statusVariant = "success";
                  else if (
                    asset.status === "Audit Requested" ||
                    asset.status === "Disposal Requested"
                  )
                    statusVariant = "brand";
                  else if (
                    asset.status === "Under Maintenance" ||
                    asset.status === "Broken"
                  )
                    statusVariant = "warning";
                  else if (
                    asset.status === "Lost" ||
                    asset.status === "Disposed"
                  )
                    statusVariant = "danger";

                  return (
                    <tr
                      key={asset.asset_id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* QR ID — clickable to open modal */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {asset.qr_code_id ? (
                          <button
                            onClick={() => setQrModalAsset(asset)}
                            className="font-mono font-bold text-teal-600 hover:text-teal-700 transition-colors"
                          >
                            {asset.qr_code_id}
                          </button>
                        ) : (
                          <Badge variant="warning">No QR</Badge>
                        )}
                      </td>

                      {/* Asset Name */}
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 max-w-[200px] leading-snug">
                        {asset.asset_name}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-sm max-w-[220px]">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-normal leading-snug">
                          {asset.category || "Uncategorized"}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {asset.home_location_id ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-amber-900">
                                {locationPaths[asset.location_id] ||
                                  "Safe Zone"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                                <ShieldCheckIcon className="w-3 h-3" />
                                Temp Safe Zone
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              Home:{" "}
                              <span className="font-medium">
                                {locationPaths[asset.home_location_id] ||
                                  "Original Room"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          locationPaths[asset.location_id] || "Unassigned"
                        )}
                      </td>

                      {/* Lifecycle Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge variant={statusVariant}>
                          {asset.status || "Unknown"}
                        </Badge>
                      </td>

                      {/* Usage Status (from last audit) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {usage ? (
                          <Badge
                            variant={usage === "In Use" ? "success" : "neutral"}
                          >
                            {usage}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Not audited
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Headmaster Disposal Approval Workflow */}
                            {activeTab === "Disposal Requests" &&
                            userRole === "headmaster" ? (
                              <>
                                <button
                                  onClick={() =>
                                    handleApproveDisposal(
                                      asset.asset_id,
                                      asset.asset_name,
                                    )
                                  }
                                  className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                  title="Approve Disposal"
                                >
                                  <CheckCircleIcon className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleRejectDisposal(
                                      asset.asset_id,
                                      asset.asset_name,
                                    )
                                  }
                                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                  title="Reject Disposal"
                                >
                                  <XMarkIcon className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Return evacuated asset back to its home room */}
                                {asset.home_location_id && (
                                  <button
                                    onClick={() => handleReturnToHome(asset)}
                                    className="p-2 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                                    title="Return Asset to Home Room"
                                  >
                                    <ArrowUturnLeftIcon className="w-5 h-5" />
                                  </button>
                                )}

                                {/* Existing Actions: QR, Edit, Request Disposal */}
                                {asset.qr_code_id ? (
                                  <button
                                    onClick={() => setQrModalAsset(asset)}
                                    title="View / Print QR Code"
                                    className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors"
                                  >
                                    <QrCodeIcon className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <Button
                                    onClick={() =>
                                      handleGenerateQR(asset.asset_id)
                                    }
                                    disabled={
                                      generatingQrFor === asset.asset_id
                                    }
                                    variant="secondary"
                                    className="px-3 py-1.5 text-xs h-8"
                                  >
                                    {generatingQrFor === asset.asset_id
                                      ? "..."
                                      : "Generate QR"}
                                  </Button>
                                )}

                                <button
                                  onClick={() => setEditingAsset(asset)}
                                  className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                                  title="Edit"
                                >
                                  <PencilSquareIcon className="w-5 h-5" />
                                </button>

                                {asset.status !== "Disposal Requested" &&
                                  asset.status !== "Disposed" &&
                                  asset.status !== "Lost" && (
                                    <button
                                      onClick={() =>
                                        handleRequestDisposal(
                                          asset.asset_id,
                                          asset.asset_name,
                                        )
                                      }
                                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                      title="Request Disposal"
                                    >
                                      <TrashIcon className="w-5 h-5" />
                                    </button>
                                  )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editingAsset && (
        <EditAssetModal
          schoolId={schoolId}
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          refreshData={fetchData}
        />
      )}

      {showImportModal && (
     <ImportAssetsModal
       schoolId={schoolId}
       onClose={() => setShowImportModal(false)}
       onImportSuccess={fetchData}
     />
   )}

      {qrModalAsset && (
        <QrModal
          asset={qrModalAsset}
          locationPath={locationPaths[qrModalAsset.location_id] || "Unassigned"}
          schoolName={schoolName}
          onClose={closeQrModal}
        />
      )}
    </div>
  );
}
