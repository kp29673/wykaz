import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// Waterfall: OpenAlex (ISSN without hyphen) -> OpenAlex (ISSN with hyphen) -> OpenAlex (title) -> Crossref -> DOAJ
async function fetchOpenAlexByISSN(issn: string, withHyphen: boolean, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const searchIssn = withHyphen ? issn : issn.replace(/[-\s]/g, '');
      const url = `https://api.openalex.org/sources?filter=issn:${searchIssn}`;
      const method = withHyphen ? 'with-hyphen' : 'no-hyphen';
      console.log(`🔍 OpenAlex ISSN search (${method}, attempt ${attempt}): ${url}`);
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'mailto:support@lovable.dev' }
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Rate limited, waiting ${waitTime}ms`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenAlex API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        console.log(`✅ OpenAlex ISSN (${method}) found: ${data.results[0].id} - ${data.results.length} results`);
        return { source: 'openalex', method: `issn_${method.replace('-', '_')}`, data: data.results[0] };
      } else {
        console.log(`❌ OpenAlex ISSN (${method}) - no results`);
      }
      return null;
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
  return null;
}

async function fetchOpenAlexByTitle(title: string, maxRetries = 3): Promise<any> {
  if (!title) return null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.openalex.org/sources?search=${encodeURIComponent(title)}`;
      console.log(`🔍 OpenAlex title search (attempt ${attempt}): ${url}`);
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'mailto:support@lovable.dev' }
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Rate limited, waiting ${waitTime}ms`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenAlex API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        console.log(`✅ OpenAlex title search found: ${data.results[0].id} - "${data.results[0].display_name}" (${data.results.length} results)`);
        return { source: 'openalex', method: 'title_search', data: data.results[0] };
      } else {
        console.log(`❌ OpenAlex title search - no results`);
      }
      return null;
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
  return null;
}

async function fetchCrossref(issn: string): Promise<any> {
  try {
    const url = `https://api.crossref.org/journals/${issn}`;
    console.log(`🔍 Crossref search: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'mailto:support@lovable.dev' }
    });

    if (response.ok) {
      const data = await response.json();
      
      const totalArticles = data.message.counts?.['total-dois'] || 
                           data.message['total-articles'] || 
                           data.message.counts?.['current-dois'] || 
                           0;
      
      console.log(`✅ Crossref found - Publisher: ${data.message.publisher}, Articles: ${totalArticles}`);
      
      return {
        source: 'crossref',
        method: 'crossref',
        data: {
          publisher: data.message.publisher,
          total_articles: totalArticles,
        }
      };
    }
  } catch (error) {
    console.log(`❌ Crossref failed for ${issn}:`, error);
  }
  return null;
}

async function fetchDOAJ(issn: string): Promise<any> {
  try {
    const url = `https://doaj.org/api/search/journals/issn:${issn}`;
    console.log(`🔍 DOAJ search: ${url}`);
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.total > 0) {
        console.log(`✅ DOAJ found - OA journal`);
        return {
          source: 'doaj',
          method: 'doaj',
          data: {
            is_oa: true,
            subjects: data.results[0].bibjson.subjects
          }
        };
      }
    }
    console.log(`❌ DOAJ - no results`);
  } catch (error) {
    console.log(`❌ DOAJ failed for ${issn}:`, error);
  }
  return null;
}

