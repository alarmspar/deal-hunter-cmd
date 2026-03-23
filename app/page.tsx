'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type Deal } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ['all', 'Elektronika', 'Podróże', 'Odzież', 'Spożywcze/Drogerie']
const STATUSES   = ['all', 'Nowy', 'Do publikacji', 'Opublikowany', 'Odrzucony']
const CAT_EMOJI: Record<string, string> = {
  'Elektronika': '💻', 'Podróże': '✈️', 'Odzież': '👕', 'Spożywcze/Drogerie': '🛒', 'all': '🔥'
}
const STATUS_CLASS: Record<string, string> = {
  'Nowy': 'badge-new', 'Do publikacji': 'badge-queue', 'Opublikowany': 'badge-pub', 'Odrzucony': 'badge-rejected'
}
const PIE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#eab308']

// ── Stars renderer ────────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ scanning, onScan, lastScan, supaConnected }:
  { scanning: boolean; onScan: () => void; lastScan: string; supaConnected: boolean }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('de-DE')), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔥</div>
        <div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text)' }}>DEAL HUNTER</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', marginTop: -2 }}>COMMAND CENTER</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: supaConnected ? 'var(--green)' : 'var(--red)' }}>
          <div className={supaConnected ? 'pulse-dot' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: supaConnected ? 'var(--green)' : 'var(--red)' }} />
          supabase {supaConnected ? 'connected' : 'offline'}
        </div>
        {lastScan && <div style={{ fontSize: 11, color: 'var(--muted)' }}>synced: {lastScan}</div>}
        <button className="btn btn-accent" onClick={onScan} disabled={scanning} style={{ opacity: scanning ? 0.7 : 1 }}>
          <span className={scanning ? 'spinning' : ''} style={{ display: 'inline-block' }}>⟳</span>
          {scanning ? 'Scanning...' : 'Scan Now'}
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)', minWidth: 70, textAlign: 'right' }}>{time}</div>
      </div>
    </div>
  )
}

// ── Content Modal ─────────────────────────────────────────────────────────────
function ContentModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const [loading, setLoading] = useState(!deal.content_hook)
  const [content, setContent] = useState<any>(deal.content_hook ? {
    hook: deal.content_hook, caption_de: deal.content_caption,
    hashtags_de: deal.content_hashtags, script: (deal as any).content_script,
  } : null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!deal.content_hook) {
      fetch('/api/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deal_id: deal.id }) })
        .then(r => r.json()).then(d => { setContent(d.content); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [deal])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Content Generator</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 480, lineHeight: 1.4 }}>{deal.title}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }} className="spinning">⟳</div>
            <div>Generating content with Claude...</div>
          </div>
        ) : content ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: '🎣 Hook', key: 'hook', value: content.hook },
              { label: '📝 Caption (DE)', key: 'caption_de', value: content.caption_de },
              { label: '#️⃣ Hashtags', key: 'hashtags_de', value: content.hashtags_de },
              { label: '🎬 Video Script', key: 'script', value: content.script },
            ].map(({ label, key, value }) => value && (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                  <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => copy(value, key)}>
                    {copied === key ? '✓ copied' : 'copy'}
                  </button>
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--red)' }}>Failed to generate content</div>
        )}
      </div>
    </div>
  )
}

