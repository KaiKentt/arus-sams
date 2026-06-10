import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const {
      userId,
      fullName,
      role,
      icNumber,
      schoolId,
      password // Optional
    } = await req.json()

    if (!userId) {
      throw new Error("User ID is required")
    }

    // 1. If password is provided, update it in Auth
    if (password) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      )
      if (authError) {
        return new Response(
          JSON.stringify({ error: `Failed to update auth password: ${authError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    // 2. Update the public.staff profile
    const updatePayload: any = {
      full_name: fullName,
      role: role,
      ic_number: icNumber,
      school_id: schoolId,
    }
    
    // We should also store the password in the public table if the original design did so
    if (password) updatePayload.stored_password = password

    const { error: updateError } = await supabaseAdmin
      .from('staff')
      .update(updatePayload)
      .eq('id', userId)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Profile update failed: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ message: 'User updated successfully!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})