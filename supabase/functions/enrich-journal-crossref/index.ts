import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchCrossrefData(issn: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.crossref.org/journals/${issn}`;
      console.log(`🔍 Crossref search (attempt ${attempt}): ${url}`);
      
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
          console.log(`❌ Crossref - journal not found`);
          return null;
        }
        throw new Error(`Crossref API error: ${response.status}`);
      }

      const data = await response.json();
      const message = data.message;
      
      console.log(`✅ Crossref found - Publisher: ${message.publisher}`);
      
      // Transform crossref_issn_type from array to readable string
      const issnType = message['issn-type'] 
        ? message['issn-type'].map((issn: any) => `${issn.type}: ${issn.value}`).join(', ')
        : null;

      // Transform crossref_breakdowns to simple { year: count } object
      const breakdowns = message.breakdowns?.['dois-by-issued-year']
        ? message.breakdowns['dois-by-issued-year'].reduce((acc: any, item: any) => {
            const [year, count] = item; // Destructure array [year, count]
            acc[year] = count;
            return acc;
          }, {})
        : null;

      return {
        crossref_total_dois: message.counts?.['total-dois'] || message['total-articles'] || 0,
        crossref_current_dois: message.counts?.['current-dois'] || 0,
        crossref_backfile_dois: message.counts?.['backfile-dois'] || 0,
        crossref_member_id: message['member-id'] || null,
        crossref_publisher: message.publisher || null,
        crossref_publisher_location: message.location || null,
        crossref_subjects: message.subjects || null,
        crossref_languages: message.language || null,
        crossref_issn_type: issnType,
        crossref_coverage_depth: message.coverage?.['content-domain']?.depth || null,
        crossref_coverage_type: message.coverage?.['content-domain']?.type || null,
        crossref_breakdowns: breakdowns,
        crossref_affiliations: message.affiliations || null,
        crossref_updated_at: new Date().toISOString(),
      };
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Crossref failed after ${maxRetries} attempts:`, error);
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

    console.log(`\n🔄 Starting Crossref enrichment for journal: ${journalId}`);

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

    // Try ISSN-L first, then print, then electronic
    const issn = journal.issn_l || journal.issn_print || journal.issn_electronic;
    
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

    // Fetch Crossref data
    const crossrefData = await fetchCrossrefData(issn);

    if (!crossrefData) {
      console.log('❌ No Crossref data found');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No Crossref data found for this journal' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build data_provenance for Crossref fields
    const existingProvenance = journal.data_provenance || {};
    const updatedProvenance = {
      ...existingProvenance,
      crossref_total_dois: { source: 'crossref', updated_at: new Date().toISOString() },
      crossref_current_dois: { source: 'crossref', updated_at: new Date().toISOString() },
      crossref_backfile_dois: { source: 'crossref', updated_at: new Date().toISOString() },
      crossref_publisher: { source: 'crossref', updated_at: new Date().toISOString() },
      crossref_subjects: { source: 'crossref', updated_at: new Date().toISOString() },
      crossref_languages: { source: 'crossref', updated_at: new Date().toISOString() },
    };

    // Update journal with Crossref data
    const updateData = {
      ...crossrefData,
      data_provenance: updatedProvenance,
      last_enriched_at: new Date().toISOString()
    };

    console.log(`📝 Updating journals_master with Crossref data:`, Object.keys(updateData));

    const { error: updateError } = await supabase
      .from('journals_master')
      .update(updateData)
      .eq('id', journalId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully enriched journal ${journalId} with Crossref data`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Journal enriched with Crossref data',
      data: crossrefData
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