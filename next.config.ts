import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  // These are PUBLIC client settings, protected by grants and RLS. They let
  // the first preview run after Git import. Environment variables override
  // them for other environments. Never put a privileged key in this object.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kxhawonmgcsqkdthakci.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_A-JKZC5J7Jw7bh1cFuQkDA_RpRePzAv'
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'same-origin' }
    ] }];
  }
};
export default config;
