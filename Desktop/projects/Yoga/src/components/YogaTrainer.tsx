import { useEffect, useState, useRef } from 'react'
import { loadState, saveState } from '../utils/localStorage'
import './YogaTrainer.css'
import POSTURES from '../data/postures.json'

type SessionData = {
  date: string
  holdSeconds: number
  breathsPerMinute: number
  energy: number
}

type TrainerState = {
  sessions: SessionData[]
  nextHoldSeconds: number
  streak: number
}

const STORAGE_KEY = 'yoga.trainer.v1'

function defaultState(): TrainerState {
  return { sessions: [], nextHoldSeconds: 20, streak: 0 }
}

function calcEnergy(hr: number | null, motion: number, consistency: number) {
  // simple normalized energy metric 0..100
  const hrScore = hr ? Math.max(0, Math.min(1, (220 - hr) / 100)) : 0.5
  const motionScore = Math.max(0, Math.min(1, motion))
  const consScore = Math.max(0, Math.min(1, consistency))
  return Math.round((0.5 * hrScore + 0.3 * motionScore + 0.2 * consScore) * 100)
}

export default function YogaTrainer() {
  const [state, setState] = useState<TrainerState>(() => loadState(STORAGE_KEY) ?? defaultState())
  const [running, setRunning] = useState(false)
  const [timer, setTimer] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const [energy, setEnergy] = useState(50)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')

  const categories = Array.from(new Set(['All', ...POSTURES.map((p: any) => p.category)]))
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    if (selected) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])


  useEffect(() => {
    // persist
    saveState(STORAGE_KEY, state)
  }, [state])

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setTimer((t) => t + 1), 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setTimer(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  useEffect(() => {
    // simple simulated sensor sampling to update energy visualization
    const id = window.setInterval(() => {
      const fakeHeart = 60 + Math.round(Math.random() * 60)
      const fakeMotion = running ? 0.6 : 0.05
      const consistency = Math.min(1, state.streak / 7)
      setEnergy(calcEnergy(fakeHeart, fakeMotion, consistency))
    }, 2000)
    return () => clearInterval(id)
  }, [running, state.streak])

  function completeSession() {
    const s: SessionData = {
      date: new Date().toISOString(),
      holdSeconds: state.nextHoldSeconds,
      breathsPerMinute: 6,
      energy,
    }
    const sessions = [...state.sessions, s].slice(-30)
    // update streak: if last session was yesterday or today, increment, else reset
    const lastDate = state.sessions.length ? new Date(state.sessions[state.sessions.length - 1].date) : null
    let streak = 1
    if (lastDate) {
      const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      streak = diffDays <= 1 ? state.streak + 1 : 1
    }

    // adaptive rule: after 3 consistent days, increase hold by 10%
    let nextHold = state.nextHoldSeconds
    if (streak >= 3) nextHold = Math.round(nextHold * 1.1)

    const newState: TrainerState = { sessions, nextHoldSeconds: nextHold, streak }
    setState(newState)
    setRunning(false)
  }

  function resetHistory() {
    const s = defaultState()
    setState(s)
  }

  return (
    <div className="trainer-root">
      <section className="mandala-wrap">
        <div className="mandala" style={{ ['--energy' as any]: `${energy}%` }} aria-hidden>
          <div className="mandala-core">{energy}</div>
        </div>
        <div className="trainer-stats">
          <div>Next hold: {state.nextHoldSeconds}s</div>
          <div>Streak: {state.streak} days</div>
          <div>Sessions: {state.sessions.length}</div>
        </div>
      </section>

      <section className="controls">
        <div className="timer">{running ? `Holding: ${timer}s` : `Ready — ${state.nextHoldSeconds}s hold`}</div>
        <div className="buttons">
          <button onClick={() => setRunning((r) => !r)}>{running ? 'Stop' : 'Start'}</button>
          <button onClick={completeSession} title="Mark session complete">Complete</button>
          <button onClick={resetHistory}>Reset</button>
        </div>
      </section>

      {/* sensors removed — using simulated offline values */}

      <section className="history">
        <h3>Recent sessions</h3>
        <ul>
          {state.sessions.slice().reverse().map((s) => (
            <li key={s.date}>
              <strong>{new Date(s.date).toLocaleDateString()}</strong> — hold {s.holdSeconds}s — energy {s.energy}
            </li>
          ))}
          {state.sessions.length === 0 && <li>No sessions yet — start with Start → Complete</li>}
        </ul>
      </section>

      <section className="pose-library">
        <h3>Pose Library</h3>

        <div className="pose-controls">
          <div className="search-wrap">
            <input aria-label="Search poses" placeholder="Search poses (name or benefit)" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>}
          </div>
          <div className="tabs" role="tablist" aria-label="Pose categories">
            {categories.map((c) => (
              <button key={c} role="tab" aria-selected={c === category} className={c === category ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="poses">
          {POSTURES.filter((p: any) => {
            if (category !== 'All' && p.category !== category) return false
            if (!search) return true
            const s = search.toLowerCase()
            return p.name.toLowerCase().includes(s) || (p.benefits || []).some((b: string) => b.toLowerCase().includes(s))
          }).map((p: any) => (
            <article key={p.name} className="pose" tabIndex={0} onClick={() => setSelected(p)} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(p) }}>
              <div className="pose-head">
                <h4>{p.name}</h4>
                <small className="cat">{p.category}</small>
              </div>
              <div className="pose-body">
                <img src={`/${p.image}`} alt={p.name} width={160} height={120} loading="lazy" />
                <div className="pose-info">
                  <ul>
                    {(p.benefits || []).slice(0, 4).map((b: string, i: number) => <li key={i}>{b}</li>)}
                  </ul>
                  <div className="actions">
                    <button onClick={(ev) => { ev.stopPropagation(); setSelected(p) }}>View details</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {selected && (
          <div className="modal" role="dialog" aria-modal="true" aria-label={selected.name} onClick={() => setSelected(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
              <div className="modal-row">
                <img src={`/${selected.image}`} alt={selected.name} width={320} height={240} />
                <div>
                  <h2>{selected.name}</h2>
                  <p className="muted">{selected.category}</p>
                  <h4>Benefits</h4>
                  <ul>{(selected.benefits || []).map((b: string, i: number) => <li key={i}>{b}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
