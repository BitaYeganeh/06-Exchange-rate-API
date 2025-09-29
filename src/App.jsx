import { useState, useEffect } from 'react'
import axios from 'axios'

const App = () => {
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('USD') // default
  const [rates, setRates] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get(`https://open.er-api.com/v6/latest/${currency}`)
      .then(res => {
        setRates(res.data.rates)
        setError(null)
      })
      .catch(() => {
        setRates({})
        setError('Error fetching rates')
      })
  }, [currency])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value) setCurrency(value.toUpperCase())
  }

  return (
    <div style={{ padding: '2rem' }}>
      <form onSubmit={handleSubmit}>
        Currency: <input value={value} onChange={e => setValue(e.target.value)} />
        <button type="submit">Get Rates</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {Object.keys(rates).length > 0 && (
        <pre>{JSON.stringify(rates, null, 2)}</pre>
      )}
    </div>
  )
}

export default App
