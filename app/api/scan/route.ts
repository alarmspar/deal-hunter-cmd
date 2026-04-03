// PLIK: app/api/scan/route.ts
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

  if (!checkRateLimit(clientIp, 5, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait 60 seconds.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  try {
    const resp = await fetch('http://localhost:5000/api/trigger-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!resp.ok) {
      throw new Error(`Local scanner returned ${resp.status}`)
    }

    const data = await resp.json()
    
    return NextResponse.json({
      success: true,
      triggered_at: new Date().toISOString(),
      message: 'Scan triggered successfully',
      scan_id: data.scan_id
    })
  } catch (e: any) {
    console.error('[SCAN API]', e.message)
    return NextResponse.json(
      { error: 'Local server not available' },
      { status: 503 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 })
}
