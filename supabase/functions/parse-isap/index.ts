import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse ISAP URL format: https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20240001287
    const urlPattern = /id=(wdu|WDU)(\d{4})(\d{4})/i;
    const match = url.match(urlPattern);

    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Invalid ISAP URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const year = match[2];
    const number = match[3];

    console.log('Fetching ISAP URL:', url);
    
    // Fetch the ISAP page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ISAP page: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML fetched, length:', html.length);

    // Extract title from HTML
    let title = '';
    
    // Method 1: Look for the main title in various patterns
    const titlePatterns = [
      /<h1[^>]*>(.*?)<\/h1>/is,
      /<div[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/div>/is,
      /<span[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/span>/is,
      /<td[^>]*class="[^"]*data_title[^"]*"[^>]*>(.*?)<\/td>/is,
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = match[1]
          .replace(/<[^>]+>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        if (title.length > 10) { // Valid title should be longer than 10 chars
          console.log('Title found:', title);
          break;
        }
      }
    }

    // If still no title, try to find "Ustawa z dnia" or "Obwieszczenie" pattern
    if (!title || title.length < 10) {
      const ustawaPattern = /((?:Ustawa|Obwieszczenie|Rozporządzenie)[^<]*?(?:w sprawie|o)[^<]*?)(?:<|$)/is;
      const ustawaMatch = html.match(ustawaPattern);
      if (ustawaMatch && ustawaMatch[1]) {
        title = ustawaMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        console.log('Title found via pattern:', title);
      }
    }

    const result = {
      title: title || `Dz.U. ${year} poz. ${number.replace(/^0+/, '')}`,
      year: year,
      journal_year: year,
      journal_number: number.replace(/^0+/, ''),
      isap_url: url,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
