import React, { useState, useEffect, useMemo, useCallback } from "react";
import QRCode from "qrcode";
import { 
  QrCodeIcon, 
  ArrowDownTrayIcon, 
  PrinterIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { supabase } from "../../supabaseClient";
import AddAssetModal from "./AddAssetModal";
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
          sortDir === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
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

export default function AssetMasterList({ schoolId, userRole }) {
  const [assets, setAssets] = useState([]);
  const [locationPaths, setLocationPaths] = useState({});
  const [lastUsageMap, setLastUsageMap] = useState({});
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [qrModalAsset, setQrModalAsset] = useState(null);
  const [qrToast, setQrToast] = useState(null);
  const [generatingQrFor, setGeneratingQrFor] = useState(null);

  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const canEdit = userRole === "headmaster" || userRole === "asset_teacher";

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedAssets = useMemo(() => {
    if (!sortField) return assets;
    return [...assets].sort((a, b) => {
      const va = (a[sortField] || "").toString().toLowerCase();
      const vb = (b[sortField] || "").toString().toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [assets, sortField, sortDir]);

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

  useEffect(() => {
    if (schoolId) fetchData();
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

  const handleDeleteAsset = async (assetId, assetName) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete: ${assetName}?`,
      )
    )
      return;
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("asset_id", assetId);
    if (error) {
      alert("Failed to delete asset: " + error.message);
    } else {
      fetchData();
    }
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
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                Register New Asset
              </Button>
            )}
          </div>
        </div>
      </Card>

      <AssetAnalytics assets={assets} title="School Asset Health Overview" />

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
                    No assets found for this school.
                  </td>
                </tr>
              ) : (
                sortedAssets.map((asset) => {
                  const usage = lastUsageMap[asset.asset_id];
                  
                  // Status to Badge Variant mapping
                  let statusVariant = "neutral";
                  if (asset.status === "Active") statusVariant = "active";
                  else if (asset.status === "Under Maintenance") statusVariant = "warning";
                  else if (asset.status === "Lost" || asset.status === "Disposed") statusVariant = "danger";

                  return (
                    <tr key={asset.asset_id} className="hover:bg-slate-50 transition-colors">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                        {asset.asset_name}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge variant="neutral">
                          {asset.category || "Uncategorized"}
                        </Badge>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {locationPaths[asset.location_id] || "Unassigned"}
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
                          <Badge variant={usage === "In Use" ? "brand" : "neutral"}>
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
                                onClick={() => handleGenerateQR(asset.asset_id)}
                                disabled={generatingQrFor === asset.asset_id}
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
                            <button
                              onClick={() =>
                                handleDeleteAsset(
                                  asset.asset_id,
                                  asset.asset_name,
                                )
                              }
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
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

      {/* Modals */}
      {isAddModalOpen && (
        <AddAssetModal
          schoolId={schoolId}
          onClose={() => setIsAddModalOpen(false)}
          refreshData={fetchData}
        />
      )}

      {editingAsset && (
        <EditAssetModal
          schoolId={schoolId}
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          refreshData={fetchData}
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
