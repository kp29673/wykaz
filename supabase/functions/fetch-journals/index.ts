import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const journalIdParam = url.searchParams.get('journal_id');
    const q = url.searchParams.get('q');
    const minPoints = url.searchParams.get('minPoints');
    const maxPoints = url.searchParams.get('maxPoints');
    const disciplines = url.searchParams.get('disciplines'); // Now comma-separated list
    const oa_status = url.searchParams.get('oa_status');
    const apc_range = url.searchParams.get('apc_range');
    const erih_plus = url.searchParams.get('erih_plus');
    const has_doaj = url.searchParams.get('has_doaj');
    const country_codes = url.searchParams.get('country_codes');
    const sort_by = url.searchParams.get('sort_by') || 'points';
    const sort_order = url.searchParams.get('sort_order') || 'desc';

    // Minimal columns for fast search queries
    const minimalSelectColumns = `
      id, journal_id, title, issn_print, issn_electronic, issn_l,
      publisher, country_code, is_oa, oa_status, h_index, if_proxy,
      apc_amount, apc_currency, in_erih_plus, doaj_seal,
      openalex_updated_at, crossref_updated_at, doaj_updated_at, wikipedia_checked_at
    `.replace(/\s+/g, ' ').trim();

    console.log('Search params:', { q, minPoints, maxPoints, disciplines, oa_status, sort_by, sort_order });

    // Single journal mode - fetch fresh data for one journal
    if (journalIdParam) {
      // Detect if journalIdParam is UUID or ISSN
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(journalIdParam);
      
      let journalData = null;
      if (isUUID) {
        const { data } = await supabase
          .from('journals_master')
          .select('*')
          .eq('id', journalIdParam)
          .maybeSingle();
        journalData = data;
      } else {
        const { data } = await supabase
          .from('journals_master')
          .select('*')
          .eq('journal_id', journalIdParam)
          .maybeSingle();
        journalData = data;
      }
      
      if (!journalData) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Fetch latest wykaz first
      const { data: latestWykaz } = await supabase
        .from('wykazy_metadata')
        .select('id, year_identifier, published_date, source_url, valid_from, valid_to')
        .order('published_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Check if journal is in CURRENT wykaz (not any wykaz!)
      const { data: currentRanking } = await supabase
        .from('journal_rankings')
        .select('points, disciplines, discipline_codes, wykaz_id')
        .eq('journal_id', journalData.journal_id)
        .eq('wykaz_id', latestWykaz?.id)
        .maybeSingle();

      const isInCurrentWykaz = !!currentRanking;

      const transformed = {
        id: journalData.id,
        journal_id: journalData.journal_id,
        title: journalData.title || '',
        title_2: journalData.title_2,
        abbreviated_title: journalData.abbreviated_title,
        issn_print: journalData.issn_print,
        issn_electronic: journalData.issn_electronic,
        issn_print_2: journalData.issn_print_2,
        issn_electronic_2: journalData.issn_electronic_2,
        issn_l: journalData.issn_l,
        publisher: journalData.publisher,
        country: journalData.country,
        country_code: journalData.country_code,
        medium: journalData.medium,
        oa_status: journalData.oa_status,
        is_oa: journalData.is_oa,
        license: journalData.license,
        apc_amount: journalData.apc_amount,
        apc_currency: journalData.apc_currency,
        journal_url: journalData.journal_url,
        in_erih_plus: journalData.in_erih_plus,
        in_road: journalData.in_road,
        openalex_id: journalData.openalex_id,
        host_organization: journalData.host_organization,
        works_count: journalData.works_count,
        cited_by_count: journalData.cited_by_count,
        h_index: journalData.h_index,
        i10_index: journalData.i10_index,
        if_proxy: journalData.if_proxy,
        if_proxy_source: journalData.if_proxy_source,
        impact_factor: journalData.impact_factor,
        impact_factor_source: journalData.impact_factor_source,
        sjr: journalData.sjr,
        sjr_source: journalData.sjr_source,
        snip: journalData.snip,
        snip_source: journalData.snip_source,
        openalex_updated_at: journalData.openalex_updated_at,
        crossref_total_dois: journalData.crossref_total_dois,
        crossref_current_dois: journalData.crossref_current_dois,
        crossref_backfile_dois: journalData.crossref_backfile_dois,
        crossref_member_id: journalData.crossref_member_id,
        crossref_publisher: journalData.crossref_publisher,
        crossref_publisher_location: journalData.crossref_publisher_location,
        crossref_updated_at: journalData.crossref_updated_at,
        crossref_subjects: journalData.crossref_subjects,
        crossref_languages: journalData.crossref_languages,
        crossref_issn_type: journalData.crossref_issn_type,
        crossref_coverage_depth: journalData.crossref_coverage_depth,
        crossref_coverage_type: journalData.crossref_coverage_type,
        crossref_breakdowns: journalData.crossref_breakdowns,
        crossref_affiliations: journalData.crossref_affiliations,
        is_in_doaj: journalData.is_in_doaj,
        doaj_seal: journalData.doaj_seal,
        doaj_review_process: journalData.doaj_review_process,
        doaj_plagiarism_check: journalData.doaj_plagiarism_check,
        doaj_updated_at: journalData.doaj_updated_at,
        doaj_editorial_board_url: journalData.doaj_editorial_board_url,
        doaj_author_instructions_url: journalData.doaj_author_instructions_url,
        doaj_aims_scope: journalData.doaj_aims_scope,
        doaj_publication_time_weeks: journalData.doaj_publication_time_weeks,
        doaj_keywords: journalData.doaj_keywords,
        doaj_languages: journalData.doaj_languages,
        wikidata_id: journalData.wikidata_id,
        wikipedia_url: journalData.wikipedia_url,
        wikipedia_lang: journalData.wikipedia_lang,
        wikipedia_title: journalData.wikipedia_title,
        wikipedia_checked_at: journalData.wikipedia_checked_at,
        data_provenance: journalData.data_provenance,
        // MEiN data - based on CURRENT wykaz only
        points: isInCurrentWykaz ? currentRanking.points : 0,
        in_current_wykaz: isInCurrentWykaz,
        year: latestWykaz?.published_date ? new Date(latestWykaz.published_date).getFullYear() : new Date().getFullYear(),
        published_date: latestWykaz?.published_date,
        disciplines: currentRanking?.disciplines,
        discipline_codes: currentRanking?.discipline_codes,
        wykaz_identifier: latestWykaz?.year_identifier,
        wykaz_valid_from: latestWykaz?.valid_from,
        wykaz_valid_to: latestWykaz?.valid_to,
        wykaz_source_url: latestWykaz?.source_url,
        year_identifier: latestWykaz?.year_identifier,
      };

      return new Response(JSON.stringify([transformed]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch latest wykaz (may be null)
    const { data: latestWykaz, error: wykazError } = await supabase
      .from('wykazy_metadata')
      .select('id, year_identifier, published_date, source_url')
      .order('published_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wykazError) {
      console.error('Error fetching wykaz:', wykazError);
    }

    // 2. Prepare containers for journals and rankings
    let journalsData: any[] = [];
    let rankingsData: any[] = [];

    const hasSearchText = !!(q && q.trim());
    const disciplineFilter = disciplines
      ?.split(',')
      .map((d) => d.trim())
      .filter(Boolean) ?? [];

    if (hasSearchText) {
      // SEARCH MODE: Smart search with pattern recognition
      let journalQuery = supabase
        .from('journals_master')
        .select(minimalSelectColumns);

      const normalized = q!.trim();
      
      // Detect ISSN pattern (e.g., 1234-5678 or 12345678)
      const isIssnPattern = /^\d{4}-?\d{3}[\dXx]$/i.test(normalized);
      
      if (isIssnPattern) {
        // ISSN search: Use exact match (very fast with B-tree indexes)
        const cleanIssn = normalized.replace('-', '');
        const formattedIssn = `${cleanIssn.slice(0, 4)}-${cleanIssn.slice(4)}`;
        
        journalQuery = journalQuery.or(
          `issn_print.eq.${formattedIssn},` +
          `issn_electronic.eq.${formattedIssn},` +
          `issn_l.eq.${formattedIssn},` +
          `issn_print.eq.${cleanIssn},` +
          `issn_electronic.eq.${cleanIssn},` +
          `issn_l.eq.${cleanIssn}`
        );
      } else {
        // Text search: Use prefix match (fast with B-tree indexes)
        journalQuery = journalQuery.ilike('title', `${normalized}%`);
      }

      // Filters that live on journals_master
      if (oa_status) {
        const statuses = oa_status
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (statuses.length > 0) {
          journalQuery = journalQuery.in('oa_status', statuses);
        }
      }

      if (erih_plus === 'true') {
        journalQuery = journalQuery.eq('in_erih_plus', true);
      }

      if (has_doaj === 'true') {
        journalQuery = journalQuery.eq('is_in_doaj', true);
      }

      if (country_codes) {
        const codes = country_codes
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean);
        if (codes.length > 0) {
          journalQuery = journalQuery.in('country_code', codes);
        }
      }

      // APC range filter
      if (apc_range === 'none') {
        journalQuery = journalQuery.is('apc_amount', null);
      } else if (apc_range === 'low') {
        journalQuery = journalQuery.lte('apc_amount', 500);
      } else if (apc_range === 'medium') {
        journalQuery = journalQuery.gte('apc_amount', 500).lte('apc_amount', 1500);
      } else if (apc_range === 'high') {
        journalQuery = journalQuery.gt('apc_amount', 1500);
      }

      // Basic sorting on SQL level for search (non-points)
      if (sort_by === 'title') {
        journalQuery = journalQuery.order('title', { ascending: sort_order === 'asc' });
      } else if (sort_by === 'if_proxy') {
        journalQuery = journalQuery.order('if_proxy', { ascending: sort_order === 'asc', nullsFirst: false });
      } else if (sort_by === 'h_index') {
        journalQuery = journalQuery.order('h_index', { ascending: sort_order === 'asc', nullsFirst: false });
      }

      journalQuery = journalQuery.limit(30); // Reduced to 30 for database stability

      const { data: journals, error: journalsError } = await journalQuery;

      if (journalsError) {
        console.error('Error fetching journals (search mode):', journalsError);
        // Handle database timeout gracefully
        if (journalsError.code === '57014' || journalsError.message?.includes('timeout')) {
          return new Response(JSON.stringify({ 
            data: [], 
            timeout: true,
            hasMore: false,
            error: 'Wyszukiwanie trwa zbyt długo. Spróbuj bardziej precyzyjnego zapytania (np. początku tytułu lub pełnego ISSN).'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          });
        }
        throw journalsError;
      }

      journalsData = journals ?? [];

      // Fetch MEiN rankings for the matched journals (efficient IN query for small list)
      const journalIds = journalsData
        .map((j) => j.journal_id)
        .filter((id: string | null) => !!id);

      if (journalIds.length > 0 && latestWykaz?.id) {
        const { data: rankings, error: rankingsError } = await supabase
          .from('journal_rankings')
          .select('id, journal_id, points, disciplines, discipline_codes')
          .eq('wykaz_id', latestWykaz.id)
          .in('journal_id', journalIds);
        
        if (!rankingsError) {
          rankingsData = rankings ?? [];
        } else {
          console.warn('Rankings fetch in search mode failed:', rankingsError);
          rankingsData = [];
        }
      } else {
        rankingsData = [];
      }

    } else {
      // BROWSE MODE: start from journal_rankings and then join journals_master
      if (latestWykaz?.id) {
        let rankingsQuery = supabase
          .from('journal_rankings')
          .select('id, journal_id, points, disciplines, discipline_codes')
          .eq('wykaz_id', latestWykaz.id);

        if (minPoints) {
          rankingsQuery = rankingsQuery.gte('points', parseInt(minPoints, 10));
        }
        if (maxPoints) {
          rankingsQuery = rankingsQuery.lte('points', parseInt(maxPoints, 10));
        }

        if (disciplineFilter.length > 0) {
          rankingsQuery = rankingsQuery.contains('discipline_codes', disciplineFilter);
        }

        // Always sort by points in browse mode; we'll re-sort later if needed
        rankingsQuery = rankingsQuery.order('points', { ascending: false }).limit(50);

        const { data: rankings, error: rankingsError } = await rankingsQuery;

        if (rankingsError) {
          console.error('Rankings query error (browse mode):', rankingsError);
          // Handle database timeout in browse mode
          if (rankingsError.code === '57014' || rankingsError.message?.includes('timeout')) {
            return new Response(JSON.stringify({ 
              data: [], 
              timeout: true,
              hasMore: false,
              error: 'Baza danych jest przeciążona. Spróbuj ponownie za chwilę.'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            });
          }
          throw rankingsError;
        }

        rankingsData = rankings ?? [];

        const journalIds = rankingsData
          .map((r) => r.journal_id)
          .filter((id: string | null) => !!id);

        if (journalIds.length > 0) {
          let journalsQuery = supabase
            .from('journals_master')
            .select('*')
            .in('journal_id', journalIds);

          // Filters that live on journals_master
          if (oa_status) {
            const statuses = oa_status
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            if (statuses.length > 0) {
              journalsQuery = journalsQuery.in('oa_status', statuses);
            }
          }

          if (erih_plus === 'true') {
            journalsQuery = journalsQuery.eq('in_erih_plus', true);
          }

          if (has_doaj === 'true') {
            journalsQuery = journalsQuery.eq('is_in_doaj', true);
          }

          if (country_codes) {
            const codes = country_codes
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean);
            if (codes.length > 0) {
              journalsQuery = journalsQuery.in('country_code', codes);
            }
          }

          // APC range filter
          if (apc_range === 'none') {
            journalsQuery = journalsQuery.is('apc_amount', null);
          } else if (apc_range === 'low') {
            journalsQuery = journalsQuery.lte('apc_amount', 500);
          } else if (apc_range === 'medium') {
            journalsQuery = journalsQuery.gte('apc_amount', 500).lte('apc_amount', 1500);
          } else if (apc_range === 'high') {
            journalsQuery = journalsQuery.gt('apc_amount', 1500);
          }

          const { data: journals, error: journalsError } = await journalsQuery;

          if (journalsError) {
            console.error('Journals query error (browse mode):', journalsError);
            throw journalsError;
          }

          journalsData = journals ?? [];
        }
      } else {
        // Fallback: no wykaz, just return empty set to avoid heavy queries
        journalsData = [];
        rankingsData = [];
      }
    }

    // Create a map for quick lookup
    const journalsMap = new Map();
    journalsData?.forEach((j: any) => {
      journalsMap.set(j.journal_id, j);
    });

    // Create a set of journal_ids that have rankings
    const rankedJournalIds = new Set(rankingsData.map((r: any) => r.journal_id));

    const rankedData = rankingsData
      .filter((r: any) => journalsMap.has(r.journal_id))
      .map((r: any) => {
        const j = journalsMap.get(r.journal_id);
        return {
          id: r.id,
          journal_id: j.journal_id,
          title: j.title,
          issn_print: j.issn_print,
          issn_electronic: j.issn_electronic,
          issn_l: j.issn_l,
          points: r.points || 0,
          year: latestWykaz?.year_identifier ?? null,
          published_date: latestWykaz?.published_date ?? null,
          wykaz_source_url: latestWykaz?.source_url ?? null,
          wykaz_identifier: latestWykaz?.year_identifier ?? null,
          discipline: r.disciplines?.[0] ?? null,
          disciplines: r.disciplines?.join(', ') ?? null,
          in_current_wykaz: true,
          if_proxy: j.if_proxy,
          h_index: j.h_index,
          is_oa: j.is_oa,
          works_count: j.works_count,
          openalex_id: j.openalex_id,
          country_code: j.country_code,
          host_organization: j.host_organization,
          cited_by_count: j.cited_by_count,
          enrichment_method: j.enrichment_method,
          openalex_updated_at: j.openalex_updated_at,
          publisher: j.publisher,
          country: j.country,
          medium: j.medium,
          oa_status: j.oa_status,
          license: j.license,
          apc_amount: j.apc_amount,
          apc_currency: j.apc_currency,
          journal_url: j.journal_url,
          preprint_allowed: j.preprint_allowed,
          postprint_allowed: j.postprint_allowed,
          publisher_pdf_allowed: j.publisher_pdf_allowed,
          embargo_months: j.embargo_months,
          in_erih_plus: j.in_erih_plus,
          in_road: j.in_road,
          preservation_status: j.preservation_status,
          papers_5y: j.papers_5y,
          avg_citations_per_paper: j.avg_citations_per_paper,
          composite_score: j.composite_score,
          last_enriched_at: j.last_enriched_at,
          sources_metadata: j.sources_metadata,
          crossref_total_dois: j.crossref_total_dois,
          crossref_current_dois: j.crossref_current_dois,
          crossref_backfile_dois: j.crossref_backfile_dois,
          crossref_publisher: j.crossref_publisher,
          crossref_updated_at: j.crossref_updated_at,
          crossref_subjects: j.crossref_subjects,
          crossref_languages: j.crossref_languages,
          crossref_member_id: j.crossref_member_id,
          crossref_publisher_location: j.crossref_publisher_location,
          crossref_issn_type: j.crossref_issn_type,
          crossref_coverage_depth: j.crossref_coverage_depth,
          crossref_coverage_type: j.crossref_coverage_type,
          crossref_breakdowns: j.crossref_breakdowns,
          crossref_affiliations: j.crossref_affiliations,
          doaj_seal: j.doaj_seal,
          is_in_doaj: j.is_in_doaj,
          doaj_review_process: j.doaj_review_process,
          doaj_plagiarism_check: j.doaj_plagiarism_check,
          doaj_editorial_board_url: j.doaj_editorial_board_url,
          doaj_author_instructions_url: j.doaj_author_instructions_url,
          doaj_aims_scope: j.doaj_aims_scope,
          doaj_publication_time_weeks: j.doaj_publication_time_weeks,
          doaj_keywords: j.doaj_keywords,
          doaj_languages: j.doaj_languages,
          doaj_updated_at: j.doaj_updated_at,
          wikidata_id: j.wikidata_id,
          wikipedia_url: j.wikipedia_url,
          wikipedia_lang: j.wikipedia_lang,
          wikipedia_title: j.wikipedia_title,
          wikipedia_checked_at: j.wikipedia_checked_at,
          data_provenance: j.data_provenance,
        };
      });

    // Add unranked journals (from search only) with points: 0, in_current_wykaz: false
    const unrankedData = journalsData
      .filter((j: any) => !rankedJournalIds.has(j.journal_id))
      .map((j: any) => ({
        id: null,
        journal_id: j.journal_id,
        title: j.title,
        issn_print: j.issn_print,
        issn_electronic: j.issn_electronic,
        issn_l: j.issn_l,
        points: 0,
        year: latestWykaz?.year_identifier ?? null,
        published_date: latestWykaz?.published_date ?? null,
        wykaz_source_url: latestWykaz?.source_url ?? null,
        wykaz_identifier: latestWykaz?.year_identifier ?? null,
        discipline: null,
        disciplines: null,
        in_current_wykaz: false,
        if_proxy: j.if_proxy,
        h_index: j.h_index,
        is_oa: j.is_oa,
        works_count: j.works_count,
        openalex_id: j.openalex_id,
        country_code: j.country_code,
        host_organization: j.host_organization,
        cited_by_count: j.cited_by_count,
        enrichment_method: j.enrichment_method,
        openalex_updated_at: j.openalex_updated_at,
        publisher: j.publisher,
        country: j.country,
        medium: j.medium,
        oa_status: j.oa_status,
        license: j.license,
        apc_amount: j.apc_amount,
        apc_currency: j.apc_currency,
        journal_url: j.journal_url,
        preprint_allowed: j.preprint_allowed,
        postprint_allowed: j.postprint_allowed,
        publisher_pdf_allowed: j.publisher_pdf_allowed,
        embargo_months: j.embargo_months,
        in_erih_plus: j.in_erih_plus,
        in_road: j.in_road,
        preservation_status: j.preservation_status,
        papers_5y: j.papers_5y,
        avg_citations_per_paper: j.avg_citations_per_paper,
        composite_score: j.composite_score,
        last_enriched_at: j.last_enriched_at,
        sources_metadata: j.sources_metadata,
        crossref_total_dois: j.crossref_total_dois,
        crossref_current_dois: j.crossref_current_dois,
        crossref_backfile_dois: j.crossref_backfile_dois,
        crossref_publisher: j.crossref_publisher,
        crossref_updated_at: j.crossref_updated_at,
        crossref_subjects: j.crossref_subjects,
        crossref_languages: j.crossref_languages,
        crossref_member_id: j.crossref_member_id,
        crossref_publisher_location: j.crossref_publisher_location,
        crossref_issn_type: j.crossref_issn_type,
        crossref_coverage_depth: j.crossref_coverage_depth,
        crossref_coverage_type: j.crossref_coverage_type,
        crossref_breakdowns: j.crossref_breakdowns,
        crossref_affiliations: j.crossref_affiliations,
        doaj_seal: j.doaj_seal,
        is_in_doaj: j.is_in_doaj,
        doaj_review_process: j.doaj_review_process,
        doaj_plagiarism_check: j.doaj_plagiarism_check,
        doaj_editorial_board_url: j.doaj_editorial_board_url,
        doaj_author_instructions_url: j.doaj_author_instructions_url,
        doaj_aims_scope: j.doaj_aims_scope,
        doaj_publication_time_weeks: j.doaj_publication_time_weeks,
        doaj_keywords: j.doaj_keywords,
        doaj_languages: j.doaj_languages,
        doaj_updated_at: j.doaj_updated_at,
        wikidata_id: j.wikidata_id,
        wikipedia_url: j.wikipedia_url,
        wikipedia_lang: j.wikipedia_lang,
        wikipedia_title: j.wikipedia_title,
        wikipedia_checked_at: j.wikipedia_checked_at,
        data_provenance: j.data_provenance,
      }));

    // Combine ranked and unranked data
    const allData = [...rankedData, ...unrankedData];

    // Apply final sorting in JS when needed (especially for points)
    let sortedData = [...allData];

    if (sort_by === 'title') {
      sortedData.sort((a: any, b: any) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
        return sort_order === 'asc'
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      });
    } else if (sort_by === 'if_proxy') {
      sortedData.sort((a: any, b: any) => {
        const valA = a.if_proxy ?? 0;
        const valB = b.if_proxy ?? 0;
        return sort_order === 'asc' ? valA - valB : valB - valA;
      });
    } else if (sort_by === 'h_index') {
      sortedData.sort((a: any, b: any) => {
        const valA = a.h_index ?? 0;
        const valB = b.h_index ?? 0;
        return sort_order === 'asc' ? valA - valB : valB - valA;
      });
    } else if (sort_by === 'points') {
      sortedData.sort((a: any, b: any) => {
        const valA = a.points ?? 0;
        const valB = b.points ?? 0;
        return sort_order === 'asc' ? valA - valB : valB - valA;
      });
    }

    return new Response(JSON.stringify(sortedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : (error as any)?.message || JSON.stringify(error) || 'Unknown error';

    // Graceful fallback for database/upstream timeouts
    if (typeof errorMessage === 'string' && (
      errorMessage.includes('statement timeout') ||
      errorMessage.includes('canceling statement') ||
      errorMessage.includes('upstream request timeout') ||
      errorMessage.includes('context deadline exceeded')
    )) {
      console.error('Query/upstream timed out, returning empty result with timeout flag');
      return new Response(JSON.stringify({ data: [], hasMore: false, timeout: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
