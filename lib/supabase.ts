import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Deal = {
  id: string
  title: string
  store: string
  category: 'Elektronika' | 'Podróże' | 'Odzież' | 'Spożywcze/Drogerie'
  discount: number
  temperature: number
  stars: number
  reason: string
  link: string
  status: 'Nowy' | 'Do publikacji' | 'Opublikowany' | 'Odrzucony'
  created_at: string
  content_hook?: string
  content_caption?: string
  content_hashtags?: string
}
