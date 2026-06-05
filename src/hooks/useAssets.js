import { supabase } from '../supabaseClient'

// ── Generate registration number — Format: KPM/{ptj_code}/{school_code}/{H|R}/{YY}/{running_no}
// Example from real data: KPM/JPNSAR/YBA1346/H/25/001
export async function generateRegistrationNo(supabase, schoolId, assetType) {
  const { data: school, error } = await supabase
    .from('schools')
    .select('school_code, ptj_code, last_running_h, last_running_r')
    .eq('school_id', schoolId)
    .single()
  if (error) throw new Error('Could not fetch school data.')
  if (!school.ptj_code) throw new Error('PTJ code not set. Go to Ministry Portal → Edit School and select the State.')
  if (!school.school_code) throw new Error('School code is missing. Please update the School Profile.')

  const year = new Date().getFullYear().toString().slice(-2)
  const runningField = assetType === 'H' ? 'last_running_h' : 'last_running_r'
  const currentNo = (school[runningField] || 0) + 1
  const runningNo = String(currentNo).padStart(3, '0')
  const regNo = `KPM/${school.ptj_code}/${school.school_code}/${assetType}/${year}/${runningNo}`

  return { regNo, currentNo, runningField }
}

// ── Increment running counter AFTER confirmed asset insert
export async function incrementRunningNo(supabase, schoolId, runningField, newValue) {
  const { error } = await supabase
    .from('schools')
    .update({ [runningField]: newValue })
    .eq('school_id', schoolId)
  if (error) throw error
}

// ── Check if registration_no already exists
export async function checkRegistrationNoExists(supabase, regNo) {
  const { count, error } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('registration_no', regNo)
  if (error) throw error
  return (count || 0) > 0
}

// ── Insert a single asset row
export async function insertAsset(supabase, assetData) {
  const { data, error } = await supabase
    .from('assets')
    .insert([assetData])
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Append a log_history row
export async function insertLogHistory(supabase, { assetId, staffId, logDetails }) {
  const { error } = await supabase
    .from('log_history')
    .insert([{
      asset_id: assetId,
      staff_id: staffId,
      log_details: logDetails,
      log_timestamp: new Date().toISOString(),
    }])
  if (error) throw error
}

// ── Upload image to asset-images bucket, return public URL
export async function uploadAssetImage(supabase, file, safeAssetId) {
  const ext = file.name.split('.').pop()
  const fileName = `${safeAssetId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('asset-images').upload(fileName, file)
  if (error) throw error
  const { data } = supabase.storage.from('asset-images').getPublicUrl(fileName)
  return data.publicUrl
}

// ── Fetch school codes + running counters for reg no preview
export async function fetchSchoolCodes(schoolId) {
  const { data, error } = await supabase
    .from('schools')
    .select('school_code, ptj_code, last_running_h, last_running_r')
    .eq('school_id', schoolId)
    .single()
  if (error) throw error
  return data
}

// ── Fetch all room locations with full path labels
export async function fetchRoomLocations(schoolId) {
  const { data, error } = await supabase
    .from('locations')
    .select('location_id, location_name, parent_location_id, location_type')
    .eq('school_id', schoolId)
  if (error) throw error
  if (!data) return { rooms: [], paths: {} }

  const map = {}
  data.forEach(loc => { map[loc.location_id] = loc })

  const paths = {}
  data.forEach(loc => {
    const parts = []
    let cur = loc
    while (cur) {
      parts.unshift(cur.location_name)
      cur = cur.parent_location_id ? map[cur.parent_location_id] : null
    }
    paths[loc.location_id] = parts.join(' → ')
  })

  const rooms = data.filter(loc => loc.location_type === 'room')
  return { rooms, paths }
}

// ── Asset classification cascading dropdowns
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('asset_categories')
    .select('code, name')
    .order('code')
  if (error) throw error
  return data || []
}

export async function fetchSubcategories(categoryCode) {
  const { data, error } = await supabase
    .from('asset_subcategories')
    .select('code, name')
    .eq('category_code', categoryCode)
    .order('code')
  if (error) throw error
  return data || []
}

export async function fetchAssetTypeRefs(subcategoryCode) {
  const { data, error } = await supabase
    .from('asset_type_refs')
    .select('code, name')
    .eq('subcategory_code', subcategoryCode)
    .order('code')
  if (error) throw error
  return data || []
}
