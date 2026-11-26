/**
 * LLM sağlayıcı katmanı: llm.mjs yalnız bu dosyanın dışa aktardıklarını kullanır
 * (LlmClient, messageText, mapLimit). Sağlayıcıyı değiştirmek için başka dosyaya dokunmak gerekmez.
 *
 * Seçim (LLM_PROVIDER):
 *   manus   Manus çalışma ortamının yerleşik geçidi (yalnız Manus'ta; anahtar gerekmez)
 *   openai  OpenAI           → OPENAI_API_KEY
 *   gemini  Google Gemini    → GEMINI_API_KEY (OpenAI uyumlu uç nokta)
 *   custom  OpenAI uyumlu herhangi bir sunucu → LLM_BASE_URL + LLM_API_KEY (Azure, OpenRouter, Ollama, vLLM)
 * LLM_PROVIDER boşsa sırayla denenir: Manus geçidi varsa o, yoksa OPENAI_API_KEY, yoksa GEMINI_API_KEY.
 *
 * Diğer ayarlar:
 *   LLM_BASE_URL     uç nokta kökünü değiştirir (örn. https://api.openai.com/v1)
 *   LLM_API_KEY      anahtarı doğrudan verir (sağlayıcıya özel değişkenin yerine geçer)
 *   LLM_REASONING    "off" ise `reasoning_effort` hiç gönderilmez (akıl yürütme desteklemeyen modeller)
 *   LLM_STRICT       "off" ise json_schema içindeki `strict` alanı atılır (desteklemeyen sunucular)
 *   LLM_TOKEN_FACTOR çıktı belirteç sınırı çarpanı (Gemini'de düşünme belirteçleri sınırdan yer; varsayılan 4)
 * Modeller Python tarafında MODEL_FAST ve MODEL_DEEP ile verilir (pipeline/config.py).
 */
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const MANUS_LIB = '/home/ubuntu/skills/builtin-llm-models/lib/llm.mjs'
const ENDPOINTS = {
  openai: { base: 'https://api.openai.com/v1', key: 'OPENAI_API_KEY' },
  gemini: { base: 'https://generativelanguage.googleapis.com/v1beta/openai', key: 'GEMINI_API_KEY' },
  custom: { base: '', key: 'LLM_API_KEY' },
}

function pickProvider() {
  const explicit = (process.env.LLM_PROVIDER || '').trim().toLowerCase()
  if (explicit) return explicit
  if (existsSync(MANUS_LIB)) return 'manus'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  throw new Error('LLM sağlayıcı bulunamadı: LLM_PROVIDER ile openai, gemini, custom veya manus seçin ve anahtarı tanımlayın.')
}

export const PROVIDER = pickProvider()

