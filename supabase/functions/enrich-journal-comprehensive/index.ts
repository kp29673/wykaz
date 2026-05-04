import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ISSNPortalData {
  issn_l?: string;
  title?: string;
  publisher?: string;
  country?: string;
  medium?: string;
}

interface DOAJData {
  oa_status?: string;
  license?: string;
  apc_amount?: number;
  apc_currency?: string;
  journal_url?: string;
}

interface CrossrefData {
  publisher?: string;
  journal_url?: string;
}

interface SherpaRomeoData {
  preprint_allowed?: boolean;
  postprint_allowed?: boolean;
  publisher_pdf_allowed?: boolean;
  embargo_months?: number;
}

async function fetchISSNPortal(issn: string): Promise<ISSNPortalData | null> {
  // Try both with and without hyphen
  const issnVariants = [
    issn,
    issn.replace(/-/g, '').replace(/(\d{4})(\d{4})/, '$1-$2') // Add hyphen if missing
  ];
  
  for (const issnVariant of [...new Set(issnVariants)]) {
    try {
      console.log(`📚 Trying ISSN Portal with: ${issnVariant}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`https://portal.issn.org/resource/ISSN/${issnVariant}`, {
        headers: {
          'Accept': 'application/ld+json, application/json',
          'User-Agent': 'Lovable-Journal-Enrichment/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`❌ ISSN Portal returned ${response.status} for ${issnVariant}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        console.log(`❌ ISSN Portal returned non-JSON (${contentType}) for ${issnVariant}`);
        continue;
      }

      const data = await response.json();
      const graph = data['@graph']?.[0];
      
      if (!graph) {
        console.log(`❌ ISSN Portal: No graph data for ${issnVariant}`);
        continue;
      }
      
      console.log(`✅ ISSN Portal success with ${issnVariant}`);
      return {
        issn_l: graph['http://id.loc.gov/ontologies/bibframe/identifiedBy']?.[0]?.['@id']?.split('/')?.pop() || null,
        title: graph['http://id.loc.gov/ontologies/bibframe/title']?.[0]?.['@value'] || null,
        publisher: graph['http://purl.org/dc/terms/publisher']?.[0]?.['@value'] || null,
        country: graph['http://purl.org/ontology/bibo/country']?.[0]?.['@id']?.split('/')?.pop() || null,
        medium: graph['http://purl.org/ontology/bibo/medium']?.[0]?.['@value'] || null
      };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error fetching ISSN Portal for ${issnVariant}:`, message);
        continue;
      }
  }
  
  console.log(`❌ ISSN Portal: All attempts failed for ${issn}`);
  return null;
}

async function fetchDOAJ(issn: string): Promise<DOAJData | null> {
  try {
    console.log(`Fetching DOAJ data for ${issn}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`https://doaj.org/api/v2/search/journals/issn:${issn}`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`DOAJ returned ${response.status} for ${issn}`);
      return null;
    }

    const data = await response.json();
    const journal = data.results?.[0];
    
    if (!journal) {
      return null;
    }

    const bibjson = journal.bibjson;
    
    return {
      oa_status: 'gold', // If in DOAJ, it's gold OA
      license: bibjson?.license?.[0]?.type || undefined,
      apc_amount: bibjson?.apc?.has_apc && bibjson?.apc?.max?.[0]?.price ? parseFloat(bibjson.apc.max[0].price) : undefined,
      apc_currency: bibjson?.apc?.has_apc ? bibjson?.apc?.max?.[0]?.currency : undefined,
      journal_url: bibjson?.ref?.journal || bibjson?.editorial?.review_url || undefined
    };
  } catch (error) {
    console.error(`Error fetching DOAJ for ${issn}:`, error);
    return null;
  }
}

