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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { journalId } = await req.json();

    if (!journalId) {
      return new Response(
        JSON.stringify({ success: false, error: 'journalId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Starting universal enrichment for journal: ${journalId}`);

    // Try to find journal by UUID first, then by journal_id (ISSN)
    let journal;
    let lookupMethod = '';

    const { data: byId, error: idError } = await supabase
      .from('journals_master')
      .select('id, title')
      .eq('id', journalId)
      .maybeSingle();

    if (byId) {
      journal = byId;
      lookupMethod = 'by UUID';
    } else {
      const { data: byJournalId, error: journalIdError } = await supabase
        .from('journals_master')
        .select('id, title')
        .eq('journal_id', journalId)
        .maybeSingle();
      
      if (byJournalId) {
        journal = byJournalId;
        lookupMethod = 'by journal_id (ISSN)';
      }
    }

    if (!journal) {
      console.error('Journal not found - tried by id and journal_id:', journalId);
      return new Response(
        JSON.stringify({ success: false, error: 'Journal not found (tried by UUID and journal_id)' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📚 Found journal ${lookupMethod}: ${journal.title}`);

    console.log(`📚 Enriching: ${journal.title}`);

    // Call all four enrichment functions in parallel using the resolved UUID
    const resolvedId = journal.id;
    const [openalexResult, crossrefResult, doajResult, wikipediaResult] = await Promise.allSettled([
      supabase.functions.invoke('enrich-journal-openalex', {
        body: { journalIds: [resolvedId] }
      }),
      supabase.functions.invoke('enrich-journal-crossref', {
        body: { journalId: resolvedId }
      }),
      supabase.functions.invoke('enrich-journal-doaj', {
        body: { journalId: resolvedId }
      }),
      supabase.functions.invoke('enrich-journal-wikipedia', {
        body: { journalId: resolvedId }
      })
    ]);

    const results = {
      openalex: openalexResult.status === 'fulfilled' ? 
        (openalexResult.value.error ? 'error' : 'success') : 'error',
      crossref: crossrefResult.status === 'fulfilled' ? 
        (crossrefResult.value.error ? 'error' : 'success') : 'error',
      doaj: doajResult.status === 'fulfilled' ? 
        (doajResult.value.error ? 'error' : 'success') : 'error',
      wikipedia: wikipediaResult.status === 'fulfilled' ? 
        (wikipediaResult.value.error ? 'error' : 'success') : 'error',
    };

    console.log('✅ Enrichment results:', results);

    const allSuccess = Object.values(results).every(r => r === 'success');

    return new Response(
      JSON.stringify({
        success: allSuccess,
        results,
        message: allSuccess 
          ? 'Wzbogacenie zakończone sukcesem ze wszystkich źródeł'
          : 'Wzbogacenie częściowo ukończone (sprawdź szczegóły)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-journal-all:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