async function enrichJournalWithWaterfall(
  journalId: string, 
  issn: string, 
  title: string,
  supabase: any
): Promise<{ success: boolean; method?: string; fieldsUpdated?: string[] }> {
  const startTime = Date.now();
  console.log(`\n🔄 Starting enrichment for: "${title}" (ISSN: ${issn})`);
  
  // Try OpenAlex with ISSN (no hyphen)
  let result = await fetchOpenAlexByISSN(issn, false);
  
  // Try OpenAlex with ISSN (with hyphen) if first attempt fails
  if (!result && issn.includes('-')) {
    result = await fetchOpenAlexByISSN(issn, true);
  }
  
  // Try OpenAlex by title if ISSN methods fail
  if (!result) {
    console.log(`📝 Trying title search as fallback`);
    result = await fetchOpenAlexByTitle(title);
  }
  
  // Try Crossref if OpenAlex fails completely
  if (!result) {
    console.log(`📚 Falling back to Crossref`);
    result = await fetchCrossref(issn);
  }
  
  // Try DOAJ as last resort
  if (!result) {
    console.log(`🔓 Falling back to DOAJ`);
    result = await fetchDOAJ(issn);
  }

  if (!result) {
    console.log(`❌ No data found from any source for "${title}"`);
    return { success: false };
  }

  const { source, method, data } = result;
  console.log(`✅ Enrichment successful via ${source} (${method})`);

  // Build per-field data_provenance tracking
  const now = new Date().toISOString();
  const dataProvenance: any = {};

  // Update journal with data from the source
  const updateData: any = { 
    enrichment_method: `${source}_${method}`,
    last_enriched_at: now
  };

  if (source === 'openalex') {
    updateData.openalex_id = data.id;
    updateData.country_code = data.country_code;
    updateData.host_organization = data.host_organization_name;
    updateData.cited_by_count = data.cited_by_count;
    updateData.h_index = data.summary_stats?.h_index;
    updateData.if_proxy = data.summary_stats?.['2yr_mean_citedness'];
    updateData.works_count = data.works_count;
    updateData.is_oa = data.is_oa;
    updateData.openalex_updated_at = now;
    
    // New OpenAlex fields
    updateData.i10_index = data.summary_stats?.i10_index;
    updateData.is_core = data.is_core || false;
    updateData.is_in_doaj = data.is_in_doaj || false;
    updateData.abbreviated_title = data.abbreviated_title;
    updateData.alternate_titles = data.alternate_titles || [];
    updateData.apc_prices = data.apc_prices || [];
    updateData.apc_usd = data.apc_usd;
    updateData.homepage_url = data.homepage_url;
    updateData.host_organization_lineage = data.host_organization_lineage || [];
    updateData.societies = data.societies || [];
    updateData.source_type = data.type;
    updateData.counts_by_year = data.counts_by_year || [];
    updateData.openalex_created_date = data.created_date;
    updateData.openalex_updated_date = data.updated_date;
    updateData.works_api_url = data.works_api_url;

    // Track source for each field
    dataProvenance.h_index = { source: 'openalex', updated_at: now, method };
    dataProvenance.if_proxy = { source: 'openalex', updated_at: now, method };
    dataProvenance.cited_by_count = { source: 'openalex', updated_at: now, method };
    dataProvenance.works_count = { source: 'openalex', updated_at: now, method };
    dataProvenance.is_oa = { source: 'openalex', updated_at: now, method };
    dataProvenance.i10_index = { source: 'openalex', updated_at: now, method };
  } else if (source === 'crossref') {
    updateData.host_organization = data.publisher;
    updateData.works_count = data.total_articles;
    
    dataProvenance.host_organization = { source: 'crossref', updated_at: now };
    dataProvenance.works_count = { source: 'crossref', updated_at: now };
  } else if (source === 'doaj') {
    updateData.is_oa = data.is_oa;
    
    dataProvenance.is_oa = { source: 'doaj', updated_at: now };
  }

  updateData.data_provenance = dataProvenance;

  console.log(`📝 Updating journals_master for journal ${journalId} with:`, Object.keys(updateData));
  
  const { data: updateResult, error: updateError, count } = await supabase
    .from('journals_master')
    .update(updateData)
    .eq('id', journalId)
    .select();

  console.log(`📊 Update result: count=${count}, error=${updateError ? updateError.message : 'none'}, data=${updateResult ? 'yes' : 'no'}`);

  if (updateError) {
    console.error('❌ Update error details:', updateError);
    throw updateError;
  }

  if (!updateResult || updateResult.length === 0) {
    console.warn(`⚠️ Warning: Update succeeded but no rows were affected for journal ${journalId}`);
  } else {
    console.log(`✅ Successfully updated journal ${journalId}`);
  }

  const executionTime = Date.now() - startTime;
  const fieldsUpdated = Object.keys(updateData);

  // Log enrichment
  await supabase
    .from('openalex_enrichment_log')
    .insert({
      journal_id: journalId,
      status: 'success',
      method: method,
      fields_updated: fieldsUpdated,
      execution_time_ms: executionTime
    });

  return { success: true, method, fieldsUpdated };
}

async function processJournalsInBackground(journalIds: string[], supabase: any): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  const DELAY_MS = 110; // ~9 req/s (safely under 10 req/s OpenAlex limit)

  for (const id of journalIds) {
    try {
      // Mark as processing
      await supabase
        .from('openalex_enrichment_queue')
        .update({ status: 'processing' })
        .eq('journal_id', id);

      // Get journal ISSN and title
      const { data: journal } = await supabase
        .from('journals_master')
        .select('issn_print, issn_electronic, title')
        .eq('id', id)
        .single();

      if (!journal) {
        result.skipped++;
        await supabase
          .from('openalex_enrichment_queue')
          .update({ status: 'failed', last_error: 'Journal not found' })
          .eq('journal_id', id);
        continue;
      }

      const issn = journal.issn_print || journal.issn_electronic;
      if (!issn) {
        result.skipped++;
        await supabase
          .from('openalex_enrichment_queue')
          .update({ status: 'failed', last_error: 'No ISSN available' })
          .eq('journal_id', id);
        continue;
      }

      const enrichmentResult = await enrichJournalWithWaterfall(
        id, 
        issn, 
        journal.title,
        supabase
      );

      if (enrichmentResult.success) {
        result.success++;
        await supabase
          .from('openalex_enrichment_queue')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            enrichment_method: enrichmentResult.method 
          })
          .eq('journal_id', id);
      } else {
        result.skipped++;
        await supabase
          .from('openalex_enrichment_queue')
          .update({ status: 'failed', last_error: 'No data from any source' })
          .eq('journal_id', id);
      }

    } catch (error) {
      result.failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Journal ${id}: ${errorMsg}`);
      
      await supabase
        .from('openalex_enrichment_queue')
        .update({ 
          status: 'failed', 
          last_error: errorMsg,
          attempts: supabase.rpc('increment', { row_id: id })
        })
        .eq('journal_id', id);
    }

    // Rate limiting delay
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { journalIds } = await req.json();

    if (!journalIds || !Array.isArray(journalIds)) {
      throw new Error('journalIds array is required');
    }

    console.log(`Starting background enrichment for ${journalIds.length} journals`);

    // Return immediate response
    const response = new Response(JSON.stringify({
      status: 'started',
      total: journalIds.length,
      message: 'Enrichment started in background. Check queue status for progress.'
    }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // Process in background (doesn't block response)
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        processJournalsInBackground(journalIds, supabase)
          .then(result => {
            console.log('Enrichment completed:', result);
          })
          .catch(error => {
            console.error('Background enrichment error:', error);
          })
      );
    } else {
      // Fallback for local development
      processJournalsInBackground(journalIds, supabase)
        .then(result => console.log('Enrichment completed:', result))
        .catch(error => console.error('Background enrichment error:', error));
    }

    return response;
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
