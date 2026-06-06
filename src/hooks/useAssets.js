import { supabase } from '../supabaseClient'
import QRCode from 'qrcode'

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

// ── QR ID SYSTEM ─────────────────────────────────────────────────────────────
// QR encodes qr_code_id ONLY (e.g. YBA1346-00001) — NEVER registration_no

// Generate next QR ID string — format: {branch_code}-{5-digit-padded}
export async function generateQrId(supabase, schoolId) {
  const { data: school, error } = await supabase
    .from('schools')
    .select('school_code, branch_code, last_qr_number')
    .eq('school_id', schoolId)
    .single()
  if (error || !school) throw new Error('Could not fetch school data for QR generation.')

  // Use branch_code if set, fall back to school_code (both are e.g. YBA1346)
  const code = school.branch_code || school.school_code
  if (!code) throw new Error('School code not set. Contact your administrator.')

  const newNumber = (school.last_qr_number || 0) + 1
  const paddedNo = String(newNumber).padStart(5, '0')
  const qrId = `${code}-${paddedNo}`

  return { qrId, newNumber }
}

// Increment QR counter — call AFTER confirmed asset INSERT
export async function incrementQrCounter(supabase, schoolId, newNumber) {
  const { error } = await supabase
    .from('schools')
    .update({ last_qr_number: newNumber })
    .eq('school_id', schoolId)
  if (error) throw error
}

// Generate QR image, upload to storage, update asset row with qr_code_id + url
export async function generateAndSaveQR(supabase, assetId, qrId) {
  const qrDataUrl = await QRCode.toDataURL(qrId, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  const res = await fetch(qrDataUrl)
  const blob = await res.blob()

  const fileName = `qr/${assetId.replace(/\//g, '-')}.png`
  const { error: uploadError } = await supabase.storage
    .from('asset-images')
    .upload(fileName, blob, { contentType: 'image/png', upsert: true })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('asset-images')
    .getPublicUrl(fileName)

  const { error: updateError } = await supabase
    .from('assets')
    .update({
      qr_code_id: qrId,
      qr_code_url: urlData.publicUrl,
      qr_generated_at: new Date().toISOString(),
    })
    .eq('asset_id', assetId)
  if (updateError) throw updateError

  return { qrDataUrl, publicUrl: urlData.publicUrl }
}

// Safety check before saving — ensure QR ID is not already taken
export async function checkQrIdExists(supabase, qrId) {
  const { count } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('qr_code_id', qrId)
  return (count || 0) > 0
}