export class LlmError extends Error {
  constructor(message, { status = 0, retryable = false, fatal = false } = {}) {
    super(message)
    this.name = 'LlmError'
    this.status = status
    this.retryable = retryable
    this.fatal = fatal
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** OpenAI uyumlu Chat Completions istemcisi (Node 18+ yerleşik fetch; bağımlılık yok). */
class HttpClient {
  #timeoutMs
  #maxRetries
  #base
  #key

  constructor({ timeoutMs = 240000, maxRetries = 6 } = {}) {
    const ep = ENDPOINTS[PROVIDER]
    if (!ep) throw new LlmError(`Bilinmeyen LLM_PROVIDER: ${PROVIDER}`, { fatal: true })
    this.#timeoutMs = timeoutMs
    this.#maxRetries = maxRetries
    this.#base = (process.env.LLM_BASE_URL || ep.base).replace(/\/+$/, '')
    this.#key = process.env.LLM_API_KEY || process.env[ep.key] || ''
    if (!this.#base) throw new LlmError('custom sağlayıcı için LLM_BASE_URL gerekli.', { fatal: true })
    if (!this.#key && PROVIDER !== 'custom') {
      throw new LlmError(`${ep.key} (veya LLM_API_KEY) tanımlı değil.`, { fatal: true })
    }
  }

  /** İstek gövdesini sağlayıcıya uyarlar; llm.mjs Manus biçiminde yazıldığı için çeviri burada. */
  #adapt(request) {
    const body = { ...request }
    if (body.reasoning) {
      if (process.env.LLM_REASONING !== 'off' && body.reasoning.effort) {
        body.reasoning_effort = body.reasoning.effort
      }
      delete body.reasoning
    }
    if (process.env.LLM_STRICT === 'off' && body.response_format?.json_schema) {
      const { strict, ...rest } = body.response_format.json_schema
      body.response_format = { ...body.response_format, json_schema: rest }
    }
    if (PROVIDER === 'gemini' && body.max_completion_tokens) {
      // Düşünme belirteçleri sınırdan yer; küçük sınır boş yanıt döndürür.
      const factor = Number(process.env.LLM_TOKEN_FACTOR || 4)
      body.max_tokens = Math.round(body.max_completion_tokens * factor)
      delete body.max_completion_tokens
    }
    return body
  }

  async chat(request) {
    if (typeof request?.model !== 'string' || !request.model || !Array.isArray(request.messages)) {
      throw new LlmError('chat() için model ve messages gerekli.', { fatal: true })
    }
    const body = JSON.stringify(this.#adapt(request))
    let last
    let crowd = false
    for (let attempt = 0; attempt <= this.#maxRetries; attempt += 1) {
      // Eşzamanlılık sınırı aşıldığında kısa beklemeler işe yaramaz: istekler yeniden yığılır.
      if (attempt) await sleep(Math.min(30000, 1000 * 2 ** attempt) + (crowd ? 3000 : 0) + Math.random() * 500)
      try {
        const res = await fetch(`${this.#base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(this.#key ? { Authorization: `Bearer ${this.#key}` } : {}) },
          body,
          signal: AbortSignal.timeout(this.#timeoutMs),
        })
        const text = await res.text()
        if (res.ok) return JSON.parse(text)
        const detail = text.slice(0, 300).replace(/\s+/g, ' ')
        crowd = /concurrent|too many requests in flight|rate.?limit/i.test(text)
        // Kota ve yetki hataları her istekte tekrarlanır; hattı durdurmak için fatal işaretlenir.
        const quota = res.status === 429 && /insufficient_quota|no credits|billing|exceeded your current quota/i.test(text)
        const fatal = [400, 401, 403, 404].includes(res.status) || quota
        last = new LlmError(`LLM ${res.status}: ${detail}`, {
          status: res.status, fatal, retryable: !fatal && (res.status === 429 || res.status >= 500),
        })
        if (!last.retryable) throw last
      } catch (e) {
        if (e instanceof LlmError) {
          if (!e.retryable) throw e
          last = e
        } else {
          last = new LlmError(`LLM ağ hatası: ${e.message}`, { retryable: true })
        }
      }
    }
    throw last
  }
}

let ManusClient
if (PROVIDER === 'manus') {
  if (!existsSync(MANUS_LIB)) throw new Error(`Manus geçidi bulunamadı (${MANUS_LIB}); LLM_PROVIDER=openai veya gemini kullanın.`)
  ManusClient = (await import(pathToFileURL(MANUS_LIB).href)).LlmClient
}

export const LlmClient = PROVIDER === 'manus' ? ManusClient : HttpClient

/** İlk seçeneğin metni; çıktı bütçesi tükendiyse null (Manus istemcisiyle aynı sözleşme). */
export function messageText(response) {
  const content = response?.choices?.[0]?.message?.content
  if (Array.isArray(content)) return content.map((p) => p.text || '').join('') || null
  return typeof content === 'string' && content ? content : null
}

/** Sıra korunur; en fazla `limit` iş eşzamanlı. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker))
  return out
}
