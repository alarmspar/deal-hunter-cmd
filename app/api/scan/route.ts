// PLIK: app/api/scan/route.ts
// Fixed: Added rate limiting, retry logic, and better error handling

import { NextRequest, NextResponse } from 'next/server'

const RATE_LIMIT_CACHE = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now()
  const existing = RATE_LIMIT_CACHE.get(identifier)
  
  if (!existing || now > existing.resetTime) {
    RATE_LIMIT_CACHE.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (existing.count < maxRequests) {
    existing.count++
    return true
  }
  
  return false
}

async function sendTelegramMessage(token: string, chatId: string, text: string, retries: number = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
          }),
        }
      )
      
      const data = await resp.json()
      
      if (data.ok) {
        return { success: true, data }
      }
      
      // Telegram rate limit: retry after suggested delay
      if (data.parameters?.retry_after) {
        const delay = (data.parameters.retry_after + 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw new Error(data.description || 'Unknown Telegram error')
    } catch (e: any) {
      if (i === retries - 1) throw e
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}

export async function POST(req: NextRequest) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown'

  if (!telegramToken || !chatId) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 })
  }

  // Rate limit: 5 requests per minute per IP
  if (!checkRateLimit(clientIp, 5, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait 60 seconds.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  try {
    await sendTelegramMessage(telegramToken, chatId, '🔥 skanuj deale mydealz')
    return NextResponse.json({ 
      success: true, 
      triggered_at: new Date().toISOString(),
      message: 'Scan triggered successfully' 
    })
  } catch (e: any) {
    console.error('[SCAN API]', e.message)
    return NextResponse.json(
      { error: e.message || 'Failed to trigger scan' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Use POST to trigger scan' }, { status: 405 })
}

