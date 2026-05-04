import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const issn = url.searchParams.get('issn');

    if (!issn) {
      return new Response(
        JSON.stringify({ error: 'ISSN parameter is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to find journal_id from journals_master first (new system)
    const { data: masterData } = await supabase
      .from('journals_master')
      .select('journal_id')
      .or(`issn_print.eq.${issn},issn_electronic.eq.${issn},issn_print_2.eq.${issn},issn_electronic_2.eq.${issn}`)
      .limit(1)
      .maybeSingle();

    // If not found in journals_master, fall back to old journals table
    if (!masterData?.journal_id) {
      console.log('Journal not in journals_master, using old journals table');
      const { data: history, error: historyError } = await supabase
        .from('journals')
        .select('*')
        .or(`issn_print.eq.${issn},issn_electronic.eq.${issn},issn_print_2.eq.${issn},issn_electronic_2.eq.${issn}`)
        .order('year', { ascending: false });

      if (historyError || !history || history.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Journal not found' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        );
      }

      return new Response(
        JSON.stringify({ history }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch ALL wykazy from 2019 onwards
    const { data: allWykazy, error: wykazyError } = await supabase
      .from('wykazy_metadata')
      .select('*')
      .gte('published_date', '2019-01-01')
      .order('published_date', { ascending: true });

    if (wykazyError) {
      console.error('Error fetching wykazy:', wykazyError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch wykazy metadata' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Fetch all historical rankings for this journal_id
    const { data: rankings, error: rankingsError } = await supabase
      .from('journal_rankings')
      .select('*')
      .eq('journal_id', masterData.journal_id)
      .order('year', { ascending: false });

    if (rankingsError) {
      console.error('Error fetching rankings:', rankingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rankings' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Get journal metadata
    const { data: journal, error: journalError } = await supabase
      .from('journals_master')
      .select('*')
      .eq('journal_id', masterData.journal_id)
      .single();

    if (journalError) {
      console.error('Error fetching journal metadata:', journalError);
    }

    // Create complete history: for each wykaz, either use real ranking or add zeros
    const history = allWykazy.map(wykaz => {
      const ranking = rankings?.find(r => r.wykaz_id === wykaz.id);
      
      if (ranking) {
        // Journal was in this wykaz
        return {
          ...journal,
          ...ranking,
          published_date: wykaz.published_date,
          year_identifier: wykaz.year_identifier,
          wykaz_version: wykaz.wykaz_version,
          wykaz_source_url: wykaz.source_url,
          wykaz_identifier: wykaz.year_identifier,
          wykaz_valid_from: wykaz.valid_from,
          wykaz_valid_to: wykaz.valid_to,
          in_current_wykaz: true,
        };
      } else {
        // Journal was NOT in this wykaz - add zeros
        const yearMatch = wykaz.year_identifier.match(/(\d{4})/);
        return {
          ...journal,
          points: 0,
          disciplines: [],
          discipline_codes: [],
          year: yearMatch ? parseInt(yearMatch[1]) : new Date(wykaz.published_date).getFullYear(),
          published_date: wykaz.published_date,
          year_identifier: wykaz.year_identifier,
          wykaz_version: wykaz.wykaz_version,
          wykaz_source_url: wykaz.source_url,
          wykaz_identifier: wykaz.year_identifier,
          wykaz_valid_from: wykaz.valid_from,
          wykaz_valid_to: wykaz.valid_to,
          in_current_wykaz: false,
        };
      }
    });

    // Sort DESC for display (newest first)
    history.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

    return new Response(
      JSON.stringify({ history }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
