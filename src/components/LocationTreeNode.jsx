import { useState } from 'react'
import {
  toggleSafeZone,
  deleteLocation,
  getCumulativeElevation,
  SAFE_ZONE_THRESHOLD_CM,
} from '../hooks/useLocations'
import Badge from './ui/Badge'
import Button from './ui/Button'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'

const TYPE_VARIANTS = {
  block: 'brand',
  floor: 'warning',
  room: 'neutral',
}

const TYPE_INDENT = {
  block: 'ml-0',
  floor: 'ml-4 md:ml-8',
  room: 'ml-8 md:ml-16',
}

function getSubtreeAssetStats(node, directAssetCounts, tempSafeZoneCounts) {
  let totalAssets = directAssetCounts[node.location_id] || 0
  let tempAssets = tempSafeZoneCounts[node.location_id] || 0

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      const childStats = getSubtreeAssetStats(child, directAssetCounts, tempSafeZoneCounts)
      totalAssets += childStats.totalAssets
      tempAssets += childStats.tempAssets
    })
  }

  return { totalAssets, tempAssets }
}

export default function LocationTreeNode({
  node,
  flatList,
  directAssetCounts = {},
  tempSafeZoneCounts = {},
  onReload,
  onAddChild,
  onEditNode,
  canEdit,
}) {
  const [expanded, setExpanded] = useState(true)
  const cumulative = getCumulativeElevation(node, flatList)
  const hasChildren = node.children && node.children.length > 0
  const isRoom = node.location_type === 'room'
  const isGroundRisk = isRoom && cumulative < SAFE_ZONE_THRESHOLD_CM

  const { totalAssets, tempAssets } = getSubtreeAssetStats(
    node,
    directAssetCounts,
    tempSafeZoneCounts
  )
  const directAssets = directAssetCounts[node.location_id] || 0

  const handleToggleSafeZone = async () => {
    if (!isRoom) return

    // Warn staff if they manually mark a ground-level room (<300cm) as a safe zone
    if (!node.is_safe_zone && cumulative < SAFE_ZONE_THRESHOLD_CM) {
      const proceed = window.confirm(
        `Warning: "${node.location_name}" is only ${cumulative}cm above ground (below the ${SAFE_ZONE_THRESHOLD_CM}cm safe threshold).\n\nAre you sure you want to mark this ground-level room as an evacuation Safe Zone?`
      )
      if (!proceed) return
    }

    try {
      await toggleSafeZone(node.location_id, node.is_safe_zone)
      onReload()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async () => {
    if (hasChildren) {
      alert(`Cannot delete "${node.location_name}" — remove its child floors/rooms first.`)
      return
    }
    if (directAssets > 0) {
      alert(
        `Cannot delete "${node.location_name}" — ${directAssets} asset(s) are currently located here. Reassign or return those assets in the Asset Master List first.`
      )
      return
    }
    if (!window.confirm(`Delete "${node.location_name}"?`)) return

    try {
      await deleteLocation(node.location_id)
      onReload()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className={`${TYPE_INDENT[node.location_type] || 'ml-0'} mb-3`}>
      <div
        className={`p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
          isRoom && node.is_safe_zone
            ? 'border-teal-300 bg-teal-50/30'
            : isGroundRisk && directAssets > 0
            ? 'border-amber-200 bg-amber-50/20'
            : 'border-slate-200'
        }`}
      >
        {/* Top row — expand toggle + name + badges */}
        <div className="flex items-start gap-3">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 p-1 hover:bg-slate-100 rounded-lg transition-colors mt-0.5 flex-shrink-0"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            {/* Name + badges row */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-bold text-slate-800">{node.location_name}</span>
              <Badge variant={TYPE_VARIANTS[node.location_type]}>
                {node.location_type}
              </Badge>

              {isRoom && node.is_safe_zone && (
                <Badge variant="active" icon={ShieldCheckIcon}>
                  Safe Zone
                </Badge>
              )}

              {isGroundRisk && !node.is_safe_zone && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  Flood-Risk Level
                </span>
              )}

              {totalAssets > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  <CubeIcon className="w-3 h-3 text-slate-500" />
                  {totalAssets} {totalAssets === 1 ? 'Asset' : 'Assets'}
                </span>
              )}

              {tempAssets > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  +{tempAssets} Evacuated Here
                </span>
              )}
            </div>

            {/* Elevation info */}
            <div className="text-[11px] mt-1.5 text-slate-500 font-medium flex flex-wrap items-center gap-2">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                Offset: +{node.elevation_offset}cm
              </span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span
                className={`font-bold ${
                  cumulative >= SAFE_ZONE_THRESHOLD_CM ? 'text-teal-600' : 'text-slate-600'
                }`}
              >
                Absolute: {cumulative}cm
              </span>
            </div>

            {/* Action buttons */}
            {canEdit && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                {node.location_type !== 'room' && (
                  <Button
                    onClick={() => onAddChild(node)}
                    variant="secondary"
                    className="h-8 px-3 text-[11px] font-bold"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    {node.location_type === 'block' ? 'Add Floor' : 'Add Room'}
                  </Button>
                )}

                {isRoom && (
                  <Button
                    onClick={handleToggleSafeZone}
                    variant={node.is_safe_zone ? 'primary' : 'secondary'}
                    className={`h-8 px-3 text-[11px] font-bold ${
                      node.is_safe_zone ? 'bg-teal-600 text-white' : ''
                    }`}
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    {node.is_safe_zone ? 'Safe Zone' : 'Set Safe'}
                  </Button>
                )}

                <Button
                  onClick={() => onEditNode(node)}
                  variant="secondary"
                  className="h-8 px-3 text-[11px] font-bold"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                  Edit
                </Button>

                <Button
                  onClick={handleDelete}
                  variant="danger"
                  className="h-8 px-3 text-[11px] font-bold"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-2 space-y-1">
          {node.children.map(child => (
            <LocationTreeNode
              key={child.location_id}
              node={child}
              flatList={flatList}
              directAssetCounts={directAssetCounts}
              tempSafeZoneCounts={tempSafeZoneCounts}
              onReload={onReload}
              onAddChild={onAddChild}
              onEditNode={onEditNode}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}