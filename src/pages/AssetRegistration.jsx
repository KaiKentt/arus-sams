import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
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
} from '../hooks/useAssets';

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import { 
  CheckCircleIcon, 
  PrinterIcon, 
  PlusIcon,
} from "@heroicons/react/24/outline";

import AssetBasicDetails from "./AssetBasicDetails";
import AssetAdditionalDetails from "./AssetAdditionalDetails";
import AssetImageUpload from "./AssetImageUpload";

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
  assetDescription: '',
};

// ── Component sub-form (shown after parent asset is saved)
function ComponentForm({ parentAsset, componentCount, onAdd }) {
  const [desc, setDesc] = useState('');
  const [serial, setSerial] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const handleAdd = async () => {
    if (!desc.trim()) { setErr('Component description is required.'); return; }
    setSaving(true);
    setErr(null);
    const suffix = componentCount + 1;
    const compRegNo = `${parentAsset.registration_no}-${suffix}`;
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
      });
      await insertLogHistory(supabase, {
        assetId: compRegNo,
        staffId: parentAsset.staff_id,
        logDetails: `Component registered: ${desc} (${compRegNo}) under ${parentAsset.registration_no}`,
      });
      onAdd({ regNo: compRegNo, description: desc });
      setDesc('');
      setSerial('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-slate-100">
      {err && <p className="text-xs text-red-500 font-bold">Error: {err}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          label="Component Description"
          value={desc} 
          onChange={e => setDesc(e.target.value)}
          placeholder="e.g. Monitor, Keyboard, CPU" 
        />
        <Input 
          label="Manufacturer Serial (optional)"
          value={serial} 
          onChange={e => setSerial(e.target.value)}
          placeholder="e.g. SN-123456" 
        />
      </div>
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
        <span className="text-xs text-slate-500 font-mono">
          Registration: <strong className="text-teal-700">{parentAsset.registration_no}-{componentCount + 1}</strong>
        </span>
        <Button onClick={handleAdd} disabled={saving} variant="primary">
          {saving ? 'Adding...' : 'Add Component'}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page
export default function AssetRegistration({ user, schoolId, userRole, navigate }) {
  const [flow, setFlow] = useState('new');
  const [existingSubFlow, setExistingSubFlow] = useState('has_reg_no');
  const [form, setForm] = useState(INITIAL_FORM);
  const [previewRegNo, setPreviewRegNo] = useState('');
  const [schoolData, setSchoolData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [locationPaths, setLocationPaths] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [savedAsset, setSavedAsset] = useState(null);
  const [savedQrDataUrl, setSavedQrDataUrl] = useState(null);
  const [addedComponents, setAddedComponents] = useState([]);
  const [showComponentForm, setShowComponentForm] = useState(false);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [assetTypeOptions, setAssetTypeOptions] = useState([]);

  const canRegister = userRole === 'asset_teacher' || userRole === 'superadmin' || userRole === 'headmaster';
  const isReadOnly = !canRegister;

  const handleCancel = () => {
    const hasInput = Object.values(form).some(val => val !== '' && val !== 3 && val !== 'Purchase');
    if (hasInput) {
      if (window.confirm("Are you sure you want to cancel? All entered data will be lost.")) {
        if (typeof navigate === 'function') {
          navigate("asset-master-list");
        } else {
          window.history.back();
        }
      }
    } else {
      if (typeof navigate === 'function') {
        navigate("asset-master-list");
      } else {
        window.history.back();
      }
    }
  };

  const handleInputChange = (field) => (e) => {
    const value = e.target?.value !== undefined ? e.target.value : e;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (code) => {
    const cat = categories.find(c => c.code === code);
    setForm(prev => ({ ...prev, categoryCode: code, category: cat?.name || '', subCategoryCode: '', subCategory: '', nationalCode: '' }));
    setSubcategories([]);
    setAssetTypeOptions([]);
    fetchSubcategories(code).then(setSubcategories).catch(err => console.error(err));
  };

  const handleSubCategoryChange = (code) => {
    const sub = subcategories.find(s => s.code === code);
    setForm(prev => ({ ...prev, subCategoryCode: code, subCategory: sub?.name || '', nationalCode: '' }));
    setAssetTypeOptions([]);
    fetchAssetTypeRefs(code).then(setAssetTypeOptions).catch(err => console.error(err));
  };

  useEffect(() => {
    if (!schoolId) return;
    fetchSchoolCodes(schoolId).then(setSchoolData).catch(() => {});
    fetchRoomLocations(schoolId).then(({ rooms, paths }) => {
      setRooms(rooms);
      setLocationPaths(paths);
    }).catch(() => {});
  }, [schoolId]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const price = parseFloat(form.acquisitionPrice);
    if (!isNaN(price) && form.acquisitionPrice !== '') {
      setForm(prev => ({ ...prev, assetType: price >= 2000 ? 'H' : 'R' }));
    } else if (form.acquisitionPrice === '') {
      setForm(prev => ({ ...prev, assetType: '' }));
    }
  }, [form.acquisitionPrice]);

  useEffect(() => {
    const needsGeneration = flow === 'new' || (flow === 'existing' && existingSubFlow === 'no_reg_no');
    if (!needsGeneration) {
      setPreviewRegNo(form.manualRegNo.trim().toUpperCase() || '—');
      return;
    }
    if (!schoolData || !form.assetType) { setPreviewRegNo('—'); return; }
    if (!schoolData.ptj_code || !schoolData.school_code) { setPreviewRegNo('Incomplete school profile'); return; }
    
    const year = new Date().getFullYear().toString().slice(-2);
    const runningField = form.assetType === 'H' ? 'last_running_h' : 'last_running_r';
    const nextNo = (schoolData[runningField] || 0) + 1;
    const runningNo = String(nextNo).padStart(3, '0');
    setPreviewRegNo(`KPM/${schoolData.ptj_code}/${schoolData.school_code}/${form.assetType}/${year}/${runningNo}`);
  }, [schoolData, form.assetType, flow, existingSubFlow, form.manualRegNo]);

  if (userRole === 'standard_teacher') {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center p-10 bg-white rounded-2xl shadow border border-red-100">
        <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm">Asset Registration is restricted to authorized roles only.</p>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (!form.assetDescription.trim()) e.assetDescription = 'Asset description is required.';
    if (!form.category.trim()) e.category = 'Category is required.';
    if (!form.acquisitionPrice || isNaN(parseFloat(form.acquisitionPrice))) e.acquisitionPrice = 'Valid acquisition price is required.';
    if (!form.receivedDate) e.receivedDate = 'Received date is required.';
    if (!form.locationId) e.locationId = 'Location is required.';
    if (flow === 'existing' && existingSubFlow === 'has_reg_no' && !form.manualRegNo.trim()) {
      e.manualRegNo = 'Required for existing assets.';
    }
    setErrors(e);
    return e;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSubmitError(null);

    try {
      let finalRegNo;
      let runningField = null;
      let currentNo = null;
      const needsGeneration = flow === 'new' || (flow === 'existing' && existingSubFlow === 'no_reg_no');

      if (needsGeneration) {
        const generated = await generateRegistrationNo(supabase, schoolId, form.assetType);
        finalRegNo = generated.regNo;
        runningField = generated.runningField;
        currentNo = generated.currentNo;
      } else {
        finalRegNo = form.manualRegNo.trim().toUpperCase();
      }

      const { qrId, newNumber: qrNewNumber } = await generateQrId(supabase, schoolId);

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadAssetImage(supabase, imageFile, finalRegNo.replace(/\//g, '-'));
      }

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
      });

      let generatedQrDataUrl = null;
      try {
        const qrResult = await generateAndSaveQR(supabase, saved.asset_id, qrId);
        generatedQrDataUrl = qrResult.qrDataUrl;
      } catch (qrErr) {
        console.error('QR generation failed:', qrErr.message);
      }

      if (generatedQrDataUrl) await incrementQrCounter(supabase, schoolId, qrNewNumber);
      if (runningField && currentNo) {
        await incrementRunningNo(supabase, schoolId, runningField, currentNo);
        setSchoolData(prev => ({ ...prev, [runningField]: currentNo }));
      }

      await insertLogHistory(supabase, {
        assetId: finalRegNo,
        staffId: user.id,
        logDetails: `Asset registered: ${form.assetDescription}`,
      });

      setSavedQrDataUrl(generatedQrDataUrl);
      setSavedAsset({ ...saved, qr_code_id: generatedQrDataUrl ? qrId : null });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setFlow('new');
    setSavedAsset(null);
    setImagePreview(null);
    setImageFile(null);
    setAddedComponents([]);
    setShowComponentForm(false);
    setErrors({});
  };

  const handlePrintQR = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Label — ${savedAsset.qr_code_id}</title>
      <style>body { font-family: monospace; text-align: center; padding: 40px; } img { width: 300px; height: 300px; } </style></head><body>
      <img src="${savedQrDataUrl}" /><div style="font-size:20px; font-weight:bold">${savedAsset.qr_code_id}</div>
      <div>${savedAsset.registration_no}</div><div>${savedAsset.asset_name}</div>
      <script>window.onload = () => { window.print(); }</script></body></html>
    `);
    win.document.close();
  };

  if (savedAsset) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20 mt-10">
        <Card className="p-8 text-center border-green-200 shadow-lg">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Asset Registered Successfully</h2>
          <p className="text-slate-500 mb-8">{savedAsset.asset_name}</p>
          
          {savedQrDataUrl && (
            <div className="flex flex-col items-center gap-3 mb-8">
              <img src={savedQrDataUrl} alt="QR Code" className="w-52 h-52 border-4 border-slate-50 rounded-2xl shadow-inner" />
              <p className="font-mono font-bold text-teal-700 tracking-[0.2em] text-lg">{savedAsset.qr_code_id}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            <Button onClick={handlePrintQR} variant="secondary">
              <PrinterIcon className="w-5 h-5 mr-2" />
              Print Label
            </Button>
            <Button onClick={handleReset} variant="primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Register Another
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Accessories & Components</h3>
            {!showComponentForm && (
              <Button onClick={() => setShowComponentForm(true)} variant="primary" className="px-4 py-2 text-sm">
                Add Component
              </Button>
            )}
          </div>
          {addedComponents.length > 0 && (
            <ul className="divide-y divide-slate-100 mb-6 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
              {addedComponents.map((c, i) => (
                <li key={i} className="px-4 py-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-700">{c.description}</span>
                  <span className="font-mono text-teal-700 font-bold bg-white px-2 py-1 rounded border border-teal-100">{c.regNo}</span>
                </li>
              ))}
            </ul>
          )}
          {showComponentForm && (
            <ComponentForm
              parentAsset={savedAsset}
              componentCount={addedComponents.length}
              onAdd={c => { setAddedComponents(prev => [...prev, c]); setShowComponentForm(false); }}
            />
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6 relative">
      {/* HEADER BANNER */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              Asset Registration
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Add physical assets under KEW.PA-3 or KEW.PA-4 standards.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Entry Configuration</p>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
              {['new', 'existing'].map(f => (
                <button 
                  key={f} 
                  onClick={() => !isReadOnly && setFlow(f)}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${flow === f ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f === 'new' ? 'New Asset' : 'Existing Asset'}
                </button>
              ))}
            </div>
            
            {flow === 'existing' && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" checked={existingSubFlow === 'has_reg_no'} onChange={() => setExistingSubFlow('has_reg_no')} className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300" />
                    <span className="text-sm font-bold text-slate-700 group-hover:text-teal-700 transition-colors">Manual Registry Entry</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="radio" checked={existingSubFlow === 'no_reg_no'} onChange={() => setExistingSubFlow('no_reg_no')} className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300" />
                    <span className="text-sm font-bold text-slate-700 group-hover:text-teal-700 transition-colors">Auto-Generate ID</span>
                  </label>
                </div>
                {existingSubFlow === 'has_reg_no' && (
                  <div className="pt-2">
                    <Input 
                      label="Manual Registration No."
                      value={form.manualRegNo} 
                      onChange={handleInputChange('manualRegNo')}
                      className="font-mono uppercase tracking-wider"
                      placeholder="KPM/JPNS/SKRP/H/25/001" 
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="bg-teal-900 rounded-2xl p-6 text-white shadow-xl shadow-teal-900/20 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-800 rounded-full opacity-20 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-teal-300 uppercase tracking-[0.2em]">Registry Preview</p>
                {form.assetType && (
                  <Badge variant="brand" className="bg-teal-500/20 text-teal-100 border-teal-500/30">
                    {form.assetType === 'H' ? 'KEW.PA-3' : 'KEW.PA-4'}
                  </Badge>
                )}
              </div>
              <p className="font-mono font-bold text-xl tracking-widest break-all leading-relaxed">{previewRegNo}</p>
            </div>
          </div>

          <AssetImageUpload 
            imagePreview={imagePreview} 
            setImagePreview={setImagePreview} 
            setImageFile={setImageFile}
            isReadOnly={isReadOnly}
          />
        </div>

        <div className="lg:col-span-2 space-y-8">
          <AssetBasicDetails 
            form={form} 
            errors={errors} 
            handleInputChange={handleInputChange}
            categories={categories}
            subcategories={subcategories}
            handleCategoryChange={handleCategoryChange}
            handleSubCategoryChange={handleSubCategoryChange}
            rooms={rooms}
            locationPaths={locationPaths}
            isReadOnly={isReadOnly}
          />
          
          <AssetAdditionalDetails 
            form={form} 
            errors={errors} 
            handleInputChange={handleInputChange}
            isReadOnly={isReadOnly}
          />

          {canRegister && (
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 pt-4">
              {submitError && <span className="text-red-600 text-sm font-bold md:mr-4">Error: {submitError}</span>}
              <div className="flex gap-3">
                <Button onClick={handleCancel} variant="secondary" className="px-8">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} variant="primary" className="px-8">
                  {saving ? "Registering..." : "Register Asset"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
