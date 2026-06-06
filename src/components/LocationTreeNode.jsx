import { useState } from 'react'
import { toggleSafeZone, deleteLocation, getCumulativeElevation } from '../hooks/useLocations'

const TYPE_COLORS = {
  block: 'bg-blue-50 border-blue-300',
  floor: 'bg-green-50 border-green-300',
  room:  'bg-yellow-50 border-yellow-300',
}

const TYPE_BADGE = {
  block: 'bg-blue-100 text-blue-700 border-blue-300',
  floor: 'bg-green-100 text-green-700 border-green-300',
  room:  'bg-yellow-100 text-yellow-700 border-yellow-300',
}

const TYPE_INDENT = {
  block: 'ml-0',
  floor: 'ml-3 md:ml-6',
  room:  'ml-6 md:ml-12',
}

export default function LocationTreeNode({ node, flatList, onReload, onAddChild, canEdit }) {
  const [expanded, setExpanded] = useState(true)
  const cumulative = getCumulativeElevation(node, flatList)
  const hasChildren = node.children && node.children.length > 0

  const handleToggleSafeZone = async () => {
    try {
      await toggleSafeZone(node.location_id, node.is_safe_zone)
      onReload()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async () => {
    if (hasChildren) {
      alert('Cannot delete — this node has children. Remove children first.')
      return
    }
    if (!confirm(`Delete "${node.location_name}"?`)) return
    try {
      await deleteLocation(node.location_id)
      onReload()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className={`${TYPE_INDENT[node.location_type] || 'ml-0'} mb-2`}>
      <div className={`p-3 rounded-lg border ${TYPE_COLORS[node.location_type] || 'bg-gray-100'}`}>

        {/* Top row — expand toggle + name + type badge */}
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-500 w-5 text-xs font-bold mt-0.5 flex-shrink-0"
            >
              {expanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            {/* Name + badges row */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="font-semibold text-sm text-gray-800">{node.location_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${TYPE_BADGE[node.location_type]}`}>
                {node.location_type}
              </span>
              {node.is_safe_zone && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-medium">
                  ✓ Safe Zone
                </span>
              )}
            </div>

            {/* Elevation info */}
            <div className="text-xs mt-1 text-gray-500">
              Offset: +{node.elevation_offset}cm &nbsp;·&nbsp; Absolute: {cumulative}cm
            </div>

            {/* Action buttons — shown below info on all screens */}
            {canEdit && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {node.location_type !== 'room' && (
                  <button
                    onClick={() => onAddChild(node)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    + {node.location_type === 'block' ? 'Add Floor' : 'Add Room'}
                  </button>
                )}
                <button
                  onClick={handleToggleSafeZone}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    node.is_safe_zone
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {node.is_safe_zone ? '✓ Safe' : 'Set Safe'}
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-1">
          {node.children.map(child => (
            <LocationTreeNode
              key={child.location_id}
              node={child}
              flatList={flatList}
              onReload={onReload}
              onAddChild={onAddChild}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
