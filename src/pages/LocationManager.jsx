import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  useLocations,
  addLocation,
  updateLocation,
  getCumulativeElevation,
  autoConfigureSafeZones,
  SAFE_ZONE_THRESHOLD_CM,
} from '../hooks/useLocations';
import LocationTreeNode from '../components/LocationTreeNode';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import {
  ArrowLeftIcon,
  PlusIcon,
  ChevronRightIcon,
  CheckIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ClockIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

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
                <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-widest">
                  {school.school_code}
                </p>
              )}
            </div>
            <ChevronRightIcon className="w-5 h-5 text-teal-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
          </button>
        </Card>
      ))}
    </div>
  );
}

// ── Sub-component: Location Legend & Filter Bar ──────────────────────────────
function LocationToolbar({ searchTerm, setSearchTerm, riskFilter, setRiskFilter }) {
  const filters = [
    { id: 'ALL', label: 'All Locations' },
    { id: 'SAFE', label: 'Safe Zones' },
    { id: 'RISK', label: `Flood-Risk (<${SAFE_ZONE_THRESHOLD_CM}cm)` },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
          Hierarchy
        </p>
        <Badge variant="brand">Block</Badge>
        <Badge variant="warning">Floor</Badge>
        <Badge variant="neutral">Room</Badge>
        <div className="h-4 w-px bg-slate-200 mx-1" />
        <Badge variant="active" icon={CheckIcon}>
          Safe Zone (≥{SAFE_ZONE_THRESHOLD_CM}cm)
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex bg-white p-1 rounded-lg border border-slate-200">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setRiskFilter(f.id)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                riskFilter === f.id
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search block or room..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: Add / Edit Location Modal ─────────────────────────────────
function LocationFormModal({
  mode,
  parentNode,
  editingNode,
  form,
  setForm,
  manualSafeOverride,
  setManualSafeOverride,
  onSave,
  onCancel,
  saving,
  formError,
  locations,
  getChildType,
}) {
  const isRoom = form.location_type === 'room';

  // Calculate live cumulative elevation preview for both Add and Edit modes
  const baseElevation = useMemo(() => {
    if (mode === 'edit' && editingNode) {
      if (!editingNode.parent_location_id) return 0;
      const parent = locations.find(l => l.location_id === editingNode.parent_location_id);
      return getCumulativeElevation(parent, locations);
    }
    return parentNode ? getCumulativeElevation(parentNode, locations) : 0;
  }, [mode, editingNode, parentNode, locations]);

  const previewCumulative = baseElevation + (Number(form.elevation_offset) || 0);
  const qualifiesByElevation = isRoom && previewCumulative >= SAFE_ZONE_THRESHOLD_CM;

  // Automatically toggle Safe Zone when room elevation crosses >= 300cm unless manually overridden
  const handleElevationChange = rawVal => {
    const nextElevation = baseElevation + (Number(rawVal) || 0);
    setForm(prev => ({
      ...prev,
      elevation_offset: rawVal,
      is_safe_zone:
        isRoom && !manualSafeOverride
          ? nextElevation >= SAFE_ZONE_THRESHOLD_CM
          : prev.is_safe_zone,
    }));
  };

  const modalTitle =
    mode === 'edit'
      ? `Edit ${editingNode?.location_type}: "${editingNode?.location_name}"`
      : parentNode
      ? `Add ${getChildType(parentNode)} to "${parentNode.location_name}"`
      : 'Add New Block';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">{modalTitle}</h2>
        </div>

        <div className="p-6 space-y-5">
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
              form.location_type === 'block'
                ? 'e.g. Block A'
                : form.location_type === 'floor'
                ? 'e.g. Ground Floor'
                : 'e.g. Cempaka 1'
            }
          />

          <div>
            <Input
              label="Elevation Offset (cm)"
              type="number"
              value={form.elevation_offset}
              onChange={e => handleElevationChange(e.target.value)}
              min="0"
            />
            <p className="text-[11px] text-slate-400 mt-2 font-medium leading-relaxed">
              {form.location_type === 'block' &&
                'Height of this block ground above school reference point.'}
              {form.location_type === 'floor' &&
                'Height above block ground (Ground Floor = 0cm, Level 1 = 300cm, Level 2 = 600cm).'}
              {form.location_type === 'room' &&
                'Usually 0cm — only change if the room sits on a raised platform.'}
            </p>
          </div>

          <div className="p-4 bg-teal-50 rounded-xl border border-teal-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">
                Cumulative Elevation
              </p>
              <p className="text-sm font-bold text-teal-900">
                {previewCumulative}cm above ground
              </p>
            </div>
            {isRoom && (
              <Badge variant={qualifiesByElevation ? 'active' : 'warning'}>
                {qualifiesByElevation ? 'Safe Elevation' : 'Flood-Risk Level'}
              </Badge>
            )}
          </div>

          {/* Safe Zone Toggle — Only applicable to Rooms */}
          {isRoom && (
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                form.is_safe_zone
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_safe_zone"
                  checked={form.is_safe_zone}
                  onChange={e => {
                    setManualSafeOverride(true);
                    setForm({ ...form, is_safe_zone: e.target.checked });
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600"
                />
                <label
                  htmlFor="is_safe_zone"
                  className="text-sm font-bold text-slate-800 cursor-pointer"
                >
                  Designate as Evacuation Safe Zone
                </label>
              </div>

              <p className="text-[11px] text-slate-600 pl-8 leading-relaxed">
                {qualifiesByElevation && form.is_safe_zone
                  ? `Auto-selected because cumulative height is ≥ ${SAFE_ZONE_THRESHOLD_CM}cm. Uncheck if this room is a washroom, chemical store, or unsuitable for equipment.`
                  : !qualifiesByElevation && form.is_safe_zone
                  ? `Warning: This room is below ${SAFE_ZONE_THRESHOLD_CM}cm and may flood during high water.`
                  : `Rooms below ${SAFE_ZONE_THRESHOLD_CM}cm default to non-safe zones so assets are routed upstairs.`}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button onClick={onCancel} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving} variant="primary" className="flex-1">
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Save Location'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Helper: Recursive Tree Filter ────────────────────────────────────────────
function filterLocationTree(nodes, flatList, searchTerm, riskFilter) {
  const query = searchTerm.trim().toLowerCase();

  return nodes
    .map(node => {
      const filteredChildren = node.children
        ? filterLocationTree(node.children, flatList, searchTerm, riskFilter)
        : [];

      const matchesSearch =
        !query || node.location_name.toLowerCase().includes(query);

      const isRoom = node.location_type === 'room';
      const cumulative = getCumulativeElevation(node, flatList);

      let matchesRisk = true;
      if (riskFilter === 'SAFE') {
        matchesRisk = isRoom && Boolean(node.is_safe_zone);
      } else if (riskFilter === 'RISK') {
        matchesRisk = isRoom && cumulative < SAFE_ZONE_THRESHOLD_CM;
      }

      const selfMatches = matchesSearch && matchesRisk;

      if (selfMatches || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    })
    .filter(Boolean);
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function LocationManager({ user, schoolId }) {
  const isSuperadmin = !schoolId;

  // Superadmin school picker state
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [selectedSchoolName, setSelectedSchoolName] = useState(null);

  const effectiveSchoolId = schoolId || selectedSchoolId;

  const { locations, tree, loading, error, reload } = useLocations(effectiveSchoolId);
  const canEdit =
    user?.role === 'headmaster' ||
    user?.role === 'superadmin' ||
    user?.role === 'asset_teacher';

  // Live asset occupancy counts per room
  const [directAssetCounts, setDirectAssetCounts] = useState({});
  const [tempSafeZoneCounts, setTempSafeZoneCounts] = useState({});

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Add / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [parentNode, setParentNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [manualSafeOverride, setManualSafeOverride] = useState(false);
  const [form, setForm] = useState({
    location_name: '',
    location_type: 'block',
    elevation_offset: 0,
    is_safe_zone: false,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const showToast = msg => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchAssetOccupancy = useCallback(async () => {
    if (!effectiveSchoolId) return;
    const { data, error: assetErr } = await supabase
      .from('assets')
      .select('asset_id, location_id, home_location_id')
      .eq('school_id', effectiveSchoolId);

    if (!assetErr && data) {
      const direct = {};
      const temp = {};
      data.forEach(a => {
        if (a.location_id) {
          direct[a.location_id] = (direct[a.location_id] || 0) + 1;
          if (a.home_location_id) {
            temp[a.location_id] = (temp[a.location_id] || 0) + 1;
          }
        }
      });
      setDirectAssetCounts(direct);
      setTempSafeZoneCounts(temp);
    }
  }, [effectiveSchoolId]);

  useEffect(() => {
    fetchAssetOccupancy();
  }, [fetchAssetOccupancy, locations]);

  // Fetch all schools for superadmin picker
  useEffect(() => {
    if (!isSuperadmin) return;
    setSchoolsLoading(true);
    supabase
      .from('schools')
      .select('school_id, school_name, school_code')
      .order('school_name')
      .then(({ data }) => {
        if (data) setSchools(data);
        setSchoolsLoading(false);
      });
  }, [isSuperadmin]);

  const handleSelectSchool = school => {
    setSelectedSchoolId(school.school_id);
    setSelectedSchoolName(school.school_name);
  };

  const handleBackToSchools = () => {
    setSelectedSchoolId(null);
    setSelectedSchoolName(null);
    setShowModal(false);
  };

  const getChildType = parent => {
    if (!parent) return 'block';
    if (parent.location_type === 'block') return 'floor';
    if (parent.location_type === 'floor') return 'room';
    return 'room';
  };

  const handleAddChild = parentNodeObj => {
    const childType = getChildType(parentNodeObj);
    let defaultOffset = 0;

    // Smart floor elevation default: 1st floor = 0cm (Ground), 2nd = 300cm, 3rd = 600cm
    if (childType === 'floor' && parentNodeObj) {
      const existingFloors = locations.filter(
        l => l.parent_location_id === parentNodeObj.location_id
      ).length;
      defaultOffset = existingFloors * 300;
    }

    const predictedElevation =
      getCumulativeElevation(parentNodeObj, locations) + defaultOffset;
    const autoSafe =
      childType === 'room' && predictedElevation >= SAFE_ZONE_THRESHOLD_CM;

    setModalMode('add');
    setEditingNode(null);
    setParentNode(parentNodeObj);
    setManualSafeOverride(false);
    setForm({
      location_name: '',
      location_type: childType,
      elevation_offset: defaultOffset,
      is_safe_zone: autoSafe,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleAddBlock = () => {
    setModalMode('add');
    setEditingNode(null);
    setParentNode(null);
    setManualSafeOverride(false);
    setForm({
      location_name: '',
      location_type: 'block',
      elevation_offset: 0,
      is_safe_zone: false,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleEditNode = node => {
    setModalMode('edit');
    setEditingNode(node);
    setParentNode(null);
    setManualSafeOverride(true); // Preserve existing safe-zone choice unless user changes it
    setForm({
      location_name: node.location_name,
      location_type: node.location_type,
      elevation_offset: node.elevation_offset ?? 0,
      is_safe_zone: Boolean(node.is_safe_zone),
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.location_name.trim()) {
      setFormError('Location name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === 'edit' && editingNode) {
        await updateLocation(editingNode.location_id, {
          location_name: form.location_name.trim(),
          elevation_offset: Number(form.elevation_offset),
          is_safe_zone:
            editingNode.location_type === 'room' ? form.is_safe_zone : false,
        });
        showToast(`Updated "${form.location_name.trim()}"`);
      } else {
        await addLocation({
          location_name: form.location_name.trim(),
          location_type: form.location_type,
          elevation_offset: Number(form.elevation_offset),
          parent_location_id: parentNode?.location_id || null,
          is_safe_zone:
            form.location_type === 'room' ? form.is_safe_zone : false,
          school_id: effectiveSchoolId,
        });
        showToast(`Added "${form.location_name.trim()}"`);
      }
      setShowModal(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoDetectSafeZones = async () => {
    setAutoDetecting(true);
    try {
      const changedCount = await autoConfigureSafeZones(
        locations,
        SAFE_ZONE_THRESHOLD_CM
      );
      await reload();
      showToast(
        changedCount > 0
          ? `Auto-configured ${changedCount} location(s) using the ≥${SAFE_ZONE_THRESHOLD_CM}cm elevation rule.`
          : `All rooms already match the ≥${SAFE_ZONE_THRESHOLD_CM}cm safe-zone elevation rule.`
      );
    } catch (err) {
      alert('Auto-detect failed: ' + err.message);
    } finally {
      setAutoDetecting(false);
    }
  };

  // Infrastructure readiness metrics
  const stats = useMemo(() => {
    const blocks = locations.filter(l => l.location_type === 'block').length;
    const rooms = locations.filter(l => l.location_type === 'room');
    const safeZones = rooms.filter(r => r.is_safe_zone).length;
    const riskRooms = rooms.filter(
      r => getCumulativeElevation(r, locations) < SAFE_ZONE_THRESHOLD_CM
    ).length;

    return { blocks, totalRooms: rooms.length, safeZones, riskRooms };
  }, [locations]);

  const displayedTree = useMemo(
    () => filterLocationTree(tree, locations, searchTerm, riskFilter),
    [tree, locations, searchTerm, riskFilter]
  );

  // ── Render Logic ───────────────────────────────────────────────────────────

  if (isSuperadmin && !selectedSchoolId) {
    return (
      <div className="w-full max-w-7xl p-4 md:p-8 py-10">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Location Manager
          </h1>
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
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <ClockIcon className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">
          Generating Tree
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
        <div className="bg-red-500 p-2 rounded-lg">
          <MapPinIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-red-800 font-bold">System Error</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl p-4 md:p-8 pb-28 fade-in relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 bg-teal-600 text-white text-sm font-bold rounded-xl shadow-lg flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
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

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Location Manager</h1>
            {isSuperadmin && selectedSchoolName && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="brand">{selectedSchoolName}</Badge>
              </div>
            )}
            <p className="text-sm text-slate-500 mt-2">
              Configure blocks, floor elevations, and safe zones for automated flood evacuation routing.
            </p>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2.5">
              {locations.length > 0 && (
                <Button
                  onClick={handleAutoDetectSafeZones}
                  disabled={autoDetecting}
                  variant="secondary"
                  className="whitespace-nowrap"
                >
                  <SparklesIcon className="w-4 h-4 text-teal-600" />
                  {autoDetecting ? 'Scanning...' : 'Auto-Detect Safe Zones'}
                </Button>
              )}

              <Button
                onClick={handleAddBlock}
                variant="primary"
                className="shadow-md shadow-teal-600/20 whitespace-nowrap"
              >
                <PlusIcon className="w-5 h-5 mr-1" />
                Add Block
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Infrastructure Summary Metrics */}
      {locations.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Building Blocks</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.blocks}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Total Rooms</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.totalRooms}</p>
          </Card>
          <Card className="p-4 border-l-4 border-teal-500">
            <p className="text-xs font-bold text-teal-600 uppercase">Designated Safe Zones</p>
            <p className="text-2xl font-extrabold text-teal-900 mt-1">{stats.safeZones}</p>
          </Card>
          <Card className="p-4 border-l-4 border-amber-500">
            <p className="text-xs font-bold text-amber-600 uppercase">
              Flood-Risk Rooms (&lt;{SAFE_ZONE_THRESHOLD_CM}cm)
            </p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{stats.riskRooms}</p>
          </Card>
        </div>
      )}

      {/* Warning Banner if Rooms Exist Without Any Safe Zone */}
      {stats.totalRooms > 0 && stats.safeZones === 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <span className="font-bold">No Evacuation Safe Zones Configured:</span> Your evacuation planner needs at least one upper-floor room (≥{SAFE_ZONE_THRESHOLD_CM}cm) marked as a Safe Zone to route assets during a flood.
            </div>
          </div>
          {canEdit && (
            <Button
              onClick={handleAutoDetectSafeZones}
              disabled={autoDetecting}
              variant="secondary"
              className="shrink-0 text-xs"
            >
              Auto-Configure Now
            </Button>
          )}
        </div>
      )}

      <LocationToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
      />

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
      ) : displayedTree.length === 0 ? (
        <div className="text-center py-16 px-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <p className="text-sm font-bold text-slate-600">
            No locations match your search or elevation filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTree.map(node => (
            <LocationTreeNode
              key={node.location_id}
              node={node}
              flatList={locations}
              directAssetCounts={directAssetCounts}
              tempSafeZoneCounts={tempSafeZoneCounts}
              onReload={reload}
              onAddChild={handleAddChild}
              onEditNode={handleEditNode}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {showModal && (
        <LocationFormModal
          mode={modalMode}
          parentNode={parentNode}
          editingNode={editingNode}
          form={form}
          setForm={setForm}
          manualSafeOverride={manualSafeOverride}
          setManualSafeOverride={setManualSafeOverride}
          onSave={handleSubmit}
          onCancel={() => setShowModal(false)}
          saving={saving}
          formError={formError}
          locations={locations}
          getChildType={getChildType}
        />
      )}
    </div>
  );
}