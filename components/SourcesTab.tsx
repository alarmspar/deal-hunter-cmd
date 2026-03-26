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

export default function SourcesTab({ showToast }: { showToast: (msg: string) => void }) {
  const [sources, setSources]     = useState<Source[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [testing, setTesting]     = useState<string | null>(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [catFilter, setCatFilter] = useState('all')
  const [saving, setSaving]       = useState(false)
  const [newSource, setNewSource] = useState({ name: '', url: '', category: 'Elektronika' })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/sources')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setSources(Array.isArray(d) ? d : [])
    } catch (e: any) {
      setError(e.message || 'Błąd ładowania źródeł')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = async (source: Source) => {
    const newVal = !source.enabled
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: newVal } : s))
    try {
      const r = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: source.id, enabled: newVal })
      })
      if (!r.ok) throw new Error()
      showToast(`${newVal ? '▶️' : '⏸️'} ${source.name} ${newVal ? 'włączone' : 'wyłączone'}`)
    } catch {
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: !newVal } : s))
      showToast('❌ Błąd zapisu')
    }
  }

  const remove = async (source: Source) => {
    if (!confirm(`Usuń "${source.name}"?`)) return
    setSources(prev => prev.filter(s => s.id !== source.id))
    try {
      await fetch('/api/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: source.id })
      })
      showToast(`🗑️ Usunięto: ${source.name}`)
    } catch {
      showToast('❌ Błąd usuwania')
      load()
    }
  }

  const testSource = async (source: Source) => {
    setTesting(source.id)
    try {
      const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`)
      const d = await r.json()
      const status = d.status === 'ok' ? 'ok' : 'error'
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, last_status: status } : s))
      await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: source.id, last_status: status, last_check: new Date().toISOString() })
      })
      showToast(status === 'ok'
        ? `✅ ${source.name} – OK (${d.items?.length || 0} wpisów)`
        : `❌ ${source.name} – błąd RSS`)
    } catch {
      showToast(`❌ ${source.name} – brak połączenia`)
    }
    setTesting(null)
  }

  const addSource = async () => {
    if (!newSource.name.trim()) { showToast('❌ Podaj nazwę'); return }
    if (!newSource.url.trim())  { showToast('❌ Podaj URL'); return }
    if (!newSource.url.startsWith('http')) { showToast('❌ URL musi zaczynać się od http'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSource, enabled: true, last_status: 'pending', deal_count: 0 })
      })
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || `HTTP ${r.status}`) }
      const d = await r.json()
      setSources(prev => [...prev, d])
      setNewSource({ name: '', url: '', category: 'Elektronika' })
      setShowAdd(false)
      showToast(`✅ Dodano: ${d.name}`)
    } catch (e: any) {
      showToast(`❌ Błąd: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = sources.filter(s => (catFilter === 'all' || s.category === catFilter) && s.category === cat)
    return acc
  }, {} as Record<string, Source[]>)

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Źródła RSS</div>
          {!loading && !error && (
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              <span style={{ color: 'var(--green)' }}>{sources.filter(s => s.enabled).length} aktywne</span>
              {sources.filter(s => !s.enabled).length > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--red)' }}>{sources.filter(s => !s.enabled).length} wyłączone</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} className={`cat-chip ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)} style={{ cursor: 'pointer' }}>
              {c === 'all' ? '🔥 Wszystkie' : `${CAT_EMOJI[c]} ${c.split('/')[0]}`}
            </button>
          ))}
          <button className="btn btn-ghost" onClick={load} title="Odśwież" style={{ padding: '5px 10px' }}>⟳</button>
          <button className="btn btn-accent" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? '✕ Anuluj' : '+ Dodaj źródło'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card fade-in" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nowe źródło</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>NAZWA</div>
              <input className="input" style={{ width: '100%' }} placeholder="np. mydealz – Gaming"
                value={newSource.name} onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ flex: 2, minWidth: 220 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>URL RSS</div>
              <input className="input" style={{ width: '100%' }} placeholder="https://www.mydealz.de/rss/..."
                value={newSource.url} onChange={e => setNewSource(p => ({ ...p, url: e.target.value }))} />
            </div>
            <div style={{ minWidth: 160 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>KATEGORIA</div>
              <select className="input" style={{ width: '100%' }} value={newSource.category}
                onChange={e => setNewSource(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
              </select>
            </div>
            <button className="btn btn-accent" onClick={addSource} disabled={saving}>
              {saving ? '...' : 'Dodaj'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ textAlign: 'center', padding: '32px', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ color: 'var(--red)', marginBottom: 12 }}>❌ {error}</div>
          <button className="btn btn-ghost" onClick={load}>Spróbuj ponownie</button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }} className="spinning">⟳</div>
          Ładowanie źródeł...
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sources.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          Brak źródeł – dodaj pierwsze lub uruchom <code>sources_schema.sql</code> w Supabase
        </div>
      )}

      {/* List */}
      {!loading && !error && sources.length > 0 && (
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
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table className="deal-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>On/Off</th>
                        <th>Nazwa</th>
                        <th>URL</th>
                        <th style={{ width: 80 }}>Status</th>
                        <th style={{ width: 60 }}>Deale</th>
                        <th style={{ width: 120 }}>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cs.map(source => (
                        <tr key={source.id} style={{ opacity: source.enabled ? 1 : 0.45 }} className="fade-in">
                          <td>
                            <div onClick={() => toggle(source)} style={{ width: 32, height: 18, borderRadius: 9, background: source.enabled ? 'var(--green)' : 'var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                              <div style={{ position: 'absolute', top: 2, left: source.enabled ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                            </div>
                          </td>
                          <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{source.name}</td>
                          <td style={{ maxWidth: 260 }}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', fontSize: 11, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={source.url}>{source.url}</a>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, color: source.last_status === 'ok' ? 'var(--green)' : source.last_status === 'error' ? 'var(--red)' : 'var(--muted)' }}>
                              {source.last_status === 'ok' ? '✓ OK' : source.last_status === 'error' ? '✗ Błąd' : '—'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>{source.deal_count || 0}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-blue" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => testSource(source)} disabled={testing === source.id}>
                                {testing === source.id ? <span className="spinning" style={{ display: 'inline-block' }}>⟳</span> : '▶ Test'}
                              </button>
                              <button className="btn btn-red" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => remove(source)}>✕</button>
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
