import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { deal_id } = await req.json()

  const { data: deal, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', deal_id)
    .single()

  if (error || !deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const prompt = `Du bist ein Content Creator für einen deutschen Deal/Rabatt-Kanal auf Instagram und TikTok.

Erstelle Content für diesen Deal:
Titel: ${deal.title}
Kategorie: ${deal.category}
Rabatt: ${deal.discount}%
Shop: ${deal.store}
Bewertung: ${deal.stars}/5 Sterne

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Backticks):
{
  "hook": "<Reizvoller Einstiegssatz, max 15 Wörter, deutsch, für TikTok/Reels>",
  "caption_de": "<Instagram Caption auf Deutsch, 2-3 Sätze + Emoji>",
  "caption_en": "<Instagram Caption auf Englisch, 2-3 Sätze + Emoji>",
  "hashtags_de": "<10 deutsche Hashtags ohne #>",
  "hashtags_en": "<10 englische Hashtags ohne #>",
  "script": "<Kurzes Video-Skript, 3 Teile: Intro / Deal / CTA, max 60 Wörter>"
}`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await resp.json()
    const text = aiData.content?.[0]?.text?.trim() || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const content = JSON.parse(clean)

    // Save to Supabase
    await supabase.from('deals').update({
      content_hook:     content.hook,
      content_caption:  content.caption_de,
      content_caption_en: content.caption_en,
      content_hashtags: content.hashtags_de,
      content_hashtags_en: content.hashtags_en,
      content_script:   content.script,
      status: 'Do publikacji',
    }).eq('id', deal_id)

    return NextResponse.json({ success: true, content })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
