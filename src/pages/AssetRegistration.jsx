import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  generateRegistrationNo,
  incrementRunningNo,
  checkRegistrationNoExists,
  insertAsset,
  insertLogHistory,
  uploadAssetImage,
  fetchSchoolCodes,
  fetchRoomLocations,
  fetchCategories,
  fetchSubcategories,
  fetchAssetTypeRefs,
  generateQrId,
  incrementQrCounter,
  generateAndSaveQR,
} from '../hooks/useAssets'

const SECTIONS = [
  { id: 1, label: 'Registration', icon: '📋' },
  { id: 2, label: 'Identification', icon: '🏷️' },
  { id: 3, label: 'Financial', icon: '💰' },
  { id: 4, label: 'Placement', icon: '📍' },
  { id: 5, label: 'Additional', icon: '📎' },
]

const INITIAL_FORM = {
  manualRegNo: '',
  nationalCode: '',
  categoryCode: '',
  category: '',
  subCategoryCode: '',
  subCategory: '',
  brand: '',
  model: '',
  countryOfOrigin: '',
  manufacturerSerial: '',
  acquisitionPrice: '',
  assetType: '',
  acquisitionMethod: 'Purchase',
  acquisitionDate: '',
  receivedDate: '',
  officialOrderNo: '',
  warrantyPeriod: '',
  supplierName: '',
  locationId: '',
  cspHeight: '',
  placementDate: '',
  responsibleOfficer: '',
  criticalityLevel: 3,
  specifications: '',
}

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500 font-medium">⚠ {error}</p>}
    </div>
  )
}

const inputCls = (hasError) =>
  `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
    hasError ? 'border-red-400 focus:ring-red-300' : 'border-slate-300 focus:ring-teal-400'
  }`

