import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLocations, addLocation, getCumulativeElevation } from '../hooks/useLocations';
import LocationTreeNode from '../components/LocationTreeNode';

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  ChevronRightIcon, 
  CheckIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

// ── Sub-component: School Selection View (Superadmin) ────────────────────────
function SchoolSelectionView({ schools, loading, onSelect }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <ClockIcon className="w-8 h-8 animate-spin" />
        <p className="font-medium">Loading schools</p>
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="text-center py-20 px-6 bg-slate-50 border-2 border-dashed rounded-2xl border-slate-200">
        <BuildingOfficeIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-lg font-bold text-slate-600">No schools in database</p>
        <p className="text-sm text-slate-400 mt-2">Add schools via Ministry Management first.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {schools.map(school => (
        <Card key={school.school_id} className="group">
          <button
            onClick={() => onSelect(school)}
            className="w-full text-left p-5 hover:bg-slate-50 transition-all flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-slate-800 text-lg">{school.school_name}</p>
              {school.school_code && (
                <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-widest">{school.school_code}</p>
              )}
            </div>
            <ChevronRightIcon className="w-5 h-5 text-teal-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
          </button>
        </Card>
      ))}
    </div>
  );
}

// ── Sub-component: Location Legend ───────────────────────────────────────────
function LocationLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Hierarchy</p>
      <Badge variant="brand">Block</Badge>
      <Badge variant="warning">Floor</Badge>
      <Badge variant="neutral">Room</Badge>
      <div className="h-4 w-px bg-slate-200 mx-1"></div>
      <Badge variant="active" icon={CheckIcon}>Safe Zone</Badge>
    </div>
  );
}

// ── Sub-component: Add Location Modal ────────────────────────────────────────
function AddLocationModal({ parentNode, form, setForm, onSave, onCancel, saving, formError, locations, getCumulativeElevation, getChildType }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {parentNode
              ? `Add ${getChildType(parentNode)} to "${parentNode.location_name}"`
              : 'Add New Block'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg">
              {formError}
            </div>
          )}

          <Input
            label="Location Name"
            required
            value={form.location_name}
            onChange={e => setForm({ ...form, location_name: e.target.value })}
            placeholder={
              form.location_type === 'block' ? 'e.g. Block A' :
              form.location_type === 'floor' ? 'e.g. Ground Floor' : 'e.g. Room 101'
            }
          />

          <div>
            <Input
              label="Elevation Offset (cm)"
              type="number"
              value={form.elevation_offset}
              onChange={e => setForm({ ...form, elevation_offset: e.target.value })}
              min="0"
            />
            <p className="text-[11px] text-slate-400 mt-2 font-medium leading-relaxed">
              {form.location_type === 'block' && "Height of this block ground above school reference point."}
              {form.location_type === 'floor' && 'Height above the block ground. Standard = 300cm per floor.'}
              {form.location_type === 'room' && 'Usually 0cm — only change if room is on a raised platform.'}
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="is_safe_zone"
              checked={form.is_safe_zone}
              onChange={e => setForm({ ...form, is_safe_zone: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600"
            />
            <label htmlFor="is_safe_zone" className="text-sm font-bold text-slate-700 cursor-pointer">
              Mark as Safe Zone
            </label>
          </div>

          {parentNode && (
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Estimated Elevation</p>
              <p className="text-sm font-bold text-teal-900">
                {getCumulativeElevation(parentNode, locations) + Number(form.elevation_offset)}cm above ground
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving} variant="primary" className="flex-1">
              {saving ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function LocationManager({ user, schoolId }) {
  const isSuperadmin = !schoolId

  // Superadmin school picker state
  const [schools, setSchools] = useState([])
  const [schoolsLoading, setSchoolsLoading] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState(null)
  const [selectedSchoolName, setSelectedSchoolName] = useState(null)

  const effectiveSchoolId = schoolId || selectedSchoolId

  const { locations, tree, loading, error, reload } = useLocations(effectiveSchoolId)
  const canEdit = user?.role === 'headmaster' || user?.role === 'superadmin' || user?.role === 'asset_teacher'

  // Add node modal state
  const [showModal, setShowModal] = useState(false)
  const [parentNode, setParentNode] = useState(null)
  const [form, setForm] = useState({
    location_name: '',
    location_type: 'block',
    elevation_offset: 0,
    is_safe_zone: false,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Fetch all schools for superadmin picker
  useEffect(() => {
    if (!isSuperadmin) return
    setSchoolsLoading(true)
    supabase
      .from('schools')
      .select('school_id, school_name, school_code')
      .order('school_name')
      .then(({ data }) => {
        if (data) setSchools(data)
        setSchoolsLoading(false)
      })
  }, [isSuperadmin])

  const handleSelectSchool = (school) => {
    setSelectedSchoolId(school.school_id)
    setSelectedSchoolName(school.school_name)
  }

  const handleBackToSchools = () => {
    setSelectedSchoolId(null)
    setSelectedSchoolName(null)
    setShowModal(false)
  }

  const getChildType = (parent) => {
    if (!parent) return 'block'
    if (parent.location_type === 'block') return 'floor'
    if (parent.location_type === 'floor') return 'room'
    return 'room'
  }

  const handleAddChild = (parentNodeObj) => {
    setParentNode(parentNodeObj)
    setForm({
      location_name: '',
      location_type: getChildType(parentNodeObj),
      elevation_offset: parentNodeObj?.location_type === 'block' ? 300 : 0,
      is_safe_zone: false,
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleAddBlock = () => {
    setParentNode(null)
    setForm({ location_name: '', location_type: 'block', elevation_offset: 0, is_safe_zone: false })
    setFormError(null)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.location_name.trim()) {
      setFormError('Location name is required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await addLocation({
        location_name: form.location_name.trim(),
        location_type: form.location_type,
        elevation_offset: Number(form.elevation_offset),
        parent_location_id: parentNode?.location_id || null,
        is_safe_zone: form.is_safe_zone,
        school_id: effectiveSchoolId,
      })
      setShowModal(false)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render Logic ───────────────────────────────────────────────────────────

  if (isSuperadmin && !selectedSchoolId) {
    return (
      <div className="w-full max-w-7xl p-4 md:p-8 py-10">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Location Manager</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Select a school to manage its infrastructure and risk zones.
          </p>
        </div>
        <SchoolSelectionView 
          schools={schools} 
          loading={schoolsLoading} 
          onSelect={handleSelectSchool} 
        />
      </div>
    )
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <ClockIcon className="w-10 h-10 text-teal-600 animate-spin" />
      <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Generating Tree</p>
    </div>
  )
  
  if (error) return (
    <div className="max-w-2xl mx-auto mt-20 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
      <div className="bg-red-500 p-2 rounded-lg">
        <MapPinIcon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-red-800 font-bold">System Error</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-7xl p-4 md:p-8 pb-28 fade-in">
      
      {/* 1. Integrated Header (Fixed Flex Alignment) */}
      <div className="mb-8">
        {isSuperadmin && (
          <Button 
            variant="secondary" 
            onClick={handleBackToSchools} 
            className="mb-6 h-9 px-3 text-xs"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5 mr-1" />
            Back to Schools
          </Button>
        )}
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Location Manager</h1>
            {isSuperadmin && selectedSchoolName && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="brand">{selectedSchoolName}</Badge>
              </div>
            )}
            <p className="text-sm text-slate-500 mt-2">
              Configure the physical location hierarchy for flood risk calculation and infrastructure mapping.
            </p>
          </div>
          
          {canEdit && (
            <Button onClick={handleAddBlock} variant="primary" className="shadow-md shadow-teal-600/20 whitespace-nowrap">
              <PlusIcon className="w-5 h-5 mr-1" />
              Add Block
            </Button>
          )}
        </div>
      </div>

      <LocationLegend />

      {tree.length === 0 ? (
        <div className="text-center py-24 px-6 bg-slate-50 border-2 border-dashed rounded-3xl border-slate-200">
          <MapPinIcon className="w-16 h-16 text-slate-300 mx-auto mb-6" />
          <p className="text-xl font-bold text-slate-700">Infrastructure Empty</p>
          {canEdit && (
            <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
              No blocks or rooms have been mapped. Start by adding a building block.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tree.map(node => (
            <LocationTreeNode
              key={node.location_id}
              node={node}
              flatList={locations}
              onReload={reload}
              onAddChild={handleAddChild}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddLocationModal 
          parentNode={parentNode}
          form={form}
          setForm={setForm}
          onSave={handleSubmit}
          onCancel={() => setShowModal(false)}
          saving={saving}
          formError={formError}
          locations={locations}
          getCumulativeElevation={getCumulativeElevation}
          getChildType={getChildType}
        />
      )}
    </div>
  )
}