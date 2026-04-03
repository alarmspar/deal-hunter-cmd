// PLIK: app/api/scan/route.ts
// Wysyła request do lokalnego Python skanera na localhost:5000

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

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown'

  // Rate limit: 5 requests per minute per IP
  if (!checkRateLimit(clientIp, 5, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait 60 seconds.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  try {
    // Wysyłaj request do lokalnego skanera
    const resp = await fetch('http://localhost:5000/api/trigger-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000,
    })

    if (!resp.ok) {
      throw new Error(`Local scanner returned ${resp.status}`)
    }

    const data = await resp.json()
    
    return NextResponse.json({
      success: true,
      triggered_at: new Date().toISOString(),
      message: 'Scan triggered successfully on local server',
      scan_id: data.scan_id
    })
  } catch (e: any) {
    console.error('[SCAN API] Local server error:', e.message)
    
    // Jeśli lokalny server nie odpowiada, spróbuj Telegram fallback
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      
      if (telegramToken && chatId) {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '⚠️ Lokalny scanner niedostępny. Kliknij /scan na Telegramie.',
          }),
        })
      }
    } catch (tg_err) {
      console.error('[SCAN API] Telegram fallback failed:', tg_err)
    }
    
    return NextResponse.json(
      { error: 'Local server not available. Make sure scanner_server.py is running.' },
      { status: 503 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: 'Use POST to trigger scan' },
    { status: 405 }
  )
}
