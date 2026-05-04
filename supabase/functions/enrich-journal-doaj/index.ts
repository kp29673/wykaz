import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchDOAJData(issn: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://doaj.org/api/search/journals/issn:${issn}`;
      console.log(`🔍 DOAJ search (attempt ${attempt}): ${url}`);
      
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'mailto:support@lovable.dev',
          'Accept': 'application/json'
        }
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Rate limited, waiting ${waitTime}ms`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`❌ DOAJ - journal not found`);
          return null;
        }
        throw new Error(`DOAJ API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.total === 0) {
        console.log(`❌ DOAJ - no results`);
        return null;
      }
      
      const result = data.results[0];
      const journal = result.bibjson;
      
      console.log(`✅ DOAJ found - DOAJ Seal: ${result.admin?.seal || false}`);
      
      return {
        doaj_seal: result.admin?.seal || false,
        is_in_doaj: true,
        is_oa: true,
        oa_status: 'gold',
        license: journal.license?.[0]?.type || null,
        apc_amount: journal.apc?.max?.[0]?.price || null,
        apc_currency: journal.apc?.max?.[0]?.currency || null,
        journal_url: journal.link?.[0]?.url || null,
        doaj_review_process: journal.editorial?.review_process || null,
        doaj_plagiarism_check: journal.editorial?.plagiarism_detection || false,
        doaj_editorial_board_url: journal.editorial?.board_url || null,
        doaj_author_instructions_url: journal.link?.find((l: any) => l.type === 'author_instructions')?.url || null,
        doaj_aims_scope: journal.editorial?.aims_scope || null,
        doaj_publication_time_weeks: journal.editorial?.publication_time_weeks || null,
        doaj_keywords: journal.keywords || [],
        doaj_languages: journal.language || [],
        doaj_updated_at: new Date().toISOString(),
      };
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ DOAJ failed after ${maxRetries} attempts:`, error);
        throw error;
      }
    }
  }
  return null;
}

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
      throw new Error('journalId is required');
    }

    console.log(`\n🔄 Starting DOAJ enrichment for journal: ${journalId}`);

    // Get journal ISSN
    const { data: journal, error: fetchError } = await supabase
      .from('journals_master')
      .select('issn_print, issn_electronic, issn_l, title, data_provenance')
      .eq('id', journalId)
      .single();

    if (fetchError || !journal) {
      console.error('❌ Journal not found:', fetchError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Journal not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try ISSN-L first, then electronic, then print
    const issn = journal.issn_l || journal.issn_electronic || journal.issn_print;
    
    if (!issn) {
      console.log('❌ No ISSN available for journal');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No ISSN available' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch DOAJ data
    const doajData = await fetchDOAJData(issn);

    if (!doajData) {
      console.log('❌ No DOAJ data found');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No DOAJ data found for this journal' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build data_provenance for DOAJ fields
    const existingProvenance = journal.data_provenance || {};
    const updatedProvenance = {
      ...existingProvenance,
      doaj_seal: { source: 'doaj', updated_at: new Date().toISOString() },
      is_in_doaj: { source: 'doaj', updated_at: new Date().toISOString() },
      doaj_review_process: { source: 'doaj', updated_at: new Date().toISOString() },
      doaj_plagiarism_check: { source: 'doaj', updated_at: new Date().toISOString() },
    };

    // Update journal with DOAJ data
    const updateData = {
      ...doajData,
      data_provenance: updatedProvenance,
      last_enriched_at: new Date().toISOString()
    };

    console.log(`📝 Updating journals_master with DOAJ data:`, Object.keys(updateData));

    const { error: updateError } = await supabase
      .from('journals_master')
      .update(updateData)
      .eq('id', journalId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully enriched journal ${journalId} with DOAJ data`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Journal enriched with DOAJ data',
      data: doajData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
