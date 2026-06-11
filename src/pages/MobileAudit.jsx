import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const CONDITIONS = [
  { value: 'Good',                     label: 'Good',                     desc: 'Baik',                  color: 'border-green-400  bg-green-50  text-green-700',  dot: 'bg-green-500'  },
  { value: 'Needs Maintenance',        label: 'Needs Maintenance',        desc: 'Perlu Penyelenggaraan', color: 'border-yellow-400 bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' },
  { value: 'Damaged',                  label: 'Damaged',                  desc: 'Rosak',                 color: 'border-red-400    bg-red-50    text-red-700',    dot: 'bg-red-500'    },
  { value: 'Missing',                  label: 'Missing',                  desc: 'Hilang',                color: 'border-orange-400 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  { value: 'Recommended for Disposal', label: 'For Disposal',             desc: 'Dicadang Pelupusan',    color: 'border-slate-400  bg-slate-50  text-slate-600',  dot: 'bg-slate-400'  },
]

const USAGE_OPTIONS = [
  { value: 'In Use',     label: 'In Use',     desc: 'Sedang Digunakan', icon: '🟢' },
  { value: 'Not In Use', label: 'Not In Use', desc: 'Tidak Digunakan',  icon: '⚪' },
]

const CONDITION_BADGE = {
  'Good':                     'bg-green-100 text-green-700',
  'Needs Maintenance':        'bg-yellow-100 text-yellow-700',
  'Damaged':                  'bg-red-100 text-red-700',
  'Missing':                  'bg-orange-100 text-orange-700',
  'Recommended for Disposal': 'bg-slate-100 text-slate-600',
}

function buildLocationPath(locationId, allLocations) {
  if (!locationId || !allLocations.length) return 'Unassigned'
  const map = {}
  allLocations.forEach(l => { map[l.location_id] = l })
  const parts = []
  let cur = map[locationId]
  while (cur) {
    parts.unshift(cur.location_name)
    cur = cur.parent_location_id ? map[cur.parent_location_id] : null
  }
  return parts.join(' › ') || 'Unassigned'
}

// Corner bracket SVG overlay for the scanner
function ScannerOverlay({ scanning }) {
  const bracketColor = scanning ? '#2dd4bf' : '#64748b'
  const size = 56
  const stroke = 4
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: 220, height: 220 }}>
        {/* Corner brackets */}
        {[
          { top: 0, left: 0, rotate: 0 },
          { top: 0, right: 0, rotate: 90 },
          { bottom: 0, right: 0, rotate: 180 },
          { bottom: 0, left: 0, rotate: 270 },
        ].map((pos, i) => (
          <svg key={i} width={size} height={size} style={{ position: 'absolute', ...pos, transform: `rotate(${pos.rotate}deg)` }}>
            <path d={`M${stroke / 2} ${size} L${stroke / 2} ${stroke / 2} L${size} ${stroke / 2}`}
              fill="none" stroke={bracketColor} strokeWidth={stroke} strokeLinecap="round" />
          </svg>
        ))}
        {/* Scan line */}
        {scanning && (
          <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent"
            style={{ animation: 'scanline 2s ease-in-out infinite', top: '50%' }} />
        )}
      </div>
    </div>
  )
}

