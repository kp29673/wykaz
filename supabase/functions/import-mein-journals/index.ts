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

    const { journals, wykaz_id, replace_existing } = await req.json();

    if (!journals || !Array.isArray(journals)) {
      throw new Error('Invalid request body: journals array is required');
    }

    if (!wykaz_id) {
      throw new Error('Invalid request body: wykaz_id is required');
    }

    console.log(`Starting import of ${journals.length} journals for wykaz ${wykaz_id}`);

    // Get wykaz metadata
    const { data: wykazData, error: wykazError } = await supabase
      .from('wykazy_metadata')
      .select('*')
      .eq('id', wykaz_id)
      .single();

    if (wykazError || !wykazData) {
      throw new Error('Wykaz not found');
    }

    // STEP 0: Conditionally delete existing rankings if replace_existing flag is set
    if (replace_existing === true) {
      console.log(`🗑️ Deleting existing rankings for wykaz ${wykaz_id}...`);
      
      const { error: deleteError, count } = await supabase
        .from('journal_rankings')
        .delete()
        .eq('wykaz_id', wykaz_id);

      if (deleteError) {
        console.error('Failed to delete existing rankings:', deleteError);
      } else {
        console.log(`✅ Deleted ${count || 0} existing rankings`);
      }
    }

    const year = new Date(wykazData.published_date).getFullYear();
    let imported = 0;
    let failed = 0;
    
    // Error tracking
    const errorBreakdown = {
      empty_title: 0,
      missing_issn: 0,
      duplicates_removed: 0,
      parse_error: 0
    };

    // Prepare bulk records
    const masterRecords = [];
    const rankingRecords = [];

    for (const journal of journals) {
      try {
        // Validation: Check if title exists and is not empty
        if (!journal.title || journal.title.trim() === '' || journal.title === 'undefined') {
          console.warn(`Skipping journal with empty title: ${JSON.stringify(journal)}`);
          errorBreakdown.empty_title++;
          failed++;
          continue;
        }

        // Parse ISSN from format "XXXX-XXXX YYYY-YYYY"
        const issnParts = journal.issn?.split(' ').filter(Boolean) || [];
        const issn_print = issnParts[0] || null;
        const issn_electronic = issnParts[1] || issnParts[0] || null;

        // Determine master key (journal_id) - DO NOT generate random IDs
        const journalId = journal.id?.toString() 
          || issn_print 
          || issn_electronic 
          || null;
        
        // Validation: Must have at least ID or ISSN
        if (!journalId) {
          console.warn(`Skipping journal without ID/ISSN: ${journal.title}`);
          errorBreakdown.missing_issn++;
          failed++;
          continue;
        }

        // Parse disciplines
        const disciplinesRaw = journal.disciplines || '';
        const disciplines = disciplinesRaw
          .split(';')
          .map((d: string) => d.trim())
          .filter((d: string) => d.length > 0);

        masterRecords.push({
          journal_id: journalId,
          title: journal.title.trim(),
          issn_print,
          issn_electronic,
        });

        rankingRecords.push({
          journal_id: journalId,
          wykaz_id: wykaz_id,
          points: parseInt(journal.points) || 0,
          disciplines,
          year,
          published_date: wykazData.published_date,
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`Error preparing journal: ${journal.title}`, errorMsg);
        errorBreakdown.parse_error++;
        failed++;
      }
    }
    
    // Deduplicate records within batch
    const uniqueMasterRecords = Array.from(
      new Map(masterRecords.map(r => [r.journal_id, r])).values()
    );
    const uniqueRankingRecords = Array.from(
      new Map(rankingRecords.map(r => [r.journal_id, r])).values()
    );
    
    errorBreakdown.duplicates_removed = masterRecords.length - uniqueMasterRecords.length;
    
    if (errorBreakdown.duplicates_removed > 0) {
      console.warn(`⚠️ Removed ${errorBreakdown.duplicates_removed} duplicate journal_id entries within batch`);
    }
    
    console.log(`Validated records: ${uniqueMasterRecords.length} journals (${errorBreakdown.empty_title + errorBreakdown.missing_issn + errorBreakdown.parse_error} failed validation)`);

    // STEP 1: Bulk upsert to journals_master
    if (uniqueMasterRecords.length > 0) {
      console.log(`Bulk upserting ${uniqueMasterRecords.length} journals to journals_master...`);
      const { error: masterError } = await supabase
        .from('journals_master')
        .upsert(uniqueMasterRecords, {
          onConflict: 'journal_id',
          ignoreDuplicates: false
        });

      if (masterError) {
        console.error(`Bulk master upsert failed:`, masterError);
        throw new Error(`Master upsert failed: ${masterError.message}`);
      }
    }

    // STEP 2: Bulk upsert to journal_rankings
    if (uniqueRankingRecords.length > 0) {
      console.log(`Bulk upserting ${uniqueRankingRecords.length} rankings to journal_rankings...`);
      const { error: rankingError } = await supabase
        .from('journal_rankings')
        .upsert(uniqueRankingRecords, {
          onConflict: 'journal_id,wykaz_id',
          ignoreDuplicates: false
        });

      if (rankingError) {
        console.error(`Bulk ranking upsert failed:`, rankingError);
        throw new Error(`Ranking upsert failed: ${rankingError.message}`);
      }

      imported = uniqueRankingRecords.length;
    }

    // STEP 3: Create 0-point records for journals missing from current wykaz
    let zeroPointsCreated = 0;
    try {
      // Find previous wykaz (ordered by published_date DESC, skip current)
      const { data: prevWykazy } = await supabase
        .from('wykazy_metadata')
        .select('id, published_date')
        .lt('published_date', wykazData.published_date)
        .order('published_date', { ascending: false })
        .limit(1);

      if (prevWykazy && prevWykazy.length > 0) {
        const previousWykazId = prevWykazy[0].id;
        console.log(`Checking for missing journals from previous wykaz: ${previousWykazId}`);

        // Get all journal_ids from previous wykaz
        const { data: prevJournals } = await supabase
          .from('journal_rankings')
          .select('journal_id, disciplines')
          .eq('wykaz_id', previousWykazId);

        if (prevJournals && prevJournals.length > 0) {
          // Get all journal_ids from current wykaz
          const { data: currentJournals } = await supabase
            .from('journal_rankings')
            .select('journal_id')
            .eq('wykaz_id', wykaz_id);

          const currentJournalIds = new Set((currentJournals || []).map(j => j.journal_id));

          // Find journals in previous but not in current
          const missingJournals = prevJournals.filter(pj => !currentJournalIds.has(pj.journal_id));

          // Create 0-point records
          for (const missing of missingJournals) {
            const { error: zeroError } = await supabase
              .from('journal_rankings')
              .insert({
                journal_id: missing.journal_id,
                wykaz_id: wykaz_id,
                points: 0,
                disciplines: missing.disciplines,
                year: new Date(wykazData.published_date).getFullYear(),
                published_date: wykazData.published_date,
              });

            if (!zeroError) {
              zeroPointsCreated++;
            }
          }

          console.log(`Created ${zeroPointsCreated} zero-point records`);
        }
      }
    } catch (zeroError) {
      console.error('Error creating zero-point records:', zeroError);
      // Don't fail the whole import
    }

    return new Response(JSON.stringify({
      imported,
      failed,
      total: journals.length,
      zero_points_created: zeroPointsCreated,
      error_breakdown: errorBreakdown
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
