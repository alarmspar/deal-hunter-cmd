// PLIK: app/api/scan/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId        = process.env.TELEGRAM_CHAT_ID

  if (!telegramToken || !chatId) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 })
  }

  try {
    const resp = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'skanuj deale',
        }),
      }
    )
    const data = await resp.json()
    if (!data.ok) throw new Error(data.description)
    return NextResponse.json({ success: true, triggered_at: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
