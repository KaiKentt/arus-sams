import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const CONDITIONS = [
  { value: 'Good',                     label: 'Good',                     desc: 'Baik',                   color: 'text-green-700'  },
  { value: 'Damaged',                  label: 'Damaged',                  desc: 'Rosak',                  color: 'text-red-700'    },
  { value: 'Needs Maintenance',        label: 'Needs Maintenance',        desc: 'Perlu Penyelenggaraan',   color: 'text-yellow-700' },
  { value: 'Missing',                  label: 'Missing',                  desc: 'Hilang',                 color: 'text-orange-700' },
  { value: 'Recommended for Disposal', label: 'Recommended for Disposal', desc: 'Dicadang Pelupusan',      color: 'text-slate-600'  },
]

const USAGE_OPTIONS = [
  { value: 'In Use',     label: 'In Use',     desc: 'Sedang Digunakan' },
  { value: 'Not In Use', label: 'Not In Use', desc: 'Tidak Digunakan'  },
]

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

export default function MobileAudit({ user }) {
  const [inputTab, setInputTab]       = useState('manual')
  const [manualInput, setManualInput] = useState('')

  // Camera state
  const [cameraActive, setCameraActive]     = useState(false)
  const [cameraError, setCameraError]       = useState(null)
  const [cameraScanning, setCameraScanning] = useState(false)
  const scannerRef = useRef(null)

  // File upload
  const [uploadError, setUploadError]     = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  // Asset lookup
  const [asset, setAsset]               = useState(null)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError]     = useState(null)
  const [locationPath, setLocationPath] = useState('')

  // Audit form
  const [usageStatus, setUsageStatus]             = useState('')
  const [physicalCondition, setPhysicalCondition] = useState('')
  const [remarks, setRemarks]                     = useState('')
  const [followUp, setFollowUp]                   = useState('')
  const [photoFile, setPhotoFile]                 = useState(null)
  const [photoPreview, setPhotoPreview]           = useState(null)

  // Submit
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted]     = useState(null)

  // Recent audits
  const [recentAudits, setRecentAudits] = useState([])
  const [showHistory, setShowHistory]   = useState(false)

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
    if (!el) {
      setCameraError('Camera container not ready. Try refreshing.')
      setCameraActive(false)
      return
    }

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const qr = new Html5Qrcode('qr-reader')
      scannerRef.current = qr

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
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
        setCameraError('Camera permission denied. Allow camera access in browser settings.')
      } else if (msg.includes('notfound') || msg.includes('no camera')) {
        setCameraError('No camera found. Use Upload or Type tab.')
      } else {
        setCameraError('Could not start camera: ' + (err?.message || 'Unknown error'))
      }
      setCameraActive(false)
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch {}
        scannerRef.current = null
      }
    }
  }

  useEffect(() => {
    if (inputTab !== 'camera' || asset) stopCamera()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTab, asset])

  useEffect(() => {
    return () => { stopCamera() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      const { data: allLocs } = await supabase
        .from('locations')
        .select('location_id, location_name, parent_location_id')
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
      setUploadError('No QR code found in this image. Try a clearer photo or use the Type tab.')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleReset = async () => {
    await stopCamera()
    setAsset(null)
    setAssetError(null)
    setLocationPath('')
    setUsageStatus('')
    setPhysicalCondition('')
    setRemarks('')
    setFollowUp('')
    setPhotoFile(null)
    setPhotoPreview(null)
    setSubmitError(null)
    setSubmitted(null)
    setManualInput('')
    setCameraError(null)
    setUploadError(null)
    setInputTab('manual')
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

      // Upload photo (non-fatal)
      let photoUrl = null
      if (photoFile) {
        try {
          const ext = photoFile.name.split('.').pop()
          const path = `audit/${asset.asset_id}-${now.getTime()}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('asset-images')
            .upload(path, photoFile, { contentType: photoFile.type })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('asset-images').getPublicUrl(path)
            photoUrl = urlData.publicUrl
          }
        } catch {}
      }

      // INSERT audit record
      const { error: insErr } = await supabase
        .from('asset_inspection')
        .insert([{
          asset_id:         asset.asset_id,
          staff_id:         user?.id || null,
          session_id:       null,
          asset_condition:  physicalCondition,
          usage_status:     usageStatus,
          is_submerged:     false,
          inspection_date:  inspectionDate,
          inspection_time:  inspectionTime,
          inspector_name:   user?.full_name || 'Unknown',
          remarks:          remarks || null,
          follow_up_action: followUp || null,
          image_url:        photoUrl,
          verified_at:      now.toISOString(),
        }])
      if (insErr) throw insErr

      // Update asset status
      const statusMap = {
        'Good':                     'Active',
        'Needs Maintenance':        'Under Maintenance',
        'Damaged':                  'Under Maintenance',
        'Missing':                  'Lost',
        'Recommended for Disposal': asset.status,
      }
      const newStatus = statusMap[physicalCondition] ?? asset.status
      if (newStatus !== asset.status) {
        await supabase.from('assets').update({ status: newStatus }).eq('asset_id', asset.asset_id)
      }

      // Log (non-fatal)
      try {
        await supabase.from('log_history').insert([{
          asset_id:      asset.asset_id,
          staff_id:      user?.id || null,
          log_details:   `Audit: Condition=${physicalCondition}, Usage=${usageStatus}`,
          log_timestamp: now.toISOString(),
        }])
      } catch {}

      await fetchRecentAudits()
      setSubmitted({
        assetName: asset.asset_name,
        qrId:      asset.qr_code_id,
        condition: physicalCondition,
        time:      `${inspectionDate} ${inspectionTime}`,
      })
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
      .eq('staff_id', user.id)
      .gte('inspection_date', today)
      .order('verified_at', { ascending: false })
      .limit(5)
    if (data) setRecentAudits(data)
  }

  useEffect(() => { fetchRecentAudits() }, [user?.id]) // eslint-disable-line

  const nowDisplay = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })

  // ── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow border border-green-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Audit Submitted</h2>
          <div className="text-sm text-slate-500 space-y-1 mt-3 mb-6 text-left bg-slate-50 rounded-xl p-4">
            <p><span className="font-semibold text-slate-700">Asset:</span> {submitted.assetName}</p>
            {submitted.qrId && <p><span className="font-semibold text-slate-700">QR ID:</span> <span className="font-mono text-teal-600">{submitted.qrId}</span></p>}
            <p><span className="font-semibold text-slate-700">Condition:</span> {submitted.condition}</p>
            <p><span className="font-semibold text-slate-700">Time:</span> {submitted.time}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleReset}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm">
              Scan Next Asset
            </button>
            <button onClick={() => { setShowHistory(true); setSubmitted(null) }}
              className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50">
              View History
            </button>
          </div>
        </div>
        {recentAudits.length > 0 && (
          <div className="bg-white rounded-xl shadow border border-slate-200 divide-y divide-slate-100">
            {recentAudits.map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{a.assets?.asset_name || '—'}</p>
                  {a.assets?.qr_code_id && <p className="text-xs font-mono text-teal-600">{a.assets.qr_code_id}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-700">{a.asset_condition}</p>
                  <p className="text-xs text-slate-400">{a.inspection_time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">QR Asset Audit</h1>
        <p className="text-sm text-slate-500 mt-1">Find an asset by QR ID, then fill in the audit form.</p>
      </div>

      <div className={asset ? 'md:grid md:grid-cols-2 md:gap-6 md:items-start' : ''}>

        {/* ── LEFT ── */}
        <div className="space-y-4 mb-4 md:mb-0">

          {!asset && (
            <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                {[
                  { key: 'camera', label: '📷 Camera' },
                  { key: 'upload', label: '🖼 Upload' },
                  { key: 'manual', label: '⌨️ Type'   },
                ].map(t => (
                  <button key={t.key} onClick={() => setInputTab(t.key)}
                    className={`flex-1 py-3 text-xs md:text-sm font-bold transition-colors ${
                      inputTab === t.key
                        ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* Camera tab */}
                {inputTab === 'camera' && (
                  <div className="space-y-3">
                    {!cameraActive && !cameraError && (
                      <button onClick={startCamera}
                        className="w-full py-10 border-2 border-dashed border-slate-300 hover:border-teal-400 rounded-xl text-center transition-colors">
                        <p className="text-3xl mb-2">📷</p>
                        <p className="text-sm font-bold text-slate-700">Tap to Start Camera</p>
                        <p className="text-xs text-slate-400 mt-1">Rear camera will open</p>
                      </button>
                    )}
                    {cameraActive && (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden bg-slate-900" style={{ minHeight: 280 }}>
                          <div id="qr-reader" className="w-full" />
                          {cameraScanning && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-48 h-48 border-2 border-teal-400 rounded-xl opacity-70" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 text-center">
                          {cameraScanning ? 'Point at QR code — auto detects' : 'Starting…'}
                        </p>
                        <button onClick={stopCamera}
                          className="w-full py-2 border border-slate-200 rounded-xl text-xs text-slate-500 hover:bg-slate-50">
                          Stop Camera
                        </button>
                      </div>
                    )}
                    {cameraError && (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{cameraError}</div>
                        <button onClick={startCamera}
                          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm">
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload tab */}
                {inputTab === 'upload' && (
                  <div className="space-y-3">
                    <label className="block cursor-pointer">
                      <div className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                        uploadLoading ? 'border-teal-400 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-teal-50'
                      }`}>
                        {uploadLoading ? (
                          <>
                            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-sm text-teal-600 font-medium">Scanning for QR…</p>
                          </>
                        ) : (
                          <>
                            <p className="text-3xl mb-2">🖼</p>
                            <p className="text-sm font-bold text-slate-700">Tap to upload image</p>
                            <p className="text-xs text-slate-400 mt-1">PNG or JPG containing a QR code</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                    </label>
                    {uploadError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{uploadError}</div>
                    )}
                  </div>
                )}

                {/* Manual tab */}
                {inputTab === 'manual' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">QR Code ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && lookupAsset(manualInput.trim().toUpperCase())}
                        placeholder="e.g. YBA1346-00001"
                        className="flex-1 border border-slate-300 rounded-xl px-4 py-3 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
                      />
                      <button
                        onClick={() => lookupAsset(manualInput.trim().toUpperCase())}
                        disabled={!manualInput.trim() || assetLoading}
                        className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 text-sm min-h-[44px]">
                        Search
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {assetLoading && (
            <div className="bg-white rounded-2xl shadow border border-slate-200 p-8 text-center">
              <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Looking up asset…</p>
            </div>
          )}

          {/* Not found */}
          {assetError && !asset && (
            <div className="bg-white rounded-2xl shadow border border-slate-200 p-5 space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{assetError}</div>
              <button onClick={() => setAssetError(null)}
                className="w-full py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]">
                Try Again
              </button>
            </div>
          )}

          {/* Asset found */}
          {asset && (
            <div className="bg-white rounded-2xl shadow border border-green-200 overflow-hidden">
              <div className="px-5 py-3 bg-green-50 border-b border-green-200">
                <span className="text-green-700 font-bold text-sm">✓ Asset Found</span>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="font-bold text-slate-900 text-base">{asset.asset_name}</p>
                  {asset.qr_code_id && <p className="font-mono text-teal-600 text-sm mt-0.5">{asset.qr_code_id}</p>}
                  {asset.registration_no && <p className="text-xs text-slate-400 mt-0.5 break-all">{asset.registration_no}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-slate-400 font-medium">Category</p>
                    <p className="text-slate-700 font-bold mt-0.5">{asset.category || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-slate-400 font-medium">Status</p>
                    <p className="text-slate-700 font-bold mt-0.5">{asset.status || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 col-span-2">
                    <p className="text-slate-400 font-medium">Location</p>
                    <p className="text-slate-700 font-bold mt-0.5">{locationPath}</p>
                  </div>
                </div>
                <button onClick={handleReset}
                  className="w-full py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 min-h-[44px]">
                  ✕ Scan Different Asset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Audit Form ── */}
        {asset && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow border border-slate-200 p-5">
              <h2 className="font-bold text-slate-800 text-lg mb-5 pb-3 border-b border-slate-100">Audit Details</h2>

              {/* Usage Status */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Usage Status <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {USAGE_OPTIONS.map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors min-h-[52px] ${
                      usageStatus === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="usage" value={opt.value}
                        checked={usageStatus === opt.value}
                        onChange={() => setUsageStatus(opt.value)}
                        className="accent-teal-600 w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                        <p className="text-xs text-slate-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Physical Condition */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Physical Condition <span className="text-red-500">*</span>
                </p>
                <div className="space-y-2">
                  {CONDITIONS.map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors min-h-[52px] ${
                      physicalCondition === opt.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="condition" value={opt.value}
                        checked={physicalCondition === opt.value}
                        onChange={() => setPhysicalCondition(opt.value)}
                        className="accent-teal-600 w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className={`text-sm font-bold ${opt.color}`}>{opt.label}</p>
                        <p className="text-xs text-slate-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Remarks (optional)</label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                  placeholder="Any observations…"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>

              {/* Photo */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Photo Evidence (optional)</label>
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-slate-300 hover:border-teal-400 rounded-xl p-4 text-center min-h-[44px] flex items-center justify-center transition-colors">
                    <p className="text-sm text-slate-500">📷 Take Photo / Upload Image</p>
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => {
                      const f = e.target.files[0]
                      if (!f) return
                      setPhotoFile(f)
                      const reader = new FileReader()
                      reader.onload = ev => setPhotoPreview(ev.target.result)
                      reader.readAsDataURL(f)
                    }} />
                </label>
                {photoPreview && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={photoPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                      className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                )}
              </div>

              {/* Follow-up */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Follow-up Action (optional)</label>
                <input value={followUp} onChange={e => setFollowUp(e.target.value)}
                  placeholder="e.g. Schedule maintenance…"
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]" />
              </div>

              {/* Inspector info */}
              <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                <p><span className="font-bold">Inspector:</span> {user?.full_name || 'Unknown'}</p>
                <p><span className="font-bold">Date / Time:</span> {nowDisplay}</p>
              </div>

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{submitError}</div>
              )}

              <button onClick={handleSubmit}
                disabled={submitting || !usageStatus || !physicalCondition}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors text-sm min-h-[52px]">
                {submitting ? 'Submitting…' : '✓ Submit Audit Record'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent audits */}
      {recentAudits.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-teal-600 mb-3">
            <span>{showHistory ? '▼' : '▶'}</span>
            <span>Today's Audits ({recentAudits.length})</span>
          </button>
          {showHistory && (
            <div className="bg-white rounded-xl shadow border border-slate-200 divide-y divide-slate-100">
              {recentAudits.map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{a.assets?.asset_name || '—'}</p>
                    {a.assets?.qr_code_id && <p className="text-xs font-mono text-teal-600">{a.assets.qr_code_id}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-slate-700">{a.asset_condition}</p>
                    <p className="text-xs text-slate-400">{a.inspection_time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