async function fetchCrossref(issn: string): Promise<CrossrefData | null> {
  try {
    console.log(`Fetching Crossref data for ${issn}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`https://api.crossref.org/journals/${issn}`, {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Crossref returned ${response.status} for ${issn}`);
      return null;
    }

    const data = await response.json();
    const message = data.message;
    
    return {
      publisher: message?.publisher || null,
      journal_url: message?.URL || null
    };
  } catch (error) {
    console.error(`Error fetching Crossref for ${issn}:`, error);
    return null;
  }
}

async function fetchSherpaRomeo(issn: string): Promise<SherpaRomeoData | null> {
  try {
    console.log(`📖 Fetching Sherpa Romeo data for ${issn}`);
    
    // Try to get API key from env, fallback to demo
    const apiKey = Deno.env.get('SHERPA_ROMEO_API_KEY') || 'demo';
    if (apiKey === 'demo') {
      console.log(`⚠️ Using demo API key for Sherpa Romeo (limited functionality)`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Try both ISSN formats
    const issnVariants = [
      issn,
      issn.replace(/-/g, '') // Try without hyphen
    ];
    
    for (const issnVariant of [...new Set(issnVariants)]) {
      try {
        const url = `https://v2.sherpa.ac.uk/cgi/retrieve_by_id?item-type=publication&api-key=${apiKey}&identifier=${issnVariant}&format=Json`;
        console.log(`📖 Trying Sherpa Romeo with: ${issnVariant}`);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        if (!response.ok) {
          console.log(`❌ Sherpa Romeo returned ${response.status} for ${issnVariant}`);
          continue;
        }

        const data = await response.json();
        const policies = data.items?.[0]?.publisher_policy?.[0];
        
        if (!policies) {
          console.log(`❌ Sherpa Romeo: No policies found for ${issnVariant}`);
          continue;
        }

        const preprint = policies.permitted_oa?.find((p: any) => p.article_version?.[0] === 'submitted');
        const postprint = policies.permitted_oa?.find((p: any) => p.article_version?.[0] === 'accepted');
        const published = policies.permitted_oa?.find((p: any) => p.article_version?.[0] === 'published');
        
        console.log(`✅ Sherpa Romeo success with ${issnVariant}`);
        clearTimeout(timeoutId);
        return {
          preprint_allowed: preprint ? true : undefined,
          postprint_allowed: postprint ? true : undefined,
          publisher_pdf_allowed: published ? true : undefined,
          embargo_months: postprint?.embargo?.amount || undefined
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error with Sherpa Romeo variant ${issnVariant}:`, message);
        continue;
      }
    }
    
    clearTimeout(timeoutId);
    console.log(`❌ Sherpa Romeo: All attempts failed for ${issn}`);
    return null;
  } catch (error) {
    console.error(`❌ Error fetching Sherpa Romeo for ${issn}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { journalId } = await req.json();

    if (!journalId) {
      return new Response(
        JSON.stringify({ error: 'journalId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting comprehensive enrichment for journal ${journalId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch journal
    const { data: journal, error: fetchError } = await supabase
      .from('journals')
      .select('*')
      .eq('id', journalId)
      .single();

    if (fetchError || !journal) {
      throw new Error(`Journal not found: ${fetchError?.message}`);
    }

    const issn = journal.issn_print || journal.issn_electronic;
    if (!issn) {
      throw new Error('No ISSN found for journal');
    }

    // Fetch from all sources (with delays for rate limiting)
    const [issnPortalData, doajData, crossrefData, sherpaData] = await Promise.all([
      fetchISSNPortal(issn),
      new Promise<DOAJData | null>(resolve => setTimeout(() => resolve(fetchDOAJ(issn)), 300)),
      new Promise<CrossrefData | null>(resolve => setTimeout(() => resolve(fetchCrossref(issn)), 500)),
      new Promise<SherpaRomeoData | null>(resolve => setTimeout(() => resolve(fetchSherpaRomeo(issn)), 700))
    ]);

    // Merge data with source priority and track provenance
    const updates: any = {
      last_enriched_at: new Date().toISOString(),
      sources_metadata: {
        issn_portal: issnPortalData ? { fetched: true, timestamp: new Date().toISOString() } : { fetched: false },
        doaj: doajData ? { fetched: true, timestamp: new Date().toISOString() } : { fetched: false },
        crossref: crossrefData ? { fetched: true, timestamp: new Date().toISOString() } : { fetched: false },
        sherpa_romeo: sherpaData ? { fetched: true, timestamp: new Date().toISOString() } : { fetched: false }
      },
      data_provenance: {} as Record<string, string>
    };

    // Apply data with priority and track provenance - only set if value exists and is not null
    if (issnPortalData) {
      if (issnPortalData.issn_l) {
        updates.issn_l = issnPortalData.issn_l;
        updates.data_provenance.issn_l = 'issn_portal';
      }
      if (issnPortalData.publisher) {
        updates.publisher = issnPortalData.publisher;
        updates.data_provenance.publisher = 'issn_portal';
      }
      if (issnPortalData.country) {
        updates.country = issnPortalData.country;
        updates.data_provenance.country = 'issn_portal';
      }
      if (issnPortalData.medium) {
        updates.medium = issnPortalData.medium;
        updates.data_provenance.medium = 'issn_portal';
      }
    }

    if (doajData) {
      if (doajData.oa_status) {
        updates.oa_status = doajData.oa_status;
        updates.data_provenance.oa_status = 'doaj';
      }
      if (doajData.license) {
        updates.license = doajData.license;
        updates.data_provenance.license = 'doaj';
      }
      if (doajData.apc_amount !== null) {
        updates.apc_amount = doajData.apc_amount;
        updates.data_provenance.apc_amount = 'doaj';
      }
      if (doajData.apc_currency) {
        updates.apc_currency = doajData.apc_currency;
        updates.data_provenance.apc_currency = 'doaj';
      }
      if (doajData.journal_url) {
        updates.journal_url = doajData.journal_url;
        updates.data_provenance.journal_url = 'doaj';
      }
    }

    // Crossref as fallback for publisher and URL
    if (crossrefData) {
      if (!updates.publisher && crossrefData.publisher) {
        updates.publisher = crossrefData.publisher;
        updates.data_provenance.publisher = 'crossref';
      }
      if (!updates.journal_url && crossrefData.journal_url) {
        updates.journal_url = crossrefData.journal_url;
        updates.data_provenance.journal_url = 'crossref';
      }
    }

    if (sherpaData) {
      if (sherpaData.preprint_allowed !== null && sherpaData.preprint_allowed !== undefined) {
        updates.preprint_allowed = sherpaData.preprint_allowed;
        updates.data_provenance.preprint_allowed = 'sherpa_romeo';
      }
      if (sherpaData.postprint_allowed !== null && sherpaData.postprint_allowed !== undefined) {
        updates.postprint_allowed = sherpaData.postprint_allowed;
        updates.data_provenance.postprint_allowed = 'sherpa_romeo';
      }
      if (sherpaData.publisher_pdf_allowed !== null && sherpaData.publisher_pdf_allowed !== undefined) {
        updates.publisher_pdf_allowed = sherpaData.publisher_pdf_allowed;
        updates.data_provenance.publisher_pdf_allowed = 'sherpa_romeo';
      }
      if (sherpaData.embargo_months !== null) {
        updates.embargo_months = sherpaData.embargo_months;
        updates.data_provenance.embargo_months = 'sherpa_romeo';
      }
    }

    // Update journal
    const { error: updateError } = await supabase
      .from('journals')
      .update(updates)
      .eq('id', journalId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Successfully enriched journal ${journalId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        journalId,
        enriched: {
          issn_portal: !!issnPortalData,
          doaj: !!doajData,
          crossref: !!crossrefData,
          sherpa_romeo: !!sherpaData
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in comprehensive enrichment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
