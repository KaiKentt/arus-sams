import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  fetchRoomLocations,
  generateQrId,
  incrementQrCounter,
  generateAndSaveQR,
  insertLogHistory,
} from "../../hooks/useAssets";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  XMarkIcon,
  QrCodeIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

// ── RFC-4180 Compliant CSV Parser (handles UTF-8 BOM, quoted commas & newlines)
function parseSppaCsv(rawText) {
  const text = rawText.replace(/^\uFEFF/, ""); // Strip UTF-8 BOM from SPPA exports
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      row.push(cell.trim());
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((v) => v !== "")) rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((values, idx) => {
    const obj = { _rowNumber: idx + 2 };
    headers.forEach((h, colIdx) => {
      obj[h] = (values[colIdx] ?? "").trim();
    });
    return obj;
  });
}

// ── Date & Value Normalizers for aset.moe.gov.my Exports ──────────────────────
function parseSppaDate(raw) {
  if (!raw) return null;
  const cleaned = raw.trim();

  // Already YYYY-MM-DD (e.g. Tarikh (Penempatan): "2025-12-05")
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // MM/DD/YYYY HH:MM:SS or DD/MM/YYYY (e.g. Tarikh Diterima: "12/05/2025 02:22:00")
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    let first = parseInt(slashMatch[1], 10);
    let second = parseInt(slashMatch[2], 10);
    const year = slashMatch[3];

    // SPPA exports timestamps in MM/DD/YYYY; swap if second > 12 (DD/MM/YYYY)
    let month = first;
    let day = second;
    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

function parsePrice(raw) {
  if (!raw) return 0;
  const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function mapSppaStatus(rawStatus) {
  const s = (rawStatus || "").toUpperCase();
  if (s.includes("ROSAK")) return "Broken";
  if (s.includes("HILANG")) return "Lost";
  if (s.includes("LUPUS")) return "Disposed";
  if (s.includes("SELENGGARA")) return "Under Maintenance";
  return "Active"; // "SEDANG DIGUNAKAN"
}

function mapAcquisitionMethod(rawMethod) {
  const m = (rawMethod || "").toUpperCase().trim();
  if (m.includes("HADIAH") || m.includes("SUMBANGAN")) return "Donation";
  if (m.includes("PINDAHAN") || m.includes("TERIMAAN")) return "Transfer";
  if (m.includes("SEWA") || m.includes("PAJAK")) return "Lease";
  return "Purchase"; // Maps SPPA "PEROLEHAN" / "BELIAN" -> "Purchase"
}

function extractAssetType(regNo, price) {
  const match = (regNo || "").toUpperCase().match(/\/([HR])\//);
  if (match) return match[1];
  return price >= 2000 ? "H" : "R";
}

function suggestCriticality(category) {
  const c = (category || "").toUpperCase();
  if (c.includes("ICT") || c.includes("KOMPUTER") || c.includes("PERUBATAN")) return 5;
  if (c.includes("BENGKEL") || c.includes("ELEKTRIK") || c.includes("MAKMAL")) return 4;
  if (c.includes("PERABOT") || c.includes("SUKAN")) return 2;
  return 3; // Matches INITIAL_FORM default in AssetRegistration.jsx
}

export default function ImportAssetsModal({ schoolId, onClose, onImportSuccess }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Room & Criticality Mapping, 3: Done
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [existingIds, setExistingIds] = useState(new Set());
  const [schoolCode, setSchoolCode] = useState("");
  const [rooms, setRooms] = useState([]);
  const [locationPaths, setLocationPaths] = useState({});

  // User mapping choices
  const [roomMapping, setRoomMapping] = useState({}); // { "BILIK SAINS": "12" }
  const [categoryCriticality, setCategoryCriticality] = useState({}); // { "PERABOT": 2 }
  const [defaultCspHeight, setDefaultCspHeight] = useState("0");
  const [generateQrOnImport, setGenerateQrOnImport] = useState(true);

  // Progress & status
  const [parseError, setParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [importSummary, setImportSummary] = useState(null);

  // Load school rooms, school_code, and existing asset_ids for duplicate prevention
  useEffect(() => {
    if (!schoolId) return;

    Promise.all([
      fetchRoomLocations(schoolId),
      supabase.from("schools").select("school_code").eq("school_id", schoolId).single(),
      supabase.from("assets").select("asset_id").eq("school_id", schoolId),
    ])
      .then(([locRes, schoolRes, assetsRes]) => {
        setRooms(locRes.rooms || []);
        setLocationPaths(locRes.paths || {});
        if (schoolRes.data?.school_code) setSchoolCode(schoolRes.data.school_code);
        if (assetsRes.data) {
          setExistingIds(new Set(assetsRes.data.map((a) => a.asset_id.toUpperCase())));
        }
      })
      .catch((err) => console.error("Preload failed:", err));
  }, [schoolId]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseSppaCsv(evt.target?.result || "");
        if (parsed.length === 0) {
          setParseError("No data rows found in this CSV file.");
          return;
        }
        if (!("No Siri Pendaftaran" in parsed[0]) || !("Keterangan" in parsed[0])) {
          setParseError(
            'Invalid file format. Please upload an official CSV export from aset.moe.gov.my containing "No Siri Pendaftaran" and "Keterangan" columns.'
          );
          return;
        }

        // Auto-match CSV "Lokasi (Penempatan)" to existing school rooms
        const uniqueCsvRooms = [
          ...new Set(parsed.map((r) => (r["Lokasi (Penempatan)"] || "").trim()).filter(Boolean)),
        ];
        const initialRoomMap = {};
        uniqueCsvRooms.forEach((csvRoom) => {
          const needle = csvRoom.toLowerCase();
          const exact = rooms.find((r) => r.location_name.toLowerCase() === needle);
          const partial =
            exact ||
            rooms.find(
              (r) =>
                r.location_name.toLowerCase().includes(needle) ||
                needle.includes(r.location_name.toLowerCase())
            );
          initialRoomMap[csvRoom] = partial ? String(partial.location_id) : "";
        });

        // Suggest criticality per unique category
        const uniqueCats = [
          ...new Set(parsed.map((r) => (r["Kategori"] || "Uncategorized").trim())),
        ];
        const initialCatCrit = {};
        uniqueCats.forEach((cat) => {
          initialCatCrit[cat] = suggestCriticality(cat);
        });

        setRoomMapping(initialRoomMap);
        setCategoryCriticality(initialCatCrit);
        setRawRows(parsed);
        setStep(2);
      } catch (err) {
        setParseError("Failed to read CSV: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Classify parsed rows into Ready, Duplicate, or Component rows
  const analyzedRows = useMemo(() => {
    return rawRows.map((row) => {
      const regNo = (row["No Siri Pendaftaran"] || "").trim().toUpperCase();
      const compRegNo = (row["No Siri Pendaftaran (Komponen)"] || "").trim();
      const csvRoom = (row["Lokasi (Penempatan)"] || "").trim();
      const mappedLocId = roomMapping[csvRoom] ? parseInt(roomMapping[csvRoom], 10) : null;

      let rowStatus = "ready";
      if (!regNo) rowStatus = "invalid";
      else if (compRegNo) rowStatus = "component";
      else if (existingIds.has(regNo)) rowStatus = "duplicate";

      return {
        raw: row,
        regNo,
        name: (row["Keterangan"] || row["Jenis Aset"] || "Unnamed Asset").trim(),
        category: (row["Kategori"] || "Uncategorized").trim(),
        csvRoom,
        mappedLocId,
        price: parsePrice(row["Harga Perolehan Asal (RM)"]),
        rowStatus,
      };
    });
  }, [rawRows, roomMapping, existingIds]);

  const readyRows = analyzedRows.filter((r) => r.rowStatus === "ready");
  const duplicateCount = analyzedRows.filter((r) => r.rowStatus === "duplicate").length;
  const csvSchoolCode = rawRows[0]?.["Kod Sekolah"] || "";
  const unmappedRoomsCount = Object.values(roomMapping).filter((v) => !v).length;

  const handleRunImport = async () => {
    if (readyRows.length === 0) return;
    setImporting(true);
    setParseError(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const staffId = authData?.user?.id || null;
      const parsedCsp =
        defaultCspHeight !== "" && !isNaN(parseFloat(defaultCspHeight))
          ? parseFloat(defaultCspHeight)
          : null;

      setProgressText(`Inserting ${readyRows.length} assets into database...`);

      const payloads = readyRows.map(({ raw, regNo, name, category, mappedLocId, price }) => {
        const receivedDate =
          parseSppaDate(raw["Tarikh Diterima"]) ||
          parseSppaDate(raw["Tarikh Perolehan"]) ||
          new Date().toISOString().slice(0, 10);

        const rawCatCode = (raw["Kod Kategori"] || "").trim();
        const paddedCatCode = rawCatCode ? rawCatCode.padStart(2, "0") : null;
        const rawSubCatCode = (raw["Kod Sub Kategori"] || "").trim() || null;

        return {
          asset_id: regNo,
          registration_no: regNo,
          asset_name: name,
          asset_description: (raw["Keterangan"] || name).trim(),
          national_code: raw["Kod Nasional"] || null,
          category_code: paddedCatCode,
          category,
          sub_category_code: rawSubCatCode,
          sub_category: raw["Sub Kategori"] || null,
          asset_type: extractAssetType(regNo, price),
          country_of_origin: raw["Buatan"] || null,
          manufacturer_serial: raw["No Casis/Siri Pembuat"] || null,
          acquisition_price: price,
          purchase_price: price,
          acquisition_method: mapAcquisitionMethod(raw["Cara Diperoleh"]),
          acquisition_date: parseSppaDate(raw["Tarikh Perolehan"]),
          received_date: receivedDate,
          official_order_no: raw["No. Pesanan Rasmi Kerajaan/Kontrak"] || null,
          warranty_period: raw["Tempoh Jaminan"] || null,
          supplier_name: raw["Nama Pembekal dan Alamat"] || null,
          location_id: mappedLocId,
          csp_height: parsedCsp,
          placement_date: parseSppaDate(raw["Tarikh (Penempatan)"]),
          responsible_officer: raw["Pegawai (Penempatan)"] || null,
          criticality_level: categoryCriticality[category] ?? 3,
          specifications: raw["Spesifikasi/Catatan"] || null,
          is_existing_asset: true,
          school_id: schoolId,
          staff_id: staffId,
          status: mapSppaStatus(raw["Status (Pemeriksaan)"]),
        };
      });

      const { error: insertError } = await supabase.from("assets").insert(payloads);
      if (insertError) throw insertError;

      // Optional batch QR code generation using your existing useAssets helpers
      let qrGeneratedCount = 0;
      if (generateQrOnImport) {
        for (let i = 0; i < payloads.length; i++) {
          setProgressText(`Generating QR codes (${i + 1} of ${payloads.length})...`);
          try {
            const { qrId, newNumber } = await generateQrId(supabase, schoolId);
            await generateAndSaveQR(supabase, payloads[i].asset_id, qrId);
            await incrementQrCounter(supabase, schoolId, newNumber);
            qrGeneratedCount++;
          } catch (qrErr) {
            console.error(`QR failed for ${payloads[i].asset_id}:`, qrErr.message);
          }
        }
      }

      if (staffId) {
        await insertLogHistory(supabase, {
          assetId: payloads[0].asset_id,
          staffId,
          logDetails: `Bulk imported ${payloads.length} SPPA assets from ${fileName}`,
        }).catch(() => {});
      }

      setImportSummary({
        importedCount: payloads.length,
        skippedCount: duplicateCount,
        qrGeneratedCount,
      });
      setStep(3);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setParseError("Import failed: " + err.message);
    } finally {
      setImporting(false);
      setProgressText("");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={!importing ? onClose : undefined}
    >
      <div
        className="w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Import Assets from SPPA (aset.moe.gov.my)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bulk register existing KEW.PA assets and map their classroom locations for flood routing.
            </p>
          </div>
          {!importing && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200/70 text-slate-500"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {parseError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
              {parseError}
            </div>
          )}

          {/* STEP 1: FILE UPLOAD */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/70 hover:bg-teal-50/30 rounded-2xl p-12 cursor-pointer transition-all text-center">
                <ArrowUpTrayIcon className="w-12 h-12 text-teal-600 mb-3" />
                <span className="text-base font-bold text-slate-800">
                  Click to select your SPPA CSV export
                </span>
                <span className="text-xs text-slate-500 mt-1 max-w-md">
                  Supports standard UTF-8 CSV exports from <span className="font-mono">aset.moe.gov.my</span> (KEW.PA-3 / KEW.PA-4).
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {rooms.length === 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Tip:</span> You haven't added any rooms in{" "}
                    <span className="font-bold">Location Manager</span> yet. You can still import assets now, or create your school's blocks and rooms first so assets map straight to their flood elevation zones.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ROOM MAPPING & CRITICALITY CONFIGURATION */}
          {step === 2 && (
            <div className="space-y-6">
              {/* File Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <DocumentTextIcon className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{fileName}</p>
                    <p className="text-xs text-slate-500">
                      {rawRows.length} total rows ·{" "}
                      <span className="font-bold text-teal-700">{readyRows.length} new ready</span>
                      {duplicateCount > 0 && ` · ${duplicateCount} already registered (will skip)`}
                    </p>
                  </div>
                </div>

                {csvSchoolCode && schoolCode && csvSchoolCode !== schoolCode && (
                  <Badge variant="warning">
                    CSV School: {csvSchoolCode} (Importing to {schoolCode})
                  </Badge>
                )}
              </div>

              {/* 2A. Room Location Mapping */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPinIcon className="w-4 h-4 text-teal-600" />
                    1. Map SPPA Locations to School Rooms
                  </h3>
                  {unmappedRoomsCount > 0 && (
                    <span className="text-xs font-bold text-amber-700">
                      {unmappedRoomsCount} room(s) unmapped
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {Object.keys(roomMapping).map((csvRoom) => (
                    <div
                      key={csvRoom}
                      className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                          {csvRoom}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">
                          ({analyzedRows.filter((r) => r.csvRoom === csvRoom && r.rowStatus === "ready").length} assets)
                        </span>
                      </div>

                      <select
                        value={roomMapping[csvRoom]}
                        onChange={(e) =>
                          setRoomMapping((prev) => ({ ...prev, [csvRoom]: e.target.value }))
                        }
                        className={`text-xs font-medium rounded-lg px-3 py-2 border sm:w-80 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          roomMapping[csvRoom]
                            ? "border-teal-300 bg-teal-50/40 text-slate-800"
                            : "border-amber-300 bg-amber-50/50 text-amber-900"
                        }`}
                      >
                        <option value="">-- Leave Unassigned --</option>
                        {rooms.map((r) => (
                          <option key={r.location_id} value={r.location_id}>
                            {locationPaths[r.location_id] || r.location_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2B. Flood Prioritization Defaults */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  2. Flood Criticality by Category (1 = Low, 5 = Highest Priority)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.keys(categoryCriticality).map((cat) => (
                    <div
                      key={cat}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-bold text-slate-700 line-clamp-2">{cat}</span>
                      <select
                        value={categoryCriticality[cat]}
                        onChange={(e) =>
                          setCategoryCriticality((prev) => ({
                            ...prev,
                            [cat]: parseInt(e.target.value, 10),
                          }))
                        }
                        className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shrink-0"
                      >
                        <option value={5}>5 — Critical</option>
                        <option value={4}>4 — High</option>
                        <option value={3}>3 — Standard</option>
                        <option value={2}>2 — Low</option>
                        <option value={1}>1 — Minimal</option>
                      </select>
                    </div>
                  ))}
                </div>

                {/* Floor Height & QR Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Default Floor Clearance (cm)</p>
                      <p className="text-[11px] text-slate-500">0cm = sitting directly on the floor</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={defaultCspHeight}
                      onChange={(e) => setDefaultCspHeight(e.target.value)}
                      className="w-20 px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-right"
                    />
                  </div>

                  <label className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generateQrOnImport}
                      onChange={(e) => setGenerateQrOnImport(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-teal-900 flex items-center gap-1">
                        <QrCodeIcon className="w-4 h-4 text-teal-600" />
                        Auto-Generate QR Codes
                      </p>
                      <p className="text-[11px] text-teal-700">
                        Assigns scannable QR labels right after import
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2C. Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-600">
                  Preview ({analyzedRows.length} rows)
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="min-w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50/70 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-bold text-slate-500">Registration No.</th>
                        <th className="px-3 py-2 font-bold text-slate-500">Asset Name</th>
                        <th className="px-3 py-2 font-bold text-slate-500">Mapped Room</th>
                        <th className="px-3 py-2 font-bold text-slate-500">Price (RM)</th>
                        <th className="px-3 py-2 font-bold text-slate-500">Import Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {analyzedRows.map((r, i) => (
                        <tr key={i} className={r.rowStatus !== "ready" ? "opacity-50 bg-slate-50" : ""}>
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">{r.regNo}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {r.mappedLocId
                              ? locationPaths[r.mappedLocId]
                              : `Unassigned (${r.csvRoom || "None"})`}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{r.price.toLocaleString()}</td>
                          <td className="px-3 py-2">
                            {r.rowStatus === "ready" ? (
                              <Badge variant="success">Ready</Badge>
                            ) : r.rowStatus === "duplicate" ? (
                              <Badge variant="warning">Already Exists</Badge>
                            ) : (
                              <Badge variant="neutral">Skipped</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORT COMPLETE */}
          {step === 3 && importSummary && (
            <div className="py-10 text-center space-y-4">
              <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-800">SPPA Import Complete</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Successfully imported <span className="font-bold text-slate-900">{importSummary.importedCount}</span> assets
                {importSummary.qrGeneratedCount > 0 && (
                  <> and generated <span className="font-bold text-teal-700">{importSummary.qrGeneratedCount}</span> QR labels</>
                )}
                {importSummary.skippedCount > 0 && (
                  <> ({importSummary.skippedCount} duplicate rows skipped)</>
                )}
                .
              </p>
              <div className="pt-4">
                <Button onClick={onClose} variant="primary" className="px-8">
                  View Asset Master List
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step !== 3 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            {importing ? (
              <div className="flex items-center gap-3 text-sm font-bold text-teal-700">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                {progressText}
              </div>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={step === 2 ? () => setStep(1) : onClose}
                >
                  {step === 2 ? "Choose Different File" : "Cancel"}
                </Button>

                {step === 2 && (
                  <Button
                    variant="primary"
                    onClick={handleRunImport}
                    disabled={readyRows.length === 0}
                  >
                    Import {readyRows.length} Asset{readyRows.length === 1 ? "" : "s"}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}