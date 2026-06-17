// Edge Function secrets — set via:
// supabase secrets set OZOW_SITE_CODE=xxx OZOW_PRIVATE_KEY=xxx OZOW_API_KEY=xxx

export const config = {
  ozow: {
    siteCode: Deno.env.get('OZOW_SITE_CODE')!,
    privateKey: Deno.env.get('OZOW_PRIVATE_KEY')!,
    apiKey: Deno.env.get('OZOW_API_KEY')!,
    isTest: Deno.env.get('OZOW_IS_TEST') === 'true',
    apiBaseUrl:
      Deno.env.get('OZOW_IS_TEST') === 'true'
        ? 'https://stagingapi.ozow.com'
        : 'https://api.ozow.com',
  },
  app: {
    baseUrl: Deno.env.get('APP_BASE_URL') ?? 'https://onserve.co.za',
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  },
};
