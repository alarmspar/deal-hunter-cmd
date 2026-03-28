'use client'

import { useEffect, useState } from 'react'

const CATEGORIES = ['Elektronika', 'Podróże', 'Odzież', 'Spożywcze/Drogerie']
const CAT_EMOJI: Record<string, string> = {
  'Elektronika': '💻', 'Podróże': '✈️', 'Odzież': '👕', 'Spożywcze/Drogerie': '🛒'
}

type SourceType = 'rss' | 'facebook' | 'email'

type Source = {
  id: string
  name: string
  url: string
  category: string
  type: SourceType
  enabled: boolean
  last_check: string | null
  last_status: string
  deal_count: number
  notes?: string
}

const SOURCE_TABS: { id: SourceType; label: string; icon: string; placeholder: string; urlLabel: string }[] = [
  { id: 'rss',      label: 'RSS',      icon: '📡', placeholder: 'https://www.mydealz.de/rss/...', urlLabel: 'URL RSS' },
  { id: 'facebook', label: 'Facebook', icon: '📘', placeholder: 'https://www.facebook.com/groups/...', urlLabel: 'URL Strony / Grupy' },
  { id: 'email',    label: 'Email',    icon: '📧', placeholder: 'newsletter@lidl.de', urlLabel: 'Adres email nadawcy' },
]

export default function SourcesTab({ showToast }: { showToast: (msg: string) => void }) {
  const [sources, setSources]       = useState<Source[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [testing, setTesting]       = useState<string | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [sourceTab, setSourceTab]   = useState<SourceType>('rss')
  const [catFilter, setCatFilter]   = useState('all')
  const [saving, setSaving]         = useState(false)
  const [newSource, setNewSource]   = useState({ name: '', url: '', category: 'Elektronika', notes: '' })

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/sources')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setSources(Array.isArray(d) ? d : [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggle = async (source: Source) => {
    const newVal = !source.enabled
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: newVal } : s))
    try {
      await fetch('/api/sources', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: source.id, enabled: newVal }) })
      showToast(`${newVal ? '▶️' : '⏸️'} ${source.name} ${newVal ? 'włączone' : 'wyłączone'}`)
    } catch { setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: !newVal } : s)); showToast('❌ Błąd zapisu') }
  }

  const remove = async (source: Source) => {
    if (!confirm(`Usuń "${source.name}"?`)) return
    setSources(prev => prev.filter(s => s.id !== source.id))
    try {
      await fetch('/api/sources', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: source.id }) })
      showToast(`🗑️ Usunięto: ${source.name}`)
    } catch { showToast('❌ Błąd usuwania'); load() }
  }

  const testSource = async (source: Source) => {
    if (source.type !== 'rss') { showToast('⚠️ Test dostępny tylko dla RSS'); return }
    setTesting(source.id)
    try {
      const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`)
      const d = await r.json()
      const status = d.status === 'ok' ? 'ok' : 'error'
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, last_status: status } : s))
      await fetch('/api/sources', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: source.id, last_status: status, last_check: new Date().toISOString() }) })
      showToast(status === 'ok' ? `✅ ${source.name} – OK (${d.items?.length || 0} wpisów)` : `❌ ${source.name} – błąd RSS`)
    } catch { showToast(`❌ ${source.name} – brak połączenia`) }
    setTesting(null)
  }

  const addSource = async () => {
    if (!newSource.name.trim()) { showToast('❌ Podaj nazwę'); return }
    if (!newSource.url.trim())  { showToast('❌ Podaj URL / adres'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/sources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSource, type: sourceTab, enabled: true, last_status: 'pending', deal_count: 0 })
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || `HTTP ${r.status}`) }
      const d = await r.json()
      setSources(prev => [...prev, d])
      setNewSource({ name: '', url: '', category: 'Elektronika', notes: '' })
      setShowAdd(false)
      showToast(`✅ Dodano: ${d.name}`)
    } catch (e: any) { showToast(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  const currentTab = SOURCE_TABS.find(t => t.id === sourceTab)!
  const filteredByType = sources.filter(s => (s.type || 'rss') === sourceTab)
  const filteredSources = filteredByType.filter(s => catFilter === 'all' || s.category === catFilter)

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filteredSources.filter(s => s.category === cat)
    return acc
  }, {} as Record<string, Source[]>)

  const counts = {
    rss:      sources.filter(s => (s.type || 'rss') === 'rss').length,
    facebook: sources.filter(s => s.type === 'facebook').length,
    email:    sources.filter(s => s.type === 'email').length,
  }

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Source type tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {SOURCE_TABS.map(t => (
            <button key={t.id} onClick={() => { setSourceTab(t.id); setShowAdd(false); setCatFilter('all') }}
              style={{
                padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-mono)',
                fontSize: 12, fontWeight: 600, border: '1px solid',
                background: sourceTab === t.id ? 'var(--accent)' : 'var(--surface2)',
                color: sourceTab === t.id ? '#fff' : 'var(--muted)',
                borderColor: sourceTab === t.id ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.15s',
              }}>
              {t.icon} {t.label}
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>
                ({counts[t.id]})
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {sourceTab === 'rss' && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['all', ...CATEGORIES].map(c => (
                <button key={c} className={`cat-chip ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)} style={{ cursor: 'pointer' }}>
                  {c === 'all' ? '🔥 Wszystkie' : `${CAT_EMOJI[c]} ${c.split('/')[0]}`}
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-ghost" onClick={load} style={{ padding: '5px 10px' }}>⟳</button>
          <button className="btn btn-accent" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? '✕ Anuluj' : `+ Dodaj ${currentTab.label}`}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card fade-in" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Nowe źródło – {currentTab.icon} {currentTab.label}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>NAZWA</div>
              <input className="input" style={{ width: '100%' }} placeholder="np. Lidl Newsletter"
                value={newSource.name} onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ flex: 2, minWidth: 220 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{currentTab.urlLabel.toUpperCase()}</div>
              <input className="input" style={{ width: '100%' }} placeholder={currentTab.placeholder}
                value={newSource.url} onChange={e => setNewSource(p => ({ ...p, url: e.target.value }))} />
            </div>
            <div style={{ minWidth: 160 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>KATEGORIA</div>
              <select className="input" style={{ width: '100%' }} value={newSource.category}
                onChange={e => setNewSource(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
              </select>
            </div>
            {sourceTab === 'facebook' && (
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>NOTATKA (opcjonalnie)</div>
                <input className="input" style={{ width: '100%' }} placeholder="np. publiczna strona"
                  value={newSource.notes} onChange={e => setNewSource(p => ({ ...p, notes: e.target.value }))} />
              </div>
            )}
            <button className="btn btn-accent" onClick={addSource} disabled={saving}>{saving ? '...' : 'Dodaj'}</button>
          </div>
          {sourceTab === 'facebook' && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
              💡 Facebook wymaga zalogowanego konta. Skonfiguruj <code>FACEBOOK_EMAIL</code> i <code>FACEBOOK_PASSWORD</code> w <code>config.py</code> skanera.
            </div>
          )}
          {sourceTab === 'email' && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
              💡 Email wymaga Gmail App Password. Skonfiguruj <code>GMAIL_ADDRESS</code> i <code>GMAIL_APP_PASSWORD</code> w <code>config.py</code> skanera.
            </div>
          )}
        </div>
      )}

      {/* Error / Loading / Empty */}
      {error && (
        <div className="card" style={{ textAlign: 'center', padding: '32px', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ color: 'var(--red)', marginBottom: 12 }}>❌ {error}</div>
          <button className="btn btn-ghost" onClick={load}>Spróbuj ponownie</button>
        </div>
      )}
      {loading && !error && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }} className="spinning">⟳</div>
          Ładowanie źródeł...
        </div>
      )}
      {!loading && !error && filteredByType.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          {sourceTab === 'rss' && 'Brak źródeł RSS – dodaj pierwsze lub uruchom sources_schema.sql w Supabase'}
          {sourceTab === 'facebook' && 'Brak źródeł Facebook – dodaj strony i grupy które chcesz monitorować'}
          {sourceTab === 'email' && 'Brak źródeł Email – dodaj adresy nadawców newsletterów'}
        </div>
      )}

      {/* RSS – grouped by category */}
      {!loading && !error && sourceTab === 'rss' && filteredByType.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CATEGORIES.filter(cat => catFilter === 'all' || catFilter === cat).map(cat => {
            const cs = grouped[cat]
            if (!cs?.length) return null
            return (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span>{CAT_EMOJI[cat]}</span>
                  <span className="font-display" style={{ fontSize: 12, fontWeight: 700 }}>{cat}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cs.filter(s => s.enabled).length}/{cs.length} aktywne</span>
                </div>
                <SourceTable sources={cs} onToggle={toggle} onRemove={remove} onTest={testSource} testing={testing} showUrl />
              </div>
            )
          })}
        </div>
      )}

      {/* Facebook & Email – flat list */}
      {!loading && !error && sourceTab !== 'rss' && filteredByType.length > 0 && (
        <SourceTable sources={filteredByType} onToggle={toggle} onRemove={remove} onTest={testSource} testing={testing} showUrl />
      )}
    </div>
  )
}

