import { Router } from 'express'

const router = Router()

const WISE_BASE = 'https://wise.com/rates'

async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const message = text || `Upstream error ${res.status}`
      const error = new Error(message)
      error.status = 502
      throw error
    }
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

router.get('/currencies', async (req, res) => {
  try {
    const url = `${WISE_BASE}/currencies`
    const data = await fetchJsonWithTimeout(url)
    res.json(data)
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to fetch currencies', details: err.message })
  }
})

router.get('/rates/live', async (req, res) => {
  try {
    const { source, target } = req.query
    if (!source || !target) {
      return res.status(400).json({ error: 'Missing query params: source and target are required' })
    }
    const url = `${WISE_BASE}/live?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`
    const data = await fetchJsonWithTimeout(url)
    res.json(data)
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to fetch live rate', details: err.message })
  }
})

router.get('/rates/history', async (req, res) => {
  try {
    const { source, target } = req.query
    const length = Number(req.query.length) || 30
    const unit = req.query.unit || 'day'
    const resolution = req.query.resolution || 'hourly'

    if (!source || !target) {
      return res.status(400).json({ error: 'Missing query params: source and target are required' })
    }

    const cappedLength = Math.min(Math.max(length, 1), 30)
    const url = `${WISE_BASE}/history?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}&length=${cappedLength}&unit=${encodeURIComponent(unit)}&resolution=${encodeURIComponent(resolution)}`
    const data = await fetchJsonWithTimeout(url)
    res.json(data)
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to fetch history', details: err.message })
  }
})

// Convert amount using latest live rate
router.get('/convert', async (req, res) => {
  try {
    const { source, target, amount } = req.query
    if (!source || !target) {
      return res.status(400).json({ error: 'Missing query params: source and target are required' })
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: 'Invalid amount. Provide a non-negative number via ?amount=' })
    }

    const url = `${WISE_BASE}/live?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`
    const live = await fetchJsonWithTimeout(url)

    const rate = Number(live?.value)
    if (!Number.isFinite(rate)) {
      return res.status(502).json({ error: 'Invalid rate data from upstream' })
    }

    const converted = parsedAmount * rate

    res.json({
      source: String(source).toUpperCase(),
      target: String(target).toUpperCase(),
      amount: parsedAmount,
      rate,
      converted,
      time: live?.time
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: 'Failed to convert amount', details: err.message })
  }
})

export default router


