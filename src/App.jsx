import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const API = 'https://open.er-api.com/v6/latest'
const POPULAR = ['USD', 'EUR', 'GBP', 'SEK', 'NOK', 'JPY', 'CHF', 'CAD']

// "EUR" -> "Euro" (falls back to the code if the browser doesn't know it)
const names = new Intl.DisplayNames(['en'], { type: 'currency' })
const currencyName = (code) => {
  try {
    return names.of(code)
  } catch {
    return code
  }
}

const formatMoney = (value, code) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    // two decimals for normal amounts, more for very small ones
    maximumFractionDigits: value === 0 || value >= 1 ? 2 : 6,
  }).format(value)

const formatRate = (value) =>
  new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 5 }).format(value)

// Remember the last choice between visits (ignored if storage is blocked)
const load = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}
const save = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode: nothing to do */
  }
}

const App = () => {
  const [amount, setAmount] = useState(() => load('amount', '100'))
  const [from, setFrom] = useState(() => load('from', 'EUR'))
  const [to, setTo] = useState(() => load('to', 'USD'))
  const [data, setData] = useState(null) // { base, rates, updated }
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [retry, setRetry] = useState(0)

  // Fetch the rates whenever the "from" currency changes
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    axios
      .get(`${API}/${from}`)
      .then((res) => {
        if (cancelled) return
        if (res.data.result !== 'success') throw new Error('Unknown currency')
        setData({
          base: res.data.base_code,
          rates: res.data.rates,
          updated: new Date(res.data.time_last_update_unix * 1000),
        })
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [from, retry])

  useEffect(() => save('amount', amount), [amount])
  useEffect(() => save('from', from), [from])
  useEffect(() => save('to', to), [to])

  const codes = useMemo(
    () => (data ? Object.keys(data.rates).sort() : [from, to]),
    [data, from, to]
  )

  const value = Number(amount)
  const validAmount = amount !== '' && Number.isFinite(value) && value >= 0
  const rate = data?.base === from ? data.rates[to] : undefined
  const ready = status === 'ready' && rate !== undefined

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const renderOptions = () =>
    codes.map((code) => (
      <option key={code} value={code}>
        {code} · {currencyName(code)}
      </option>
    ))

  return (
    <div className="page">
      <main className="card">
        <header className="card__header">
          <span className="logo" aria-hidden="true">
            €$
          </span>
          <div>
            <h1>Currency converter</h1>
            <p className="muted">Live exchange rates for {codes.length > 2 ? codes.length : '160+'} currencies</p>
          </div>
        </header>

        <form className="converter" onSubmit={(e) => e.preventDefault()}>
          <label className="field field--amount">
            <span>Amount</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!validAmount}
            />
          </label>

          <label className="field field--from">
            <span>From</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {renderOptions()}
            </select>
          </label>

          <button
            type="button"
            className="swap"
            onClick={swap}
            aria-label={`Swap: convert ${to} to ${from}`}
            title="Swap currencies"
          >
            ⇄
          </button>

          <label className="field field--to">
            <span>To</span>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {renderOptions()}
            </select>
          </label>
        </form>

        <section className={`result${status === 'error' ? ' result--error' : ''}`} aria-live="polite">
          {status === 'error' ? (
            <div className="error" role="alert">
              <p>Couldn't load exchange rates. Check your connection and try again.</p>
              <button type="button" className="btn" onClick={() => setRetry((n) => n + 1)}>
                Try again
              </button>
            </div>
          ) : !ready ? (
            <p className="muted">Loading rates…</p>
          ) : !validAmount ? (
            <p className="muted">Enter an amount of 0 or more.</p>
          ) : (
            <>
              <p className="result__from">
                {formatMoney(value, from)} =
              </p>
              <p className="result__to">{formatMoney(value * rate, to)}</p>
              <p className="muted result__rates">
                1 {from} = {formatRate(rate)} {to} · 1 {to} = {formatRate(1 / rate)} {from}
              </p>
            </>
          )}
        </section>

        {ready && validAmount && (
          <section className="popular" aria-labelledby="popular-title">
            <h2 id="popular-title">
              {formatMoney(value, from)} in other currencies
            </h2>
            <ul>
              {POPULAR.filter((code) => code !== from && data.rates[code]).map((code) => (
                <li key={code}>
                  <button
                    type="button"
                    className={`chip${code === to ? ' chip--active' : ''}`}
                    onClick={() => setTo(code)}
                    aria-pressed={code === to}
                  >
                    <span className="chip__code">{code}</span>
                    <span className="chip__value">
                      {formatMoney(value * data.rates[code], code)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="card__footer muted">
          {data && (
            <span>
              Rates updated{' '}
              {data.updated.toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
            Rates by Exchange Rate API
          </a>
        </footer>
      </main>
    </div>
  )
}

export default App
