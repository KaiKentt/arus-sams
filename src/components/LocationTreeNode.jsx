import { useState } from 'react'
import { toggleSafeZone, deleteLocation, getCumulativeElevation } from '../hooks/useLocations'

const TYPE_COLORS = {
  block: 'bg-blue-100 text-blue-800 border-blue-300',
  floor: 'bg-green-100 text-green-800 border-green-300',
  room:  'bg-yellow-100 text-yellow-800 border-yellow-300',
}

const TYPE_INDENT = {
  block: 'ml-0',
  floor: 'ml-6',
  room:  'ml-12',
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
      <div className={`flex items-center justify-between p-3 rounded-lg border ${TYPE_COLORS[node.location_type] || 'bg-gray-100'}`}>
        {/* Left — expand + info */}
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="text-gray-500 w-5 text-sm font-bold">
              {expanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{node.location_name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-60 border capitalize">
                {node.location_type}
              </span>
              {node.is_safe_zone && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  ✓ Safe Zone
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5 opacity-70">
              Offset: +{node.elevation_offset}cm &nbsp;|&nbsp; Absolute: {cumulative}cm
            </div>
          </div>
        </div>

        {/* Right — actions (headmaster / superadmin only) */}
        {canEdit && (
          <div className="flex items-center gap-2 ml-2">
            {node.location_type !== 'room' && (
              <button
                onClick={() => onAddChild(node)}
                className="text-xs px-2 py-1 rounded bg-white bg-opacity-70 border hover:bg-opacity-100"
              >
                + Add {node.location_type === 'block' ? 'Floor' : 'Room'}
              </button>
            )}
            <button
              onClick={handleToggleSafeZone}
              title="Toggle safe zone"
              className={`text-xs px-2 py-1 rounded border ${node.is_safe_zone ? 'bg-emerald-500 text-white' : 'bg-white bg-opacity-70'}`}
            >
              {node.is_safe_zone ? '✓ Safe' : 'Safe?'}
            </button>
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
            >
              ✕
            </button>
          </div>
        )}
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
