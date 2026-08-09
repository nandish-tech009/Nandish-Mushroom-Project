import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users from auth
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    // Get all existing profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id');
    
    if (profilesError) {
      throw profilesError;
    }

    const existingUserIds = new Set(profiles?.map(p => p.user_id) || []);
    
    // Find users without profiles
    const usersWithoutProfiles = users.filter(user => !existingUserIds.has(user.id));
    
    // Create missing profiles
    const missingProfiles = usersWithoutProfiles.map(user => ({
      user_id: user.id,
      full_name: user.user_metadata?.full_name || 'User',
      email: user.email || null,
    }));

    if (missingProfiles.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('profiles')
        .insert(missingProfiles);
      
      if (insertError) {
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: missingProfiles.length,
        profiles: missingProfiles,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
