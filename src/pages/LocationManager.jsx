import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useLocations, addLocation, getCumulativeElevation } from '../hooks/useLocations'
import LocationTreeNode from '../components/LocationTreeNode'

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

  // ── Superadmin: school picker (no school selected yet) ──
  if (isSuperadmin && !selectedSchoolId) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Location Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select a school to view and manage its location hierarchy.
          </p>
        </div>

        {schoolsLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            Loading schools...
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-xl">
            <p className="text-lg font-medium">No schools in the database.</p>
            <p className="text-sm mt-1">Add schools via Ministry Management first.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {schools.map(school => (
              <button
                key={school.school_id}
                onClick={() => handleSelectSchool(school)}
                className="w-full text-left p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{school.school_name}</p>
                    {school.school_code && (
                      <p className="text-xs text-slate-400 mt-0.5">{school.school_code}</p>
                    )}
                  </div>
                  <span className="text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                    Manage →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Location tree (headmaster, or superadmin after selecting a school) ──
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading location tree...</div>
    </div>
  )

  if (error) return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg">Error: {error}</div>
  )

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-5">
        {isSuperadmin && (
          <button
            onClick={handleBackToSchools}
            className="text-sm text-teal-600 hover:text-teal-700 mb-2 flex items-center gap-1"
          >
            ← Back to Schools
          </button>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Location Manager</h1>
            {isSuperadmin && selectedSchoolName && (
              <p className="text-sm font-medium text-teal-600 mt-0.5">{selectedSchoolName}</p>
            )}
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Manage the school's physical location hierarchy for flood risk calculation.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={handleAddBlock}
              className="flex-shrink-0 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
            >
              + Add Block
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="px-2 py-1 rounded border bg-blue-100 text-blue-800 border-blue-300">Block</span>
        <span className="px-2 py-1 rounded border bg-green-100 text-green-800 border-green-300">Floor</span>
        <span className="px-2 py-1 rounded border bg-yellow-100 text-yellow-800 border-yellow-300">Room</span>
        <span className="px-2 py-1 rounded bg-emerald-500 text-white">✓ Safe Zone</span>
      </div>

      {/* Tree */}
      {tree.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-xl">
          <p className="text-lg">No locations yet.</p>
          {canEdit && (
            <p className="text-sm mt-1">Click <strong>+ Add Block</strong> to get started.</p>
          )}
        </div>
      ) : (
        <div>
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

      {/* Add Node Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">
              {parentNode
                ? `Add ${getChildType(parentNode)} to "${parentNode.location_name}"`
                : 'Add New Block'}
            </h2>

            {formError && (
              <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm rounded">{formError}</div>
            )}

            {/* Location Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.location_name}
                onChange={e => setForm({ ...form, location_name: e.target.value })}
                placeholder={
                  form.location_type === 'block' ? 'e.g. Block A' :
                  form.location_type === 'floor' ? 'e.g. Ground Floor' : 'e.g. Room 101'
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Elevation Offset */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Elevation Offset (cm)
              </label>
              <input
                type="number"
                value={form.elevation_offset}
                onChange={e => setForm({ ...form, elevation_offset: e.target.value })}
                min="0"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                {form.location_type === 'block' && "Height of this block's ground above school reference point."}
                {form.location_type === 'floor' && 'Height above the block ground. Standard = 300cm per floor.'}
                {form.location_type === 'room' && 'Usually 0cm — only change if room is on a raised platform.'}
              </p>
            </div>

            {/* Is Safe Zone */}
            <div className="mb-6 flex items-center gap-3">
              <input
                type="checkbox"
                id="is_safe_zone"
                checked={form.is_safe_zone}
                onChange={e => setForm({ ...form, is_safe_zone: e.target.checked })}
                className="w-4 h-4 accent-emerald-500"
              />
              <label htmlFor="is_safe_zone" className="text-sm text-gray-700">
                Mark as Safe Zone (valid evacuation destination)
              </label>
            </div>

            {/* Cumulative elevation preview */}
            {parentNode && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                <strong>Estimated absolute elevation:</strong>{' '}
                {getCumulativeElevation(parentNode, locations) + Number(form.elevation_offset)}cm above school ground
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
