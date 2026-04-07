import { createClient } from '@supabase/supabase-js'

// Używamy SUPABASE_SERVICE_ROLE_KEY tylko po stronie serwera (API routes)
// Po stronie klienta dashboard używa własnych API endpoints (/api/deals, /api/sources)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Deal = {
  id: string
  title: string
  store: string
  category: 'Elektronika' | 'Podróże' | 'Odzież' | 'Spożywcze/Drogerie'
  discount: number
  temperature: number | null
  stars: number
  reason: string
  link: string
  status: 'Nowy' | 'Do publikacji' | 'Opublikowany' | 'Odrzucony'
  created_at: string
  published_at?: string
  content_hook?: string
  content_caption?: string
  content_hashtags?: string
  source?: string
}