// ── Deals Tab ─────────────────────────────────────────────────────────────────
function DealsTab({ deals, onStatusChange, onGenerateContent }: {
  deals: Deal[]
  onStatusChange: (id: string, status: Deal['status']) => void
  onGenerateContent: (deal: Deal) => void
}) {
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [minStars, setMinStars] = useState(0)
  const [search, setSearch] = useState('')

  const filtered = deals.filter(d => {
    if (catFilter !== 'all' && d.category !== catFilter) return false
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (d.stars < minStars) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.store.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {CATEGORIES.map(c => (
            <button key={c} className={`cat-chip ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)} style={{ cursor: 'pointer' }}>
              {CAT_EMOJI[c]} {c === 'all' ? 'Wszystkie' : c}
            </button>
          ))}
        </div>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'Każdy status' : s}</option>)}
        </select>
        <select className="input" value={minStars} onChange={e => setMinStars(Number(e.target.value))}>
          <option value={0}>Każda ocena</option>
          <option value={3}>3⭐+</option>
          <option value={4}>4⭐+</option>
          <option value={5}>5⭐ tylko</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{filtered.length} dealów</div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="deal-table">
            <thead>
              <tr>
                <th>Tytuł</th>
                <th>Sklep</th>
                <th>Kat.</th>
                <th>Rabat</th>
                <th>Temp °</th>
                <th>Ocena</th>
                <th>AI note</th>
                <th>Status</th>
                <th>Kiedy</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>Brak dealów</td></tr>
              ) : filtered.map(deal => (
                <tr key={deal.id} className="fade-in">
                  <td style={{ maxWidth: 280 }}>
                    <a href={deal.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={deal.title}>
                      {deal.title}
                    </a>
                  </td>
                  <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{deal.store}</td>
                  <td><span style={{ whiteSpace: 'nowrap' }}>{CAT_EMOJI[deal.category]} {deal.category}</span></td>
                  <td style={{ color: deal.discount >= 50 ? 'var(--green)' : deal.discount >= 30 ? 'var(--accent)' : 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {deal.discount > 0 ? `-${deal.discount}%` : '—'}
                  </td>
                  <td style={{ color: deal.temperature >= 400 ? 'var(--accent)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {deal.temperature > 0 ? `${deal.temperature}°` : '—'}
                  </td>
                  <td><Stars n={deal.stars} /></td>
                  <td style={{ color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={deal.reason}>{deal.reason}</td>
                  <td><span className={`badge ${STATUS_CLASS[deal.status] || ''}`}>{deal.status}</span></td>
                  <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-blue" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onGenerateContent(deal)} title="Generuj content">✦</button>
                      {deal.status !== 'Do publikacji' && <button className="btn btn-green" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onStatusChange(deal.id, 'Do publikacji')} title="Do kolejki">+</button>}
                      {deal.status !== 'Opublikowany' && <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onStatusChange(deal.id, 'Opublikowany')} title="Opublikowany">✓</button>}
                      {deal.status !== 'Odrzucony' && <button className="btn btn-red" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onStatusChange(deal.id, 'Odrzucony')} title="Odrzuć">✕</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Queue Tab ─────────────────────────────────────────────────────────────────
function QueueTab({ deals, onStatusChange, onGenerateContent }: {
  deals: Deal[]
  onStatusChange: (id: string, status: Deal['status']) => void
  onGenerateContent: (deal: Deal) => void
}) {
  const queued = deals.filter(d => d.status === 'Do publikacji')

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Kolejka publikacji</div>
        <div style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--accent)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 4, padding: '1px 8px', fontSize: 11 }}>{queued.length}</div>
      </div>

      {queued.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          Brak dealów w kolejce – dodaj je z zakładki Deals
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {queued.map(deal => (
            <div key={deal.id} className="card fade-in" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 24, minWidth: 36, textAlign: 'center' }}>{CAT_EMOJI[deal.category]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <a href={deal.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>{deal.title}</a>
                  <Stars n={deal.stars} />
                  {deal.discount > 0 && <span style={{ color: 'var(--green)', fontWeight: 600 }}>-{deal.discount}%</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{deal.store} · {deal.category} · {deal.reason}</div>

                {deal.content_hook ? (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    🎣 <span style={{ color: 'var(--text)' }}>{deal.content_hook}</span>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-blue" style={{ fontSize: 11 }} onClick={() => onGenerateContent(deal)}>
                    ✦ {deal.content_hook ? 'Edytuj content' : 'Generuj content'}
                  </button>
                  <button className="btn btn-green" style={{ fontSize: 11 }} onClick={() => onStatusChange(deal.id, 'Opublikowany')}>✓ Opublikowany</button>
                  <button className="btn btn-red" style={{ fontSize: 11 }} onClick={() => onStatusChange(deal.id, 'Odrzucony')}>✕ Odrzuć</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ deals }: { deals: Deal[] }) {
  const today = deals.filter(d => new Date(d.created_at) > new Date(Date.now() - 86400000))
  const week  = deals.filter(d => new Date(d.created_at) > new Date(Date.now() - 7 * 86400000))
  const published = deals.filter(d => d.status === 'Opublikowany')
  const avgStars = deals.length ? (deals.reduce((a, d) => a + d.stars, 0) / deals.length).toFixed(1) : 0

  const byCat = CATEGORIES.filter(c => c !== 'all').map(cat => ({
    name: cat.split('/')[0],
    total: deals.filter(d => d.category === cat).length,
    hot:   deals.filter(d => d.category === cat && d.stars >= 4).length,
  }))

  const byStatus = STATUSES.filter(s => s !== 'all').map(s => ({
    name: s, value: deals.filter(d => d.status === s).length,
  }))

  const bySource: Record<string, number> = {}
  deals.forEach(d => { bySource[d.store] = (bySource[d.store] || 0) + 1 })
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const statCards = [
    { label: 'Deals dzisiaj',     value: today.length,   color: 'var(--blue)' },
    { label: 'Deals ten tydzień', value: week.length,    color: 'var(--accent)' },
    { label: 'Opublikowane',      value: published.length, color: 'var(--green)' },
    { label: 'Śr. ocena AI',      value: `${avgStars}⭐`, color: 'var(--yellow)' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 11 }}>
        <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p: any) => <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>)}
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* By category bar chart */}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Deale per kategoria</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCat} barGap={2}>
              <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="total" name="Wszystkie" fill="rgba(59,130,246,0.5)" radius={[3,3,0,0]} />
              <Bar dataKey="hot" name="4-5⭐" fill="var(--accent)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By status pie */}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Statusy</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {byStatus.map((s, i) => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ color: 'var(--muted)' }}>{s.name}</span>
                  </div>
                  <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 12 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top sources */}
      <div className="card">
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Top źródła</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topSources.map(([store, count]) => (
            <div key={store} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 100, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store}</div>
              <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / (topSources[0]?.[1] || 1)) * 100}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ width: 30, textAlign: 'right', fontSize: 11, color: 'var(--muted)' }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<'deals' | 'queue' | 'analytics'>('deals')
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState('')
  const [supaConnected, setSupaConnected] = useState(false)
  const [contentDeal, setContentDeal] = useState<Deal | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadDeals = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      setDeals(data || [])
      setSupaConnected(true)
      setLastScan(new Date().toLocaleTimeString('de-DE'))
    } catch {
      setSupaConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDeals() }, [loadDeals])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => loadDeals())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadDeals])

  const handleScan = async () => {
    setScanning(true)
    try {
      const r = await fetch('/api/scan', { method: 'POST' })
      const d = await r.json()
      if (d.success) { showToast('✅ Skanowanie uruchomione – wyniki za chwilę'); setTimeout(loadDeals, 10000) }
      else showToast(`❌ ${d.error}`)
    } catch { showToast('❌ Błąd połączenia') }
    setScanning(false)
  }

  const handleStatusChange = async (id: string, status: Deal['status']) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    try {
      await fetch('/api/deals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
      showToast(`✅ Status → ${status}`)
    } catch { showToast('❌ Błąd zapisu'); loadDeals() }
  }

  const queueCount = deals.filter(d => d.status === 'Do publikacji').length
  const newCount   = deals.filter(d => d.status === 'Nowy').length

  const TABS = [
    { id: 'deals',     label: '🔍 Deals',     count: newCount },
    { id: 'queue',     label: '📋 Kolejka',   count: queueCount },
    { id: 'analytics', label: '📊 Analytics', count: null },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Topbar scanning={scanning} onScan={handleScan} lastScan={lastScan} supaConnected={supaConnected} />

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 4, height: 40 }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as any)}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span style={{ marginLeft: 5, background: tab === t.id ? 'var(--accent)' : 'var(--surface2)', color: tab === t.id ? '#fff' : 'var(--muted)', borderRadius: 3, padding: '0 5px', fontSize: 10, fontWeight: 600 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }} className="spinning">⟳</div>
          <div>Łączenie z Supabase...</div>
        </div>
      ) : (
        <>
          {tab === 'deals'     && <DealsTab deals={deals} onStatusChange={handleStatusChange} onGenerateContent={setContentDeal} />}
          {tab === 'queue'     && <QueueTab deals={deals} onStatusChange={handleStatusChange} onGenerateContent={setContentDeal} />}
          {tab === 'analytics' && <AnalyticsTab deals={deals} />}
        </>
      )}

      {/* Content Modal */}
      {contentDeal && <ContentModal deal={contentDeal} onClose={() => { setContentDeal(null); loadDeals() }} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 20px', fontSize: 12, color: 'var(--text)', zIndex: 200, whiteSpace: 'nowrap' }} className="fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
