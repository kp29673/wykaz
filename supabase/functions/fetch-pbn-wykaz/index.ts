import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PBNJournal {
  id: string;
  title: string;
  issn?: string;
  eissn?: string;
  points: number;
  year: number;
  disciplines?: Array<{
    code: string;
    name: string;
  }>;
}

interface PBNResponse {
  content: PBNJournal[];
  totalPages: number;
  totalElements: number;
  number: number;
}

interface WykazMetadata {
  wykazIdentifier: string;   // For database: "2024", "2021-v3"
  yearIdentifier: string;     // For PBN API: "2024", "2021"
  publishedDate: string;
  version?: string;
  notes?: string;
}

const AVAILABLE_WYKAZY: WykazMetadata[] = [
  { wykazIdentifier: '2024', yearIdentifier: '2024', publishedDate: '2024-01-05', notes: 'Wykaz sporządzony na podstawie projektu KEN z 29.06.2023' },
  { wykazIdentifier: '2023', yearIdentifier: '2023', publishedDate: '2023-07-17', notes: 'Rozszerzony wykaz' },
  { wykazIdentifier: '2021-v3', yearIdentifier: '2021', publishedDate: '2021-12-21', version: 'v3', notes: 'Korekta i sprostowanie' },
  { wykazIdentifier: '2021-v2', yearIdentifier: '2021', publishedDate: '2021-12-01', version: 'v2', notes: 'Aktualizacja' },
  { wykazIdentifier: '2021-v1', yearIdentifier: '2021', publishedDate: '2021-02-18', version: 'v1', notes: 'Pierwszy wykaz 2021' },
  { wykazIdentifier: '2019', yearIdentifier: '2019', publishedDate: '2019-12-18', notes: 'Wykaz bazowy' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read parameters from POST body
    const { wykaz_identifier, discipline, action = 'import' } = await req.json();

    if (!wykaz_identifier) {
      return new Response(
        JSON.stringify({ error: 'Wykaz identifier is required (e.g., "2024", "2021-v3")' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find wykaz metadata
    const wykazMeta = AVAILABLE_WYKAZY.find(w => w.wykazIdentifier === wykaz_identifier);

    if (!wykazMeta) {
      return new Response(
        JSON.stringify({ 
          error: `Unknown wykaz identifier: ${wykaz_identifier}`,
          available: AVAILABLE_WYKAZY.map(w => w.wykazIdentifier)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Starting PBN import for wykaz ${wykaz_identifier}`);
    console.log(`🔍 Querying PBN API with year=${wykazMeta.yearIdentifier}`);
    console.log(`📅 Published date: ${wykazMeta.publishedDate}`);
    console.log(`🏷️  Version: ${wykazMeta.version || 'base'}`);
    console.log(`📊 Discipline filter: ${discipline || 'all'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Action: preview (get stats without importing)
    if (action === 'preview') {
      const stats = await fetchPBNStats(wykazMeta.yearIdentifier, discipline);
      return new Response(
        JSON.stringify({ ...stats, wykaz_identifier, published_date: wykazMeta.publishedDate }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert to wykazy_metadata
    const { data: wykazRecord, error: wykazError } = await supabase
      .from('wykazy_metadata')
      .upsert({
        year_identifier: wykaz_identifier,
        published_date: wykazMeta.publishedDate,
        valid_from: wykazMeta.publishedDate,
        wykaz_version: wykazMeta.version,
        notes: wykazMeta.notes
      }, { onConflict: 'year_identifier' })
      .select()
      .single();

    if (wykazError) {
      throw new Error(`Failed to upsert wykaz metadata: ${wykazError.message}`);
    }

    console.log(`Wykaz metadata upserted: ${wykazRecord.id}`);

    // Action: import
    let allJournals: PBNJournal[] = [];
    let page = 0;
    let totalPages = 1;
    const pageSize = 100;

    while (page < totalPages) {
      console.log(`Fetching page ${page + 1}/${totalPages}`);
      
      let apiUrl = `https://pbn.nauka.gov.pl/api/journals/getMNISWJournalsUsingGET?year=${wykazMeta.yearIdentifier}&page=${page}&size=${pageSize}`;
      if (discipline) {
        apiUrl += `&discipline=${encodeURIComponent(discipline)}`;
      }

      console.log(`🌐 API request: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        console.error(`❌ PBN API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error body: ${errorText}`);
        throw new Error(`PBN API error: ${response.status} ${response.statusText}`);
      }

      const data: PBNResponse = await response.json();
      allJournals = allJournals.concat(data.content);
      totalPages = data.totalPages;
      page++;

      // Rate limiting protection
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`Fetched ${allJournals.length} journals from PBN API`);

    // Import to normalized structure (journals_master + journal_rankings)
    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < allJournals.length; i += batchSize) {
      const batch = allJournals.slice(i, i + batchSize);
      
      for (const pbnJournal of batch) {
        try {
          const normalizeISSN = (issn?: string) => 
            issn?.trim().toUpperCase().replace(/\s+/g, '') || null;

          const disciplines = pbnJournal.disciplines?.map(d => d.name) || [];
          const disciplineCodes = pbnJournal.disciplines?.map(d => d.code) || [];

          // Step 1: Upsert to journals_master (metadata)
          const { error: masterError } = await supabase
            .from('journals_master')
            .upsert({
              journal_id: pbnJournal.id,
              title: pbnJournal.title.trim(),
              issn_print: normalizeISSN(pbnJournal.issn),
              issn_electronic: normalizeISSN(pbnJournal.eissn),
              data_source: 'pbn_api',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'journal_id',
              ignoreDuplicates: false // Update metadata if exists
            });

          if (masterError) throw masterError;

          // Step 2: Upsert to journal_rankings (points for wykaz period)
          const { error: rankingError } = await supabase
            .from('journal_rankings')
            .upsert({
              journal_id: pbnJournal.id,
              wykaz_id: wykazRecord.id,
              wykaz_identifier: wykazMeta.wykazIdentifier,
              year: parseInt(wykazMeta.yearIdentifier),
              points: pbnJournal.points,
              disciplines: disciplines.length > 0 ? disciplines : null,
              discipline_codes: disciplineCodes.length > 0 ? disciplineCodes : null,
              published_date: wykazMeta.publishedDate,
              source_file: `PBN API - ${wykazMeta.wykazIdentifier}`,
              data_source: 'pbn_api',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'journal_id,wykaz_id',
              ignoreDuplicates: false // Update if exists
            });

          if (rankingError) throw rankingError;

          imported++;
        } catch (err: any) {
          errors++;
          errorDetails.push({
            title: pbnJournal.title,
            error: err.message
          });
          console.error(`Error processing journal ${pbnJournal.title}:`, err);
        }
      }

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allJournals.length / batchSize)}`);
    }

    const result = {
      success: true,
      imported,
      updated,
      errors,
      total: allJournals.length,
      errorDetails: errorDetails.slice(0, 10), // First 10 errors
    };

    console.log('Import completed:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in fetch-pbn-wykaz:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchPBNStats(year: string, discipline?: string | null): Promise<any> {
  let apiUrl = `https://pbn.nauka.gov.pl/api/journals/getMNISWJournalsUsingGET?year=${year}&page=0&size=1`;
  if (discipline) {
    apiUrl += `&discipline=${encodeURIComponent(discipline)}`;
  }

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`PBN API error: ${response.status}`);
  }

  const data: PBNResponse = await response.json();
  return {
    totalJournals: data.totalElements,
    totalPages: data.totalPages,
    year,
    discipline: discipline || 'all'
  };
}
