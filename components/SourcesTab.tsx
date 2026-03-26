'use client'

import { useEffect, useState } from 'react'

const CATEGORIES = ['Elektronika', 'Podróże', 'Odzież', 'Spożywcze/Drogerie']
const CAT_EMOJI: Record<string, string> = {
  'Elektronika': '💻', 'Podróże': '✈️', 'Odzież': '👕', 'Spożywcze/Drogerie': '🛒'
}

type Source = {
  id: string
  name: string
  url: string
  category: string
  enabled: boolean
  last_check: string | null
  last_status: string
  deal_count: number
}

type SourcesTabProps = {
  showToast: (msg: string) => void
}

export default function SourcesTab({ showToast }: SourcesTabProps) {
  const [sources, setSources]       = useState<Source[]>([])
  const [loading, setLoading]       = useState(true)
  const [testing, setTesting]       = useState<string | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [catFilter, setCatFilter]   = useState('all')
  const [newSource, setNewSource]   = useState({ name: '', url: '', category: 'Elektronika' })

  const load = async () => {
    const r = await fetch('/api/sources')
    const d = await r.json()
    setSources(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = async (source: Source) => {
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: !s.enabled } : s))
    await fetch('/api/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: source.id, enabled: !source.enabled })
    })
    showToast(`${source.enabled ? '⏸️' : '▶️'} ${source.name} ${source.enabled ? 'wyłączone' : 'włączone'}`)
  }

  const remove = async (source: Source) => {
    if (!confirm(`Usuń "${source.name}"?`)) return
    setSources(prev => prev.filter(s => s.id !== source.id))
    await fetch('/api/sources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: source.id })
    })
    showToast(`🗑️ Usunięto: ${source.name}`)
  }

  const testSource = async (source: Source) => {
    setTesting(source.id)
    try {
      const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`)
      const d = await r.json()
      if (d.status === 'ok') {
        showToast(`✅ ${source.name} – OK (${d.items?.length || 0} wpisów)`)
        await fetch('/api/sources', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: source.id, last_status: 'ok', last_check: new Date().toISOString() })
        })
        setSources(prev => prev.map(s => s.id === source.id ? { ...s, last_status: 'ok' } : s))
      } else {
        showToast(`❌ ${source.name} – błąd RSS`)
        setSources(prev => prev.map(s => s.id === source.id ? { ...s, last_status: 'error' } : s))
      }
    } catch {
      showToast(`❌ ${source.name} – brak połączenia`)
    }
    setTesting(null)
  }

  const addSource = async () => {
    if (!newSource.name || !newSource.url) { showToast('❌ Wypełnij nazwę i URL'); return }
    const r = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newSource, enabled: true })
    })
    const d = await r.json()
    setSources(prev => [...prev, d])
    setNewSource({ name: '', url: '', category: 'Elektronika' })
    setShowAdd(false)
    showToast(`✅ Dodano: ${d.name}`)
  }

  const filtered = sources.filter(s => catFilter === 'all' || s.category === catFilter)
  const grouped  = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filtered.filter(s => s.category === cat)
    return acc
  }, {} as Record<string, Source[]>)

  const enabledCount  = sources.filter(s => s.enabled).length
  const disabledCount = sources.filter(s => !s.enabled).length

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Źródła RSS</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ color: 'var(--green)' }}>{enabledCount} aktywne</span>
            {disabledCount > 0 && <span style={{ marginLeft: 8, color: 'var(--red)' }}>{disabledCount} wyłączone</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', ...CATEGORIES].map(c => (
              <button key={c} className={`cat-chip ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)} style={{ cursor: 'pointer' }}>
                {c === 'all' ? '🔥 Wszystkie' : `${CAT_EMOJI[c]} ${c.split('/')[0]}`}
              </button>
            ))}
          </div>
          <button className="btn btn-accent" onClick={() => setShowAdd(!showAdd)}>
            + Dodaj źródło
          </button>
        </div>
      </div>

      {/* Add source form */}
      {showAdd && (
        <div className="card fade-in" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nazwa</div>
            <input className="input" style={{ width: '100%' }} placeholder="np. mydealz – Gaming" value={newSource.name} onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div style={{ flex: 2, minWidth: 250 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>URL RSS</div>
            <input className="input" style={{ width: '100%' }} placeholder="https://www.mydealz.de/rss/..." value={newSource.url} onChange={e => setNewSource(p => ({ ...p, url: e.target.value }))} />
          </div>
          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kategoria</div>
            <select className="input" style={{ width: '100%' }} value={newSource.category} onChange={e => setNewSource(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-accent" onClick={addSource}>Dodaj</button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Anuluj</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }} className="spinning">⟳</div>
          Ładowanie źródeł...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CATEGORIES.filter(cat => catFilter === 'all' || catFilter === cat).map(cat => {
            const catSources = grouped[cat]
            if (!catSources?.length) return null
            return (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{CAT_EMOJI[cat]}</span>
                  <span className="font-display" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{cat}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{catSources.filter(s => s.enabled).length}/{catSources.length} aktywne</span>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table className="deal-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Nazwa</th>
                        <th>URL</th>
                        <th>Ostatni test</th>
                        <th>Deale</th>
                        <th>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catSources.map(source => (
                        <tr key={source.id} style={{ opacity: source.enabled ? 1 : 0.45 }} className="fade-in">
                          <td>
                            <div
                              onClick={() => toggle(source)}
                              style={{
                                width: 32, height: 18, borderRadius: 9,
                                background: source.enabled ? 'var(--green)' : 'var(--border2)',
                                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                                flexShrink: 0,
                              }}
                            >
                              <div style={{
                                position: 'absolute', top: 2,
                                left: source.enabled ? 16 : 2,
                                width: 14, height: 14, borderRadius: '50%',
                                background: '#fff', transition: 'left 0.2s',
                              }} />
                            </div>
                          </td>
                          <td style={{ fontWeight: 500, color: 'var(--text)' }}>{source.name}</td>
                          <td style={{ maxWidth: 280 }}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: 'var(--muted)', fontSize: 11, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                              title={source.url}>
                              {source.url}
                            </a>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11,
                              color: source.last_status === 'ok' ? 'var(--green)' : source.last_status === 'error' ? 'var(--red)' : 'var(--muted)'
                            }}>
                              {source.last_status === 'ok' ? '✓ OK' : source.last_status === 'error' ? '✗ Błąd' : '—'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: 11 }}>{source.deal_count || 0}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-blue" style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => testSource(source)} disabled={testing === source.id}>
                                {testing === source.id ? <span className="spinning" style={{ display: 'inline-block' }}>⟳</span> : '▶ Test'}
                              </button>
                              <button className="btn btn-red" style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => remove(source)}>
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
