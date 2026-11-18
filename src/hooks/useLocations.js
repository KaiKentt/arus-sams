import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export const SAFE_ZONE_THRESHOLD_CM = 300

export async function fetchLocations(schoolId) {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('school_id', schoolId)
    .order('location_id', { ascending: true })
  if (error) throw error
  return data
}

export function buildTree(flatList) {
  const map = {}
  const roots = []
  flatList.forEach(node => {
    map[node.location_id] = { ...node, children: [] }
  })
  flatList.forEach(node => {
    if (!node.parent_location_id) {
      roots.push(map[node.location_id])
    } else if (map[node.parent_location_id]) {
      map[node.parent_location_id].children.push(map[node.location_id])
    }
  })
  return roots
}

export function getCumulativeElevation(node, flatList) {
  if (!node) return 0
  let total = Number(node.elevation_offset) || 0
  let current = node
  const visited = new Set([node.location_id])

  while (current.parent_location_id) {
    if (visited.has(current.parent_location_id)) break
    visited.add(current.parent_location_id)
    const parent = flatList.find(n => n.location_id === current.parent_location_id)
    if (!parent) break
    total += Number(parent.elevation_offset) || 0
    current = parent
  }
  return total
}

export async function addLocation({
  location_name,
  location_type,
  elevation_offset,
  parent_location_id,
  is_safe_zone,
  school_id,
}) {
  const { data, error } = await supabase
    .from('locations')
    .insert([
      {
        location_name,
        location_type,
        elevation_offset,
        parent_location_id: parent_location_id || null,
        is_safe_zone: location_type === 'room' ? Boolean(is_safe_zone) : false,
        school_id,
      },
    ])
    .select()
  if (error) throw error
  return data[0]
}

export async function updateLocation(locationId, updates) {
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('location_id', locationId)
    .select()
  if (error) throw error
  return data[0]
}

export async function toggleSafeZone(locationId, currentValue) {
  const { data, error } = await supabase
    .from('locations')
    .update({ is_safe_zone: !currentValue })
    .eq('location_id', locationId)
    .select()
  if (error) throw error
  return data[0]
}

export async function autoConfigureSafeZones(flatList, thresholdCm = SAFE_ZONE_THRESHOLD_CM) {
  const updates = []

  flatList.forEach(loc => {
    if (loc.location_type !== 'room') {
      // Blocks and floors are structural containers, never evacuation destinations
      if (loc.is_safe_zone) {
        updates.push(
          supabase
            .from('locations')
            .update({ is_safe_zone: false })
            .eq('location_id', loc.location_id)
        )
      }
      return
    }

    const cumulative = getCumulativeElevation(loc, flatList)
    const shouldBeSafe = cumulative >= thresholdCm

    if (Boolean(loc.is_safe_zone) !== shouldBeSafe) {
      updates.push(
        supabase
          .from('locations')
          .update({ is_safe_zone: shouldBeSafe })
          .eq('location_id', loc.location_id)
      )
    }
  })

  if (updates.length > 0) {
    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed) throw failed.error
  }

  return updates.length
}

export async function deleteLocation(locationId) {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('location_id', locationId)
  if (error) throw error
}

export function useLocations(schoolId) {
  const [locations, setLocations] = useState([])
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLocations(schoolId)
      setLocations(data)
      setTree(buildTree(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    load()
  }, [load])

  return { locations, tree, loading, error, reload: load }
}