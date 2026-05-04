-- Core Wykaz schema for the migrated Supabase project.
-- Intentionally excludes removed/abandoned "Zasoby" course/resource modules.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.app_role as enum ('admin', 'user');

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.wykazy_metadata (
  id uuid primary key default gen_random_uuid(),
  year_identifier text not null,
  wykaz_version text,
  published_date date not null,
  valid_from date not null,
  valid_to date,
  source_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.journals_master (
  id uuid primary key default gen_random_uuid(),
  journal_id text not null unique,
  title text not null,
  title_2 text,
  abbreviated_title text,
  alternate_titles text[],
  issn_print text,
  issn_electronic text,
  issn_print_2 text,
  issn_electronic_2 text,
  issn_l text,
  publisher text,
  country text,
  country_code text,
  medium text,
  source_type text,
  journal_url text,
  homepage_url text,
  is_oa boolean,
  oa_status text,
  oa_rate numeric,
  license text,
  apc_amount numeric,
  apc_currency text,
  apc_usd numeric,
  apc_prices jsonb,
  embargo_months integer,
  preprint_allowed boolean,
  postprint_allowed boolean,
  publisher_pdf_allowed boolean,
  preservation_status boolean,
  in_erih_plus boolean,
  in_road boolean,
  is_in_doaj boolean,
  is_core boolean,
  openalex_id text,
  openalex_created_date date,
  openalex_updated_date date,
  openalex_updated_at timestamptz,
  works_api_url text,
  works_count integer,
  cited_by_count integer,
  h_index numeric,
  i10_index numeric,
  if_proxy numeric,
  if_proxy_source text,
  impact_factor numeric,
  impact_factor_source text,
  sjr numeric,
  sjr_source text,
  snip numeric,
  snip_source text,
  avg_citations_per_paper numeric,
  avg_time_to_publish_days numeric,
  papers_5y integer,
  host_organization text,
  host_organization_lineage text[],
  societies jsonb,
  counts_by_year jsonb,
  crossref_total_dois integer,
  crossref_current_dois integer,
  crossref_backfile_dois integer,
  crossref_member_id text,
  crossref_publisher text,
  crossref_publisher_location text,
  crossref_updated_at timestamptz,
  crossref_subjects jsonb,
  crossref_languages text[],
  crossref_issn_type text,
  crossref_coverage_depth text,
  crossref_coverage_type text,
  crossref_breakdowns jsonb,
  crossref_affiliations jsonb,
  doaj_seal boolean,
  doaj_review_process text,
  doaj_plagiarism_check boolean,
  doaj_updated_at timestamptz,
  doaj_editorial_board_url text,
  doaj_author_instructions_url text,
  doaj_aims_scope text,
  doaj_publication_time_weeks numeric,
  doaj_keywords text[],
  doaj_languages text[],
  wikidata_id text,
  wikipedia_url text,
  wikipedia_lang text,
  wikipedia_title text,
  wikipedia_checked_at timestamptz,
  disciplines text[],
  discipline_codes text[],
  data_source text,
  enrichment_method text,
  data_provenance jsonb,
  sources_metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_enriched_at timestamptz
);

create table if not exists public.journal_rankings (
  id uuid primary key default gen_random_uuid(),
  journal_id text not null references public.journals_master(journal_id) on update cascade on delete cascade,
  wykaz_id uuid references public.wykazy_metadata(id) on update cascade on delete cascade,
  points integer not null default 0,
  disciplines text[],
  discipline_codes text[],
  year integer not null,
  published_date date not null,
  wykaz_identifier text,
  data_source text,
  source_file text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (journal_id, wykaz_id)
);

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  journal_id text,
  title text not null,
  title_2 text,
  issn_print text,
  issn_electronic text,
  issn_print_2 text,
  issn_electronic_2 text,
  issn_l text,
  publisher text,
  country text,
  country_code text,
  medium text,
  points integer not null default 0,
  year integer not null,
  published_date date not null,
  disciplines text[],
  discipline_codes text[],
  source_file text,
  data_source text,
  journal_url text,
  is_oa boolean,
  oa_status text,
  oa_rate numeric,
  license text,
  apc_amount numeric,
  apc_currency text,
  embargo_months integer,
  preprint_allowed boolean,
  postprint_allowed boolean,
  publisher_pdf_allowed boolean,
  preservation_status boolean,
  in_erih_plus boolean,
  in_road boolean,
  openalex_id text,
  openalex_updated_at timestamptz,
  works_count integer,
  cited_by_count integer,
  h_index numeric,
  if_proxy numeric,
  avg_citations_per_paper numeric,
  avg_time_to_publish_days numeric,
  papers_5y integer,
  host_organization text,
  data_provenance jsonb,
  sources_metadata jsonb,
  enrichment_method text,
  last_enriched_at timestamptz,
  composite_score numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.openalex_enrichment_log (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references public.journals_master(id) on delete set null,
  method text,
  status text not null,
  fields_updated text[],
  error_message text,
  execution_time_ms integer,
  created_at timestamptz default now()
);

create table if not exists public.cron_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null,
  journals_processed integer default 0,
  execution_time_ms integer,
  error_message text,
  created_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_journals_master_updated_at on public.journals_master;
create trigger set_journals_master_updated_at
before update on public.journals_master
for each row execute function public.set_updated_at();

drop trigger if exists set_journal_rankings_updated_at on public.journal_rankings;
create trigger set_journal_rankings_updated_at
before update on public.journal_rankings
for each row execute function public.set_updated_at();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace view public.current_wykaz_view as
with latest_wykaz as (
  select id, year_identifier, valid_from, valid_to
  from public.wykazy_metadata
  order by published_date desc
  limit 1
)
select
  jm.id,
  jm.journal_id,
  jm.title,
  jm.title_2,
  jm.issn_print,
  jm.issn_electronic,
  jm.issn_print_2,
  jm.issn_electronic_2,
  jm.issn_l,
  jm.publisher,
  jm.country,
  jm.country_code,
  jm.medium,
  jm.journal_url,
  jm.is_oa,
  jm.oa_status,
  jm.oa_rate,
  jm.apc_amount,
  jm.apc_currency,
  jm.embargo_months,
  jm.preprint_allowed,
  jm.postprint_allowed,
  jm.publisher_pdf_allowed,
  jm.preservation_status,
  jm.in_erih_plus,
  jm.in_road,
  jm.openalex_id,
  jm.openalex_updated_at,
  jm.works_count,
  jm.cited_by_count,
  jm.h_index,
  jm.if_proxy,
  jm.avg_citations_per_paper,
  jm.avg_time_to_publish_days,
  jm.papers_5y,
  jm.host_organization,
  jm.sources_metadata,
  jm.enrichment_method,
  jm.last_enriched_at,
  jm.created_at,
  jm.updated_at,
  jr.id as ranking_id,
  jr.points,
  jr.disciplines,
  jr.discipline_codes,
  jr.year,
  jr.published_date,
  jr.wykaz_identifier,
  lw.year_identifier as wykaz_year_identifier,
  lw.valid_from as wykaz_valid_from,
  lw.valid_to as wykaz_valid_to,
  (jr.id is not null) as in_current_wykaz
from public.journals_master jm
left join latest_wykaz lw on true
left join public.journal_rankings jr
  on jr.journal_id = jm.journal_id
 and jr.wykaz_id = lw.id;

create index if not exists idx_journals_master_journal_id on public.journals_master(journal_id);
create index if not exists idx_journals_master_title_prefix on public.journals_master(title text_pattern_ops);
create index if not exists idx_journals_master_title_trgm on public.journals_master using gin (title gin_trgm_ops);
create index if not exists idx_journals_master_issn_print on public.journals_master(issn_print);
create index if not exists idx_journals_master_issn_electronic on public.journals_master(issn_electronic);
create index if not exists idx_journal_rankings_wykaz_id on public.journal_rankings(wykaz_id);
create index if not exists idx_journal_rankings_journal_id on public.journal_rankings(journal_id);
create index if not exists idx_journal_rankings_points on public.journal_rankings(points desc);

alter table public.user_roles enable row level security;
alter table public.wykazy_metadata enable row level security;
alter table public.journals_master enable row level security;
alter table public.journal_rankings enable row level security;
alter table public.journals enable row level security;
alter table public.openalex_enrichment_log enable row level security;
alter table public.cron_job_runs enable row level security;

drop policy if exists "Public read wykazy metadata" on public.wykazy_metadata;
create policy "Public read wykazy metadata" on public.wykazy_metadata for select using (true);

drop policy if exists "Public read journals master" on public.journals_master;
create policy "Public read journals master" on public.journals_master for select using (true);

drop policy if exists "Public read journal rankings" on public.journal_rankings;
create policy "Public read journal rankings" on public.journal_rankings for select using (true);

drop policy if exists "Public read journals" on public.journals;
create policy "Public read journals" on public.journals for select using (true);

drop policy if exists "Service role can write wykaz metadata" on public.wykazy_metadata;
create policy "Service role can write wykaz metadata" on public.wykazy_metadata for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can write journals master" on public.journals_master;
create policy "Service role can write journals master" on public.journals_master for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can write journal rankings" on public.journal_rankings;
create policy "Service role can write journal rankings" on public.journal_rankings for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can write logs" on public.openalex_enrichment_log;
create policy "Service role can write logs" on public.openalex_enrichment_log for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can write cron runs" on public.cron_job_runs;
create policy "Service role can write cron runs" on public.cron_job_runs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