// ── Component sub-form (shown after parent asset is saved)
function ComponentForm({ parentAsset, componentCount, onAdd }) {
  const [desc, setDesc] = useState('')
  const [serial, setSerial] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const handleAdd = async () => {
    if (!desc.trim()) { setErr('Component description is required.'); return }
    setSaving(true)
    setErr(null)
    const suffix = componentCount + 1
    const compRegNo = `${parentAsset.registration_no}-${suffix}`
    try {
      await insertAsset(supabase, {
        asset_id: compRegNo,
        registration_no: compRegNo,
        asset_name: desc,
        asset_description: desc,
        manufacturer_serial: serial || null,
        parent_asset_id: parentAsset.asset_id,
        component_suffix: suffix,
        school_id: parentAsset.school_id,
        staff_id: parentAsset.staff_id,
        status: 'Active',
        location_id: parentAsset.location_id,
        asset_type: parentAsset.asset_type,
        is_existing_asset: parentAsset.is_existing_asset,
      })
      await insertLogHistory(supabase, {
        assetId: compRegNo,
        staffId: parentAsset.staff_id,
        logDetails: `Component registered: ${desc} (${compRegNo}) under ${parentAsset.registration_no}`,
      })
      onAdd({ regNo: compRegNo, description: desc })
      setDesc('')
      setSerial('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {err && <p className="text-xs text-red-500">⚠ {err}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Component Description" required>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className={inputCls(!desc.trim() && err)} placeholder="e.g. Monitor, Keyboard, CPU" />
        </Field>
        <Field label="Manufacturer Serial (optional)">
          <input value={serial} onChange={e => setSerial(e.target.value)}
            className={inputCls(false)} placeholder="e.g. SN-123456" />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-mono">
          Will register as: <strong>{parentAsset.registration_no}-{componentCount + 1}</strong>
        </span>
        <button onClick={handleAdd} disabled={saving}
          className="ml-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg disabled:opacity-50">
          {saving ? 'Adding...' : 'Add Component'}
        </button>
      </div>
    </div>
  )
}

// ── Main page
export default function AssetRegistration({ user, schoolId, userRole }) {
  // Compute role flags before any hooks (pure calculations, not hooks)
  const canRegister = userRole === 'asset_teacher' || userRole === 'superadmin'
  const canOverrideType = userRole === 'headmaster' || userRole === 'superadmin'
  const isReadOnly = userRole === 'headmaster'

  // ALL hooks must be declared unconditionally before any early returns
  const [flow, setFlow] = useState('new')
  const [existingSubFlow, setExistingSubFlow] = useState('has_reg_no')
  const [form, setForm] = useState(INITIAL_FORM)
  const [activeSection, setActiveSection] = useState(1)
  const [previewRegNo, setPreviewRegNo] = useState('')
  const [schoolData, setSchoolData] = useState(null)
  const [rooms, setRooms] = useState([])
  const [locationPaths, setLocationPaths] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [savedAsset, setSavedAsset] = useState(null)
  const [savedQrDataUrl, setSavedQrDataUrl] = useState(null)
  const [addedComponents, setAddedComponents] = useState([])
  const [showComponentForm, setShowComponentForm] = useState(false)

  // Classification dropdown state
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [assetTypeOptions, setAssetTypeOptions] = useState([])

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))

  // Classification cascade handlers
  const handleCategoryChange = (e) => {
    const code = e.target.value
    const cat = categories.find(c => c.code === code)
    setForm(prev => ({ ...prev, categoryCode: code, category: cat?.name || '', subCategoryCode: '', subCategory: '', nationalCode: '' }))
    setSubcategories([])
    setAssetTypeOptions([])
    fetchSubcategories(code).then(setSubcategories).catch(err => console.error('[fetchSubcategories]', err))
  }

  const handleSubCategoryChange = (e) => {
    const code = e.target.value
    const sub = subcategories.find(s => s.code === code)
    setForm(prev => ({ ...prev, subCategoryCode: code, subCategory: sub?.name || '', nationalCode: '' }))
    setAssetTypeOptions([])
    fetchAssetTypeRefs(code).then(setAssetTypeOptions).catch(err => console.error('[fetchAssetTypeRefs]', err))
  }

  const handleAssetTypeChange = (e) => {
    const code = e.target.value
    const type = assetTypeOptions.find(t => t.code === code)
    setForm(prev => ({
      ...prev,
      nationalCode: code,
      assetDescription: prev.assetDescription || type?.name || '',
    }))
  }

  useEffect(() => {
    if (!schoolId) return
    fetchSchoolCodes(schoolId).then(setSchoolData).catch(() => {})
    fetchRoomLocations(schoolId).then(({ rooms, paths }) => {
      setRooms(rooms)
      setLocationPaths(paths)
    }).catch(() => {})
  }, [schoolId])

  useEffect(() => {
    fetchCategories().then(setCategories).catch(err => console.error('[fetchCategories]', err))
  }, [])

  // Auto-classify asset type from price
  useEffect(() => {
    const price = parseFloat(form.acquisitionPrice)
    if (!isNaN(price) && form.acquisitionPrice !== '') {
      setForm(prev => ({ ...prev, assetType: price >= 2000 ? 'H' : 'R' }))
    } else if (form.acquisitionPrice === '') {
      setForm(prev => ({ ...prev, assetType: '' }))
    }
  }, [form.acquisitionPrice])

  // Live registration number preview (computed locally, no DB call)
  useEffect(() => {
    const needsGeneration = flow === 'new' || (flow === 'existing' && existingSubFlow === 'no_reg_no')
    if (!needsGeneration) {
      setPreviewRegNo(form.manualRegNo.trim().toUpperCase() || '—')
      return
    }
    if (!schoolData || !form.assetType) { setPreviewRegNo('—'); return }
    if (!schoolData.ptj_code) { setPreviewRegNo('PTJ code not set — edit school in Ministry Portal'); return }
    if (!schoolData.school_code) { setPreviewRegNo('School code missing'); return }
    const year = new Date().getFullYear().toString().slice(-2)
    const runningField = form.assetType === 'H' ? 'last_running_h' : 'last_running_r'
    const nextNo = (schoolData[runningField] || 0) + 1
    const runningNo = String(nextNo).padStart(3, '0')
    setPreviewRegNo(`KPM/${schoolData.ptj_code}/${schoolData.school_code}/${form.assetType}/${year}/${runningNo}`)
  }, [schoolData, form.assetType, flow, existingSubFlow, form.manualRegNo])

  // ── Access control — AFTER all hooks
  if (userRole === 'standard_teacher') {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center p-10 bg-white rounded-2xl shadow border border-red-100">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm">Asset Registration is restricted to Asset Teacher, Headmaster, and Superadmin roles.</p>
      </div>
    )
  }

  // ── Validate — returns the errors object directly (avoids stale state reads)
  const validate = () => {
    const e = {}
    if (!form.assetDescription.trim()) e.assetDescription = 'Asset description is required.'
    if (!form.category.trim()) e.category = 'Category is required.'
    if (!form.acquisitionPrice || isNaN(parseFloat(form.acquisitionPrice))) e.acquisitionPrice = 'Valid acquisition price is required.'
    if (!form.receivedDate) e.receivedDate = 'Received date is required.'
    if (!form.locationId) e.locationId = 'Location is required.'
    if (flow === 'existing' && existingSubFlow === 'has_reg_no' && !form.manualRegNo.trim()) {
      e.manualRegNo = 'Please enter the existing registration number.'
    }
    setErrors(e)
    return e  // return object, not boolean — avoids stale state
  }

  // ── Save handler
  const handleSave = async () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.assetDescription || validationErrors.category) setActiveSection(2)
      else if (validationErrors.acquisitionPrice || validationErrors.receivedDate) setActiveSection(3)
      else if (validationErrors.locationId) setActiveSection(4)
      else if (validationErrors.manualRegNo) setActiveSection(1)
      return
    }

    setSaving(true)
    setSubmitError(null)

    try {
      // 1. Generate or validate registration_no
      let finalRegNo
      let runningField = null
      let currentNo = null
      const needsGeneration = flow === 'new' || (flow === 'existing' && existingSubFlow === 'no_reg_no')

      if (needsGeneration) {
        const generated = await generateRegistrationNo(supabase, schoolId, form.assetType)
        finalRegNo = generated.regNo
        runningField = generated.runningField
        currentNo = generated.currentNo
        const exists = await checkRegistrationNoExists(supabase, finalRegNo)
        if (exists) throw new Error(`Generated number ${finalRegNo} already exists. Please try saving again.`)
      } else {
        finalRegNo = form.manualRegNo.trim().toUpperCase()
        const exists = await checkRegistrationNoExists(supabase, finalRegNo)
        if (exists) {
          setErrors(prev => ({ ...prev, manualRegNo: 'This registration number already exists in the system.' }))
          setSaving(false)
          return
        }
      }

      // 2. Reserve QR ID (do not increment counter yet)
      const { qrId, newNumber: qrNewNumber } = await generateQrId(supabase, schoolId)

      // 3. Upload image (non-fatal)
      let imageUrl = null
      if (imageFile) {
        try {
          imageUrl = await uploadAssetImage(supabase, imageFile, finalRegNo.replace(/\//g, '-'))
        } catch { /* continue without image */ }
      }

      // 4. INSERT asset — qr_code_id is NULL until QR is generated
      const saved = await insertAsset(supabase, {
        asset_id: finalRegNo,
        registration_no: finalRegNo,
        asset_name: form.assetDescription,
        asset_description: form.assetDescription,
        national_code: form.nationalCode || null,
        category_code: form.categoryCode || null,
        category: form.category,
        sub_category_code: form.subCategoryCode || null,
        sub_category: form.subCategory || null,
        brand: form.brand || null,
        model: form.model || null,
        country_of_origin: form.countryOfOrigin || null,
        manufacturer_serial: form.manufacturerSerial || null,
        acquisition_price: parseFloat(form.acquisitionPrice),
        purchase_price: parseFloat(form.acquisitionPrice),
        asset_type: form.assetType,
        acquisition_method: form.acquisitionMethod,
        acquisition_date: form.acquisitionDate || null,
        received_date: form.receivedDate,
        official_order_no: form.officialOrderNo || null,
        warranty_period: form.warrantyPeriod || null,
        supplier_name: form.supplierName || null,
        location_id: parseInt(form.locationId),
        csp_height: form.cspHeight ? parseFloat(form.cspHeight) : null,
        placement_date: form.placementDate || null,
        responsible_officer: form.responsibleOfficer || null,
        criticality_level: form.criticalityLevel,
        specifications: form.specifications || null,
        image_url: imageUrl,
        qr_code_id: null,
        is_existing_asset: flow === 'existing',
        school_id: schoolId,
        staff_id: user.id,
        status: 'Active',
      })

      // 5. Generate QR image and save to storage + update asset row
      let generatedQrDataUrl = null
      try {
        const qrResult = await generateAndSaveQR(supabase, saved.asset_id, qrId)
        generatedQrDataUrl = qrResult.qrDataUrl
      } catch (qrErr) {
        // QR generation failure is non-fatal — asset is already saved
        console.error('QR generation failed:', qrErr.message)
      }

      // 6. Increment QR counter AFTER confirmed QR generation
      if (generatedQrDataUrl) {
        await incrementQrCounter(supabase, schoolId, qrNewNumber)
      }

      // 7. Increment registration running counter
      if (runningField && currentNo) {
        await incrementRunningNo(supabase, schoolId, runningField, currentNo)
        setSchoolData(prev => ({ ...prev, [runningField]: currentNo }))
      }

      // 8. Log history
      await insertLogHistory(supabase, {
        assetId: finalRegNo,
        staffId: user.id,
        logDetails: `Asset registered: ${form.assetDescription} — ${finalRegNo} | QR: ${generatedQrDataUrl ? qrId : 'failed'}`,
      })

      // 9. Show success screen
      setSavedQrDataUrl(generatedQrDataUrl)
      setSavedAsset({ ...saved, qr_code_id: generatedQrDataUrl ? qrId : null })
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setFlow('new')
    setExistingSubFlow('has_reg_no')
    setImageFile(null)
    setImagePreview(null)
    setErrors({})
    setSubmitError(null)
    setSavedAsset(null)
    setSavedQrDataUrl(null)
    setAddedComponents([])
    setShowComponentForm(false)
    setActiveSection(1)
  }

  // ── Print QR label handler
  const handlePrintQR = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Label — ${savedAsset.qr_code_id}</title>
      <style>
        body { font-family: monospace; text-align: center; padding: 40px; background: #fff; }
        img { width: 300px; height: 300px; display: block; margin: 0 auto 16px; }
        .qr-id { font-size: 22px; font-weight: bold; letter-spacing: 2px; margin-bottom: 6px; }
        .reg-no { font-size: 12px; color: #555; margin-bottom: 8px; }
        .asset-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
        .school { font-size: 12px; color: #888; }
        @media print { @page { margin: 10mm; } }
      </style></head><body>
      <img src="${savedQrDataUrl}" />
      <div class="qr-id">${savedAsset.qr_code_id}</div>
      <div class="reg-no">${savedAsset.registration_no}</div>
      <div class="asset-name">${savedAsset.asset_description || savedAsset.asset_name}</div>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `)
    win.document.close()
  }

  // ── Post-save view
  if (savedAsset) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10 fade-in">
        {/* Success card */}
        <div className="bg-white rounded-2xl shadow border border-green-200 p-6 md:p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">✓</div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Asset Registered Successfully</h2>
          <p className="text-sm text-slate-500 mb-5">{savedAsset.asset_description || savedAsset.asset_name}</p>

          {/* QR Image */}
          {savedQrDataUrl ? (
            <div className="flex flex-col items-center gap-3 mb-5">
              <img src={savedQrDataUrl} alt="QR Code" className="w-52 h-52 border-2 border-slate-200 rounded-xl" />
              <div>
                <p className="font-mono font-bold text-xl text-teal-700 tracking-widest">{savedAsset.qr_code_id}</p>
                <p className="text-xs text-slate-400 mt-0.5">Scan to identify this asset</p>
              </div>
            </div>
          ) : (
            <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              ⚠ QR generation failed. Use the "Generate QR" button in Asset Master List.
            </div>
          )}

          {/* Registration No */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">KEW.PA No</span>
            <span className="font-mono font-bold text-sm text-slate-700">{savedAsset.registration_no}</span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {savedQrDataUrl && (
              <button onClick={handlePrintQR}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg">
                🖨 Print QR Label
              </button>
            )}
            <button onClick={handleReset}
              className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
              + Register Another Asset
            </button>
          </div>
        </div>

        {/* Components section */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Accessories & Components</h3>
              <p className="text-xs text-slate-400 mt-0.5">e.g. CPU + Monitor + Keyboard registered under one asset</p>
            </div>
            {!showComponentForm && (
              <button onClick={() => setShowComponentForm(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg">
                + Add Component
              </button>
            )}
          </div>
          {addedComponents.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {addedComponents.map((c, i) => (
                <li key={i} className="px-6 py-3 flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">{c.description}</span>
                  <span className="font-mono text-teal-700 text-xs font-bold">{c.regNo}</span>
                </li>
              ))}
            </ul>
          )}
          {showComponentForm && (
            <div className="p-6">
              <ComponentForm
                parentAsset={savedAsset}
                componentCount={addedComponents.length}
                onAdd={c => { setAddedComponents(prev => [...prev, c]); setShowComponentForm(false) }}
              />
            </div>
          )}
          {!showComponentForm && addedComponents.length === 0 && (
            <p className="px-6 py-4 text-sm text-slate-400">No components added yet.</p>
          )}
        </div>
      </div>
    )
  }

  const errorCount = Object.keys(errors).length

  // ── Registration form
  return (
    <div className="max-w-4xl mx-auto pb-28 fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asset Registration</h1>
          <p className="text-sm text-slate-500 mt-1">Register school assets under KEW.PA-3 (Harta Modal) or KEW.PA-4 (Aset Alih Bernilai Rendah)</p>
        </div>
        {isReadOnly && (
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
            👁 Read Only
          </span>
        )}
      </div>

      {/* Flow selector */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-5 mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Asset Entry Type</p>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-4">
          {[{ key: 'new', label: '🆕 New Asset' }, { key: 'existing', label: '📦 Existing Asset' }].map(f => (
            <button key={f.key} onClick={() => !isReadOnly && setFlow(f.key)}
              className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${flow === f.key ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {flow === 'existing' && (
          <div className="space-y-3 pl-1">
            {[
              { value: 'has_reg_no', label: 'Already has a registration number', desc: 'I will enter the existing number manually' },
              { value: 'no_reg_no', label: 'No registration number yet', desc: 'System will auto-generate a new number' },
            ].map(opt => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="existingSubFlow" value={opt.value}
                  checked={existingSubFlow === opt.value}
                  onChange={() => !isReadOnly && setExistingSubFlow(opt.value)}
                  className="mt-0.5 accent-teal-600" />
                <div>
                  <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                  <p className="text-xs text-slate-400">{opt.desc}</p>
                </div>
              </label>
            ))}
            {existingSubFlow === 'has_reg_no' && (
              <div className="mt-3 max-w-sm">
                <Field label="Existing Registration Number" required error={errors.manualRegNo}>
                  <input value={form.manualRegNo} onChange={set('manualRegNo')} disabled={isReadOnly}
                    className={`${inputCls(!!errors.manualRegNo)} font-mono uppercase`}
                    placeholder="e.g. KPM/JPNS/SKRP/H/25/001" />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reg no preview banner */}
      <div className="flex items-center gap-4 bg-teal-50 border-2 border-teal-300 rounded-xl p-4 mb-4">
        <div className="flex-1">
          <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-0.5">Registration No</p>
          <p className="font-mono font-bold text-lg text-teal-900 tracking-widest">
            {previewRegNo || '— (enter price in Section 3 to generate)'}
          </p>
          <p className="text-xs text-teal-500 mt-0.5">
            {flow === 'new' || (flow === 'existing' && existingSubFlow === 'no_reg_no')
              ? 'Auto-generated preview · confirmed on save'
              : 'Manual entry'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-bold uppercase">
            {flow === 'new' || existingSubFlow === 'no_reg_no' ? 'AUTO' : 'MANUAL'}
          </span>
          {form.assetType && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              form.assetType === 'H' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-blue-100 text-blue-800 border-blue-300'
            }`}>
              {form.assetType === 'H' ? '📋 KEW.PA-3 — Harta Modal' : '📋 KEW.PA-4 — Aset Alih Bernilai Rendah'}
            </span>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-white rounded-xl shadow border border-slate-200 p-2 mb-4 overflow-x-auto">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              activeSection === s.id ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            <span>{s.icon}</span><span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Section 1 — Registration Info */}
      {activeSection === 1 && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Registration Information</h3>
          <p className="text-sm text-slate-500">Select New or Existing Asset above, then enter the acquisition price in Section 3 to auto-generate the registration number. Make sure School Profile has Ministry Code, PTJ Code, and Branch Code filled in.</p>
          {schoolData && !schoolData.ptj_code && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠ PTJ code not set. Go to <strong>Ministry Portal → Edit School</strong> and select the school's State — PTJ code will be auto-set.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Entry Flow</p>
              <p className="font-semibold text-slate-700">{flow === 'new' ? 'New Asset' : `Existing Asset — ${existingSubFlow === 'has_reg_no' ? 'Manual Reg No' : 'Auto Generate'}`}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Form Type</p>
              <p className="font-semibold text-slate-700">
                {form.assetType === 'H' ? 'KEW.PA-3 — Harta Modal (≥ RM 2,000)' :
                 form.assetType === 'R' ? 'KEW.PA-4 — Aset Alih Bernilai Rendah (< RM 2,000)' :
                 'Determined by acquisition price'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 2 — Identification */}
      {activeSection === 2 && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-5">
          <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Asset Identification</h3>

          {/* Cascading classification dropdowns */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Klasifikasi Kod Aset Alih</p>

            <Field label="Kategori (Category)" required error={errors.category}>
              <select value={form.categoryCode} onChange={handleCategoryChange} disabled={isReadOnly}
                className={inputCls(!!errors.category)}>
                <option value="" disabled>— Pilih Kategori —</option>
                {categories.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Sub Kategori (Sub Category)">
              <select value={form.subCategoryCode} onChange={handleSubCategoryChange}
                disabled={isReadOnly || !form.categoryCode}
                className={`${inputCls(false)} ${!form.categoryCode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <option value="" disabled>— Pilih Sub Kategori —</option>
                {subcategories.map(s => (
                  <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Jenis Aset / Kod Nasional" hint="Auto-fills the 9-digit national code">
              <select value={form.nationalCode} onChange={handleAssetTypeChange}
                disabled={isReadOnly || !form.subCategoryCode}
                className={`${inputCls(false)} ${!form.subCategoryCode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <option value="" disabled>— Pilih Jenis Aset —</option>
                {assetTypeOptions.map(t => (
                  <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
                ))}
              </select>
            </Field>

            {form.nationalCode && (
              <div className="flex items-center gap-3 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-xs">
                <span className="font-bold text-teal-600">Kod Nasional:</span>
                <span className="font-mono font-bold text-teal-800">{form.nationalCode}</span>
              </div>
            )}
          </div>

          {/* Asset description + other fields */}
          <Field label="Keterangan Aset (Asset Description)" required error={errors.assetDescription}
            hint="Auto-filled from Jenis Aset — you can edit it">
            <input value={form.assetDescription} onChange={set('assetDescription')} disabled={isReadOnly}
              className={inputCls(!!errors.assetDescription)} placeholder="e.g. LAB BENCH" />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Buatan (Country of Origin)">
              <input value={form.countryOfOrigin} onChange={set('countryOfOrigin')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. Malaysia, China, USA" />
            </Field>
            <Field label="Jenama (Brand)">
              <input value={form.brand} onChange={set('brand')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. Dell, HP, Casio" />
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={set('model')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. Latitude 3420" />
            </Field>
            <Field label="No Casis / Siri Pembuat (Manufacturer Serial)">
              <input value={form.manufacturerSerial} onChange={set('manufacturerSerial')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. SN-4829301" />
            </Field>
          </div>
        </div>
      )}

      {/* Section 3 — Financial */}
      {activeSection === 3 && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Financial & Acquisition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Acquisition Price (RM)" required error={errors.acquisitionPrice}
              hint="≥ RM 2,000 → KEW.PA-3 (H)  |  < RM 2,000 → KEW.PA-4 (R)">
              <input type="number" step="0.01" min="0" value={form.acquisitionPrice}
                onChange={set('acquisitionPrice')} disabled={isReadOnly}
                className={inputCls(!!errors.acquisitionPrice)} placeholder="e.g. 3500.00" />
            </Field>
            <Field label="Asset Type (H / R)"
              hint={canOverrideType ? 'Auto-set by price. You may override.' : 'Auto-set by price. Cannot be overridden.'}>
              <select value={form.assetType} onChange={set('assetType')}
                disabled={isReadOnly || !canOverrideType}
                className={`${inputCls(false)} ${!canOverrideType ? 'bg-slate-50 cursor-not-allowed' : ''}`}>
                <option value="">— auto-classified by price —</option>
                <option value="H">H — Harta Modal (KEW.PA-3)</option>
                <option value="R">R — Aset Alih Bernilai Rendah (KEW.PA-4)</option>
              </select>
            </Field>
            <Field label="Acquisition Method">
              <select value={form.acquisitionMethod} onChange={set('acquisitionMethod')} disabled={isReadOnly}
                className={inputCls(false)}>
                <option value="Purchase">Purchase</option>
                <option value="Donation">Donation</option>
                <option value="Transfer">Transfer</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Received Date" required error={errors.receivedDate}>
              <input type="date" value={form.receivedDate} onChange={set('receivedDate')} disabled={isReadOnly}
                className={inputCls(!!errors.receivedDate)} />
            </Field>
            <Field label="Acquisition Date">
              <input type="date" value={form.acquisitionDate} onChange={set('acquisitionDate')} disabled={isReadOnly}
                className={inputCls(false)} />
            </Field>
            <Field label="Official Order No">
              <input value={form.officialOrderNo} onChange={set('officialOrderNo')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. LO/2026/001" />
            </Field>
            <Field label="Warranty Period">
              <input value={form.warrantyPeriod} onChange={set('warrantyPeriod')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. 1 Year, 36 Months" />
            </Field>
            <Field label="Supplier Name">
              <input value={form.supplierName} onChange={set('supplierName')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. Syarikat Teknologi Sdn Bhd" />
            </Field>
          </div>
        </div>
      )}

      {/* Section 4 — Placement */}
      {activeSection === 4 && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Placement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Location / Room" required error={errors.locationId}>
                <select value={form.locationId} onChange={set('locationId')} disabled={isReadOnly}
                  className={inputCls(!!errors.locationId)}>
                  <option value="" disabled>— Select a room —</option>
                  {rooms.map(r => (
                    <option key={r.location_id} value={r.location_id}>
                      {locationPaths[r.location_id] || r.location_name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="CSP Height (cm)" hint="Shelf/table height above room floor where asset sits">
              <input type="number" min="0" value={form.cspHeight} onChange={set('cspHeight')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="e.g. 80" />
            </Field>
            <Field label="Placement Date">
              <input type="date" value={form.placementDate} onChange={set('placementDate')} disabled={isReadOnly}
                className={inputCls(false)} />
            </Field>
            <Field label="Responsible Officer">
              <input value={form.responsibleOfficer} onChange={set('responsibleOfficer')} disabled={isReadOnly}
                className={inputCls(false)} placeholder="Officer responsible for this asset" />
            </Field>
          </div>
        </div>
      )}

      {/* Section 5 — Additional */}
      {activeSection === 5 && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-5">
          <h3 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Additional Details</h3>
          <Field label="Criticality Level" hint="1 = Low importance  ·  5 = Most critical (prioritised during flood evacuation)">
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                  onClick={() => !isReadOnly && setForm(prev => ({ ...prev, criticalityLevel: n }))}
                  className={`text-3xl transition-transform hover:scale-110 ${n <= form.criticalityLevel ? 'text-amber-400' : 'text-slate-200'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                  ★
                </button>
              ))}
              <span className="ml-3 text-sm font-bold text-slate-600">Level {form.criticalityLevel}</span>
            </div>
          </Field>
          <Field label="Specifications / Notes">
            <textarea value={form.specifications} onChange={set('specifications')} disabled={isReadOnly}
              rows={3} className={`${inputCls(false)} resize-none`}
              placeholder="Additional specifications, notes, or remarks..." />
          </Field>
          <Field label="Asset Image" hint="JPG or PNG, max 5MB. Uploaded on save.">
            {!isReadOnly && (
              <input type="file" accept="image/jpeg,image/png"
                onChange={e => {
                  const file = e.target.files[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB.'); return }
                  setImageFile(file)
                  const reader = new FileReader()
                  reader.onload = ev => setImagePreview(ev.target.result)
                  reader.readAsDataURL(file)
                }}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 border border-slate-300 p-2 rounded-lg bg-white" />
            )}
            {imagePreview && (
              <div className="mt-3 space-y-1">
                <img src={imagePreview} alt="Preview" className="w-40 h-40 object-cover rounded-lg border-2 border-slate-200" />
                {!isReadOnly && (
                  <button onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="text-xs text-red-500 hover:underline">Remove</button>
                )}
              </div>
            )}
          </Field>
        </div>
      )}

      {/* Section navigation */}
      <div className="flex justify-between mt-4">
        <button onClick={() => setActiveSection(s => Math.max(1, s - 1))} disabled={activeSection === 1}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30">
          ← Previous
        </button>
        <button onClick={() => setActiveSection(s => Math.min(5, s + 1))} disabled={activeSection === 5}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-30">
          Next →
        </button>
      </div>

      {/* Sticky save bar */}
      {canRegister && (
        <div className="fixed bottom-0 left-0 md:left-72 right-0 bg-white border-t border-slate-200 px-4 md:px-10 py-4 z-40 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm">
              {submitError
                ? <span className="text-red-600 font-medium">⚠ {submitError}</span>
                : errorCount > 0
                ? <span className="text-amber-600 font-medium">⚠ {errorCount} required field{errorCount > 1 ? 's' : ''} missing</span>
                : form.assetType
                ? <span className="text-slate-500">Ready to register as <strong className={form.assetType === 'H' ? 'text-green-700' : 'text-blue-700'}>{form.assetType === 'H' ? 'KEW.PA-3 Harta Modal' : 'KEW.PA-4 Aset Alih Bernilai Rendah'}</strong></span>
                : <span className="text-slate-400">Enter acquisition price (Section 3) to classify asset type.</span>
              }
            </div>
            <button onClick={handleSave} disabled={saving}
              className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {saving ? 'Registering...' : '💾 Register Asset'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