export default function MobileAudit({ user }) {
  const [inputTab, setInputTab]       = useState('camera')
  const [manualInput, setManualInput] = useState('')

  const [cameraActive, setCameraActive]     = useState(false)
  const [cameraError, setCameraError]       = useState(null)
  const [cameraScanning, setCameraScanning] = useState(false)
  const scannerRef = useRef(null)

  const [uploadError, setUploadError]     = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  const [asset, setAsset]               = useState(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError]     = useState(null)
  const [locationPath, setLocationPath] = useState('')

  const [usageStatus, setUsageStatus]             = useState('')
  const [physicalCondition, setPhysicalCondition] = useState('')
  const [remarks, setRemarks]                     = useState('')
  const [followUp, setFollowUp]                   = useState('')
  const [photoFile, setPhotoFile]                 = useState(null)
  const [photoPreview, setPhotoPreview]           = useState(null)

  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted]     = useState(null)

  const [recentAudits, setRecentAudits] = useState([])

  // ── Camera ────────────────────────────────────────────────────────────────

  const stopCamera = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setCameraActive(false)
    setCameraScanning(false)
  }

  const startCamera = async () => {
    setCameraError(null)
    setCameraActive(true)
    setCameraScanning(false)
    await new Promise(r => setTimeout(r, 200))
    const el = document.getElementById('qr-reader')
    if (!el) { setCameraError('Camera container not ready.'); setCameraActive(false); return }
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const qr = new Html5Qrcode('qr-reader')
      scannerRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          await stopCamera()
          lookupAsset(decoded.trim().toUpperCase())
        },
        () => {}
      )
      setCameraScanning(true)
    } catch (err) {
      const msg = (err?.message || '').toLowerCase()
      if (msg.includes('notallowed') || msg.includes('permission') || msg.includes('denied')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings, then tap Try Again.')
      } else if (msg.includes('notfound') || msg.includes('no camera')) {
        setCameraError('No camera detected. Use the Upload or Type tab instead.')
      } else {
        setCameraError('Could not start camera. ' + (err?.message || ''))
      }
      setCameraActive(false)
      if (scannerRef.current) { try { scannerRef.current.clear() } catch {}; scannerRef.current = null }
    }
  }

  useEffect(() => {
    if (inputTab !== 'camera' || asset) stopCamera()
   
  }, [inputTab, asset])

  useEffect(() => { return () => { stopCamera() } }, [])  

  // ── Asset lookup ──────────────────────────────────────────────────────────

  const lookupAsset = async (qrValue) => {
    if (!qrValue) return
    setAssetLoading(true)
    setAssetError(null)
    try {
      const { data: found, error } = await supabase
        .from('assets')
        .select('asset_id, asset_name, registration_no, qr_code_id, category, status, csp_height, location_id')
        .eq('qr_code_id', qrValue)
        .single()
      if (error || !found) {
        setAssetError(`No asset found with QR ID "${qrValue}". Check the ID or register the asset first.`)
        setAssetLoading(false)
        return
      }
      const { data: allLocs } = await supabase.from('locations').select('location_id, location_name, parent_location_id')
      setLocationPath(buildLocationPath(found.location_id, allLocs || []))
      setAsset(found)
    } catch (err) {
      setAssetError('Lookup error: ' + err.message)
    } finally {
      setAssetLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    setUploadLoading(true)
    setUploadError(null)
    try {
      let el = document.getElementById('qr-file-hidden')
      if (!el) {
        el = document.createElement('div')
        el.id = 'qr-file-hidden'
        el.style.display = 'none'
        document.body.appendChild(el)
      }
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-file-hidden')
      const decoded = await scanner.scanFile(file, false)
      try { scanner.clear() } catch {}
      lookupAsset(decoded.trim().toUpperCase())
    } catch {
      setUploadError('No QR code detected in this image. Try a clearer photo or switch to the Type tab.')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleReset = async () => {
    await stopCamera()
    setAsset(null); setAssetError(null); setLocationPath('')
    setUsageStatus(''); setPhysicalCondition(''); setRemarks(''); setFollowUp('')
    setPhotoFile(null); setPhotoPreview(null)
    setSubmitError(null); setSubmitted(null)
    setManualInput(''); setCameraError(null); setUploadError(null)
    setInputTab('camera')
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!usageStatus || !physicalCondition) {
      setSubmitError('Please select both Usage Status and Physical Condition.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const now = new Date()
      const inspectionDate = now.toISOString().split('T')[0]
      const inspectionTime = now.toTimeString().slice(0, 5)
      let photoUrl = null
      if (photoFile) {
        try {
          const ext = photoFile.name.split('.').pop()
          const path = `audit/${asset.asset_id}-${now.getTime()}.${ext}`
          const { error: upErr } = await supabase.storage.from('asset-images').upload(path, photoFile, { contentType: photoFile.type })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('asset-images').getPublicUrl(path)
            photoUrl = urlData.publicUrl
          }
        } catch {}
      }
      const { error: insErr } = await supabase.from('asset_inspection').insert([{
        asset_id: asset.asset_id, staff_id: user?.id || null, session_id: null,
        asset_condition: physicalCondition, usage_status: usageStatus, is_submerged: false,
        inspection_date: inspectionDate, inspection_time: inspectionTime,
        inspector_name: user?.full_name || 'Unknown',
        remarks: remarks || null, follow_up_action: followUp || null,
        image_url: photoUrl, verified_at: now.toISOString(),
      }])
      if (insErr) throw insErr
      const statusMap = {
        'Good': 'Active', 'Needs Maintenance': 'Under Maintenance',
        'Damaged': 'Under Maintenance', 'Missing': 'Lost',
        'Recommended for Disposal': asset.status,
      }
      const newStatus = statusMap[physicalCondition] ?? asset.status
      if (newStatus !== asset.status) await supabase.from('assets').update({ status: newStatus }).eq('asset_id', asset.asset_id)
      try {
        await supabase.from('log_history').insert([{
          asset_id: asset.asset_id, staff_id: user?.id || null,
          log_details: `Audit: Condition=${physicalCondition}, Usage=${usageStatus}`,
          log_timestamp: now.toISOString(),
        }])
      } catch {}
      await fetchRecentAudits()
      setSubmitted({ assetName: asset.asset_name, qrId: asset.qr_code_id, condition: physicalCondition, time: `${inspectionDate} ${inspectionTime}` })
    } catch (err) {
      setSubmitError('Failed to save audit: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const fetchRecentAudits = async () => {
    if (!user?.id) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('asset_inspection')
      .select('asset_condition, usage_status, inspection_time, assets(asset_name, qr_code_id)')
      .eq('staff_id', user.id).gte('inspection_date', today)
      .order('verified_at', { ascending: false }).limit(8)
    if (data) setRecentAudits(data)
  }

  useEffect(() => { fetchRecentAudits() }, [user?.id]) // eslint-disable-line

  const nowDisplay = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })

  // ── Inject scan line animation ────────────────────────────────────────────

  useEffect(() => {
    const id = 'scanline-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = `
        @keyframes scanline {
          0%   { top: 15%; opacity: 0; }
          10%  { opacity: 1; }
          50%  { top: 85%; }
          90%  { opacity: 1; }
          100% { top: 15%; opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // ── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-8 text-center">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-3">✓</div>
            <h2 className="text-xl font-bold text-white">Audit Submitted</h2>
            <p className="text-teal-100 text-sm mt-1">{submitted.time}</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="font-bold text-slate-800">{submitted.assetName}</p>
              {submitted.qrId && <p className="font-mono text-sm text-teal-600">{submitted.qrId}</p>}
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${CONDITION_BADGE[submitted.condition] || 'bg-slate-100 text-slate-600'}`}>
                {submitted.condition}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleReset}
                className="py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors">
                📷 Scan Next
              </button>
              <button onClick={() => { fetchRecentAudits(); setSubmitted(null) }}
                className="py-3 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50">
                📋 History
              </button>
            </div>
          </div>
        </div>

        {recentAudits.length > 0 && (
          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Today's Audits</p>
              <span className="text-xs bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">{recentAudits.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {recentAudits.map((a, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    a.asset_condition === 'Good' ? 'bg-green-500' :
                    a.asset_condition === 'Damaged' ? 'bg-red-500' :
                    a.asset_condition === 'Missing' ? 'bg-orange-500' :
                    a.asset_condition === 'Needs Maintenance' ? 'bg-yellow-500' : 'bg-slate-400'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{a.assets?.asset_name || '—'}</p>
                    {a.assets?.qr_code_id && <p className="text-xs font-mono text-teal-600">{a.assets.qr_code_id}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CONDITION_BADGE[a.asset_condition] || 'bg-slate-100 text-slate-600'}`}>
                      {a.asset_condition}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">{a.inspection_time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">QR Audit Input</h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">QR-Based</span>
          </div>
          <p className="text-sm text-slate-500">Scan an asset QR code to begin the audit.</p>
        </div>
        {recentAudits.length > 0 && !asset && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-slate-400">Today</p>
            <p className="text-2xl font-bold text-teal-600">{recentAudits.length}</p>
            <p className="text-xs text-slate-400">audits</p>
          </div>
        )}
      </div>

      <div className={asset ? 'md:grid md:grid-cols-2 md:gap-6 md:items-start' : ''}>

        {/* ── LEFT: Scanner panel ── */}
        <div className="space-y-4 mb-4 md:mb-0">

          {!asset && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">

              {/* Segmented tab control */}
              <div className="p-3 border-b border-slate-100">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  {[
                    { key: 'camera', icon: '📷', label: 'Camera', sub: 'Recommended' },
                    { key: 'upload', icon: '🖼',  label: 'Upload',  sub: 'From gallery' },
                    { key: 'manual', icon: '⌨️',  label: 'Type',    sub: 'Manual ID'   },
                  ].map(t => (
                    <button key={t.key} onClick={() => setInputTab(t.key)}
                      className={`flex-1 py-2.5 px-1 rounded-lg text-center transition-all ${
                        inputTab === t.key
                          ? 'bg-white shadow-sm'
                          : 'hover:bg-white/50'
                      }`}>
                      <p className={`text-base leading-none mb-0.5`}>{t.icon}</p>
                      <p className={`text-xs font-bold leading-none ${inputTab === t.key ? 'text-teal-600' : 'text-slate-500'}`}>{t.label}</p>
                      {inputTab === t.key && t.key === 'camera' && (
                        <p className="text-[10px] text-teal-400 mt-0.5 leading-none">{t.sub}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera tab */}
              {inputTab === 'camera' && (
                <div>
                  {!cameraActive && !cameraError && (
                    <div className="p-5">
                      {/* Scanner preview placeholder */}
                      <div className="relative bg-slate-900 rounded-2xl overflow-hidden mb-4" style={{ minHeight: 300 }}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-teal-400 opacity-30 mb-6 animate-ping" />
                          <ScannerOverlay scanning={false} />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col items-center">
                          <button onClick={startCamera}
                            className="w-full max-w-xs py-3.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-white font-bold rounded-xl text-sm shadow-lg transition-colors">
                            📷 Start Scanner
                          </button>
                          <p className="text-slate-400 text-xs mt-2">Tap to activate rear camera</p>
                        </div>
                      </div>
                      <p className="text-xs text-center text-slate-400">
                        Point the camera at any asset QR tag — it detects automatically.
                      </p>
                    </div>
                  )}

                  {cameraActive && (
                    <div>
                      <div className="relative bg-slate-900 overflow-hidden" style={{ minHeight: 320 }}>
                        <div id="qr-reader" className="w-full" />
                        <ScannerOverlay scanning={cameraScanning} />
                        {/* Status bar */}
                        <div className="absolute top-3 inset-x-3 flex justify-between items-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${
                            cameraScanning
                              ? 'bg-teal-500 bg-opacity-90 text-white'
                              : 'bg-slate-800 bg-opacity-80 text-slate-300'
                          }`}>
                            {cameraScanning ? '● Scanning…' : 'Starting…'}
                          </span>
                          <button onClick={stopCamera}
                            className="px-3 py-1 bg-slate-800 bg-opacity-80 text-slate-300 hover:text-white rounded-full text-xs backdrop-blur-sm">
                            Stop
                          </button>
                        </div>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-xs text-slate-400 text-center">
                          {cameraScanning ? 'Hold QR code steady within the brackets' : 'Camera starting…'}
                        </p>
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-5 space-y-3">
                      <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <span className="text-2xl flex-shrink-0">📷</span>
                        <div>
                          <p className="text-sm font-bold text-red-700 mb-0.5">Camera Error</p>
                          <p className="text-xs text-red-600">{cameraError}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={startCamera}
                          className="py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm">
                          Try Again
                        </button>
                        <button onClick={() => setInputTab('manual')}
                          className="py-3 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50">
                          Type Instead
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload tab */}
              {inputTab === 'upload' && (
                <div className="p-5 space-y-3">
                  <label className="block cursor-pointer">
                    <div className={`relative border-2 border-dashed rounded-2xl transition-all overflow-hidden ${
                      uploadLoading ? 'border-teal-400 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-teal-50/50'
                    }`} style={{ minHeight: 240 }}>
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        {uploadLoading ? (
                          <>
                            <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" style={{ borderWidth: 3 }} />
                            <p className="text-sm font-bold text-teal-600">Scanning image for QR…</p>
                            <p className="text-xs text-teal-400 mt-1">Please wait</p>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-3">🖼</div>
                            <p className="text-sm font-bold text-slate-700">Tap to upload image</p>
                            <p className="text-xs text-slate-400 mt-1">PNG, JPG — containing a QR code</p>
                            <p className="text-xs text-slate-400 mt-3 px-4">Useful when camera is unavailable or for screenshot QR codes</p>
                          </>
                        )}
                      </div>
                    </div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                  </label>
                  {uploadError && (
                    <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <span>⚠</span>
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Manual tab */}
              {inputTab === 'manual' && (
                <div className="p-5">
                  <div className="mb-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Enter QR Code ID</p>
                    <p className="text-xs text-slate-400">Type the ID printed on the asset tag</p>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && lookupAsset(manualInput.trim().toUpperCase())}
                      placeholder="e.g. YBA1346-00001"
                      className="w-full border-2 border-slate-200 focus:border-teal-500 rounded-xl px-4 py-3.5 font-mono text-base uppercase tracking-widest focus:outline-none transition-colors bg-slate-50 focus:bg-white"
                    />
                    <button
                      onClick={() => lookupAsset(manualInput.trim().toUpperCase())}
                      disabled={!manualInput.trim() || assetLoading}
                      className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm transition-colors">
                      {assetLoading ? 'Searching…' : 'Search Asset'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-4">
                    Format: <span className="font-mono">SCHOOLCODE-00000</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {assetLoading && (
            <div className="bg-white rounded-2xl shadow border border-slate-200 p-10 text-center">
              <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Looking up asset…</p>
              <p className="text-xs text-slate-400 mt-1">Checking QR database</p>
            </div>
          )}

          {/* Not found */}
          {assetError && !asset && (
            <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-red-50 border-b border-red-200">
                <p className="text-sm font-bold text-red-700">Asset Not Found</p>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-sm text-slate-600">{assetError}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setAssetError(null); setInputTab('camera') }}
                    className="py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm">
                    📷 Scan Again
                  </button>
                  <button onClick={() => { setAssetError(null); setInputTab('manual') }}
                    className="py-3 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50">
                    ⌨️ Type ID
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Asset found card */}
          {asset && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-teal-500 to-teal-600 flex items-center gap-2">
                <span className="text-white text-sm font-bold">✓ Asset Found</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
                  asset.status === 'Active' ? 'bg-green-400 text-white' :
                  asset.status === 'Lost' ? 'bg-orange-400 text-white' :
                  'bg-white bg-opacity-20 text-white'
                }`}>{asset.status}</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="font-bold text-slate-900 text-base leading-tight">{asset.asset_name}</p>
                  {asset.qr_code_id && <p className="font-mono text-teal-600 text-sm mt-1">{asset.qr_code_id}</p>}
                  {asset.registration_no && <p className="text-xs text-slate-400 mt-0.5 break-all">{asset.registration_no}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-slate-400 font-medium mb-0.5">Category</p>
                    <p className="text-slate-800 font-bold">{asset.category || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-slate-400 font-medium mb-0.5">CSP Height</p>
                    <p className="text-slate-800 font-bold">{asset.csp_height ? `${asset.csp_height}cm` : '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2">
                    <p className="text-slate-400 font-medium mb-0.5">Location</p>
                    <p className="text-slate-800 font-bold">{locationPath}</p>
                  </div>
                </div>
                <button onClick={handleReset}
                  className="w-full py-2.5 border-2 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 font-bold rounded-xl text-sm transition-colors">
                  ✕ Scan Different Asset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Audit Form ── */}
        {asset && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 text-base">Audit Form</h2>
                <p className="text-xs text-slate-400 mt-0.5">Record the current condition of this asset</p>
              </div>
              <div className="p-5">

                {/* Usage Status */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Usage Status <span className="text-red-400">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {USAGE_OPTIONS.map(opt => (
                      <label key={opt.value} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        usageStatus === opt.value
                          ? 'border-teal-500 bg-teal-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                        <input type="radio" name="usage" value={opt.value}
                          checked={usageStatus === opt.value}
                          onChange={() => setUsageStatus(opt.value)}
                          className="accent-teal-600 w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{opt.icon} {opt.label}</p>
                          <p className="text-xs text-slate-400">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Physical Condition */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Physical Condition <span className="text-red-400">*</span>
                  </p>
                  <div className="space-y-2">
                    {CONDITIONS.map(opt => (
                      <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        physicalCondition === opt.value
                          ? `${opt.color} border-opacity-100 shadow-sm`
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                        <input type="radio" name="condition" value={opt.value}
                          checked={physicalCondition === opt.value}
                          onChange={() => setPhysicalCondition(opt.value)}
                          className="accent-teal-600 w-4 h-4 flex-shrink-0" />
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                          <p className="text-xs text-slate-400">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                    placeholder="Any observations or notes…"
                    className="w-full border-2 border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors resize-none bg-slate-50 focus:bg-white" />
                </div>

                {/* Photo evidence */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Photo Evidence</label>
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                      photoPreview ? 'border-teal-300 bg-teal-50' : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/30'
                    }`}>
                      {photoPreview ? (
                        <div className="flex items-center gap-3">
                          <img src={photoPreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-teal-700">Photo attached</p>
                            <button type="button" onClick={(e) => { e.preventDefault(); setPhotoFile(null); setPhotoPreview(null) }}
                              className="text-xs text-red-500 hover:underline mt-0.5">Remove</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">📷 Take Photo or Upload</p>
                      )}
                    </div>
                    {!photoPreview && (
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={e => {
                          const f = e.target.files[0]
                          if (!f) return
                          setPhotoFile(f)
                          const reader = new FileReader()
                          reader.onload = ev => setPhotoPreview(ev.target.result)
                          reader.readAsDataURL(f)
                        }} />
                    )}
                  </label>
                </div>

                {/* Follow-up */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Follow-up Action</label>
                  <input value={followUp} onChange={e => setFollowUp(e.target.value)}
                    placeholder="e.g. Schedule maintenance, report to office…"
                    className="w-full border-2 border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors bg-slate-50 focus:bg-white" />
                </div>

                {/* Inspector info */}
                <div className="mb-5 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(user?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-700">{user?.full_name || 'Unknown'}</p>
                    <p className="text-slate-400">{nowDisplay}</p>
                  </div>
                </div>

                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{submitError}</div>
                )}

                <button onClick={handleSubmit}
                  disabled={submitting || !usageStatus || !physicalCondition}
                  className={`w-full py-4 font-bold rounded-xl text-sm transition-all ${
                    usageStatus && physicalCondition
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg active:scale-95'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : '✓ Submit Audit Record'}
                </button>

                {(!usageStatus || !physicalCondition) && (
                  <p className="text-center text-xs text-slate-400 mt-2">
                    Select usage status and condition to enable submit
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today's audits — always visible at bottom */}
      {recentAudits.length > 0 && !asset && (
        <div className="mt-6 bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">Today's Audits</p>
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">{recentAudits.length} completed</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentAudits.map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  a.asset_condition === 'Good' ? 'bg-green-500' :
                  a.asset_condition === 'Damaged' ? 'bg-red-500' :
                  a.asset_condition === 'Missing' ? 'bg-orange-500' :
                  a.asset_condition === 'Needs Maintenance' ? 'bg-yellow-500' : 'bg-slate-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{a.assets?.asset_name || '—'}</p>
                  {a.assets?.qr_code_id && <p className="text-xs font-mono text-teal-500">{a.assets.qr_code_id}</p>}
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <span className={`block text-xs font-bold px-2 py-0.5 rounded-full ${CONDITION_BADGE[a.asset_condition] || 'bg-slate-100 text-slate-600'}`}>
                    {a.asset_condition}
                  </span>
                  <p className="text-xs text-slate-400">{a.inspection_time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
