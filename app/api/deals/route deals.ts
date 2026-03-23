// PLIK: app/api/deals/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const status   = searchParams.get('status')
  const stars    = searchParams.get('stars')
  const limit    = parseInt(searchParams.get('limit') || '100')

  let query = supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category && category !== 'all') query = query.eq('category', category)
  if (status   && status   !== 'all') query = query.eq('status', status)
  if (stars)                          query = query.gte('stars', parseInt(stars))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
