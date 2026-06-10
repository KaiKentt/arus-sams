import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 1. Setup CORS so your React app is allowed to communicate with this function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 2. Handle CORS Preflight Requests (Browser security check)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 3. Initialize the Admin Client using Deno's built-in environment variables
    // These keys are automatically provided to the function by Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 4. Extract the payload sent from your React components
    const {
      email,
      password,
      fullName,
      role,
      icNumber,
      schoolId,
      phoneNo,         // Might be undefined (from AddStaffModal)
      profilePicUrl    // Might be undefined (from AdminAddStaffForm)
    } = await req.json()

    // 5. Create the user securely in the Auth Vault
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm so they can log in immediately
    })

    if (authError) {
      // Stop and send error back to React if vault creation fails
      return new Response(
        JSON.stringify({ error: authError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const newUserId = authData.user.id

    // 6. Build the dynamic update payload for the public.staff table
    // The Postgres Trigger has already created the row with ID and Email!
    const updatePayload: any = {
      full_name: fullName,
      role: role,
      ic_number: icNumber,
      school_id: schoolId,
    }

    // Only append these fields if the React form actually sent them
    if (phoneNo) updatePayload.phone_no = phoneNo
    if (profilePicUrl) updatePayload.profile_pic = profilePicUrl

    // 7. Update the profile
    const { error: updateError } = await supabaseAdmin
      .from('staff')
      .update(updatePayload)
      .eq('id', newUserId)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Auth success, but profile update failed: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 8. Send Success Response back to React
    return new Response(
      JSON.stringify({ message: 'User provisioned successfully!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    // Catch any unexpected server crashes
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})