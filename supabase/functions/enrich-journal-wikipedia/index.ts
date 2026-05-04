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

    console.log(`📚 Starting Wikipedia enrichment for journal: ${journalId}`);

    // Find journal by UUID or journal_id
    let journal;
    const { data: byId } = await supabase
      .from('journals_master')
      .select('id, journal_id, title, issn_print, issn_electronic, data_provenance')
      .eq('id', journalId)
      .maybeSingle();

    if (byId) {
      journal = byId;
    } else {
      const { data: byJournalId } = await supabase
        .from('journals_master')
        .select('id, journal_id, title, issn_print, issn_electronic, data_provenance')
        .eq('journal_id', journalId)
        .maybeSingle();
      
      if (byJournalId) {
        journal = byJournalId;
      }
    }

    if (!journal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Journal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issn = journal.issn_print || journal.issn_electronic;
    if (!issn) {
      return new Response(
        JSON.stringify({ success: false, error: 'No ISSN found for journal' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Searching Wikidata for ISSN: ${issn}`);

    // SPARQL query with language priority: pl > en > other
    const sparqlQuery = `
      SELECT ?journal ?journalLabel ?article ?articleTitle ?articleLang WHERE {
        { ?journal wdt:P236 "${issn}". }
        ?article schema:about ?journal;
                 schema:isPartOf ?wikipediaProject;
                 schema:name ?articleTitle;
                 schema:inLanguage ?articleLang.
        FILTER(CONTAINS(STR(?wikipediaProject), "wikipedia.org"))
        SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". }
      }
      ORDER BY DESC(?articleLang = "pl") DESC(?articleLang = "en")
      LIMIT 1
    `;

    const wikidataUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}`;
    
    const wikidataResponse = await fetch(wikidataUrl, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'WykazMEiN/1.0 (https://wykaz.lovable.app)'
      }
    });

    if (!wikidataResponse.ok) {
      console.error('Wikidata query failed:', wikidataResponse.statusText);
      return new Response(
        JSON.stringify({ success: false, error: 'Wikidata query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wikidataData = await wikidataResponse.json();
    const bindings = wikidataData.results?.bindings || [];

    if (bindings.length === 0) {
      console.log('ℹ️ No Wikipedia article found for this journal');
      
      // Mark as checked even if not found
      await supabase
        .from('journals_master')
        .update({
          wikipedia_checked_at: new Date().toISOString()
        })
        .eq('id', journal.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No Wikipedia article found',
          hasArticle: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = bindings[0];
    const wikidataId = result.journal.value.split('/').pop(); // Extract Q-ID
    const wikipediaUrl = result.article.value;
    const wikipediaLang = result.articleLang.value;
    const wikipediaTitle = result.articleTitle.value;

    console.log(`✅ Found Wikipedia article: ${wikipediaUrl} (${wikipediaLang})`);

    // Update journals_master with Wikipedia metadata
    const updatedProvenance = {
      ...(journal.data_provenance || {}),
      wikidata_id: {
        source: 'wikidata',
        updated_at: new Date().toISOString(),
        method: 'issn_sparql'
      }
    };

    const { error: updateError } = await supabase
      .from('journals_master')
      .update({
        wikidata_id: wikidataId,
        wikipedia_url: wikipediaUrl,
        wikipedia_lang: wikipediaLang,
        wikipedia_title: wikipediaTitle,
        wikipedia_checked_at: new Date().toISOString(),
        data_provenance: updatedProvenance
      })
      .eq('id', journal.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update journal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        hasArticle: true,
        data: {
          wikidata_id: wikidataId,
          wikipedia_url: wikipediaUrl,
          wikipedia_lang: wikipediaLang,
          wikipedia_title: wikipediaTitle
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-journal-wikipedia:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