function SourceTable({ sources, onToggle, onRemove, onTest, testing, showUrl }: {
  sources: Source[]
  onToggle: (s: Source) => void
  onRemove: (s: Source) => void
  onTest: (s: Source) => void
  testing: string | null
  showUrl?: boolean
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <table className="deal-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}>On/Off</th>
            <th>Nazwa</th>
            {showUrl && <th>URL / Adres</th>}
            <th style={{ width: 80 }}>Status</th>
            <th style={{ width: 60 }}>Deale</th>
            <th style={{ width: 120 }}>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {sources.map(source => (
            <tr key={source.id} style={{ opacity: source.enabled ? 1 : 0.45 }} className="fade-in">
              <td>
                <div onClick={() => onToggle(source)} style={{ width: 32, height: 18, borderRadius: 9, background: source.enabled ? 'var(--green)' : 'var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 2, left: source.enabled ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </td>
              <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{source.name}</td>
              {showUrl && (
                <td style={{ maxWidth: 260 }}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--muted)', fontSize: 11, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                    title={source.url}>{source.url}</a>
                </td>
              )}
              <td>
                <span style={{ fontSize: 11, color: source.last_status === 'ok' ? 'var(--green)' : source.last_status === 'error' ? 'var(--red)' : 'var(--muted)' }}>
                  {source.last_status === 'ok' ? '✓ OK' : source.last_status === 'error' ? '✗ Błąd' : '—'}
                </span>
              </td>
              <td style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>{source.deal_count || 0}</td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(source.type || 'rss') === 'rss' && (
                    <button className="btn btn-blue" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onTest(source)} disabled={testing === source.id}>
                      {testing === source.id ? <span className="spinning" style={{ display: 'inline-block' }}>⟳</span> : '▶ Test'}
                    </button>
                  )}
                  <button className="btn btn-red" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => onRemove(source)}>✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
