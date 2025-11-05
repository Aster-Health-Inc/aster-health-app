import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'

const ensureSha256Digest = () => {
  const globalCrypto = globalThis.crypto || {}

  if (globalCrypto.subtle && typeof globalCrypto.subtle.digest === 'function') {
    return
  }

  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount))

  const sha256Hex = (ascii) => {
    const mathPow = Math.pow
    const maxWord = mathPow(2, 32)
    const lengthProperty = 'length'
    let result = ''
    let words = []
    const asciiBitLength = ascii[lengthProperty] * 8

    let hash = sha256Hex.h || []
    const k = sha256Hex.k || []
    const primeList = sha256Hex.primes || []
    let primeCounter = k[lengthProperty]

    if (!primeList[lengthProperty]) {
      const isComposite = {}
      for (let candidate = 2; primeCounter < 64; candidate += 1) {
        if (!isComposite[candidate]) {
          for (let i = 0; i < 313; i += candidate) {
            isComposite[i] = candidate
          }

          primeList.push(candidate)
          hash[primeCounter] = ((candidate ** 0.5) * maxWord) | 0
          k[primeCounter] = ((candidate ** (1 / 3)) * maxWord) | 0
          primeCounter += 1
        }
      }

      sha256Hex.h = hash
      sha256Hex.k = k
      sha256Hex.primes = primeList
    }

    hash = hash.slice(0)

    ascii += '\u0080'
    while (ascii[lengthProperty] % 64 - 56) ascii += '\u0000'
    for (let i = 0; i < ascii[lengthProperty]; i += 1) {
      const j = ascii.charCodeAt(i)
      words[i >> 2] |= j << ((((3 - i) % 4) + 4) % 4) * 8
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0
    words[words[lengthProperty]] = asciiBitLength

    for (let j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, (j += 16))
      const oldHash = hash.slice(0)

      for (let i = 0; i < 64; i += 1) {
        const w15 = w[i - 15]
        const w2 = w[i - 2]

        const a = hash[0]
        const e = hash[4]
        const temp1 =
          hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ (~e & hash[6])) +
          k[i] +
          (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0)

        const temp2 =
          (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))

        hash = [(temp1 + temp2) | 0].concat(hash)
        hash[4] = (hash[4] + temp1) | 0
        hash.pop()
      }

      for (let i = 0; i < 8; i += 1) {
        hash[i] = (hash[i] + oldHash[i]) | 0
      }
    }

    for (let i = 0; i < 8; i += 1) {
      for (let j = 3; j + 1; j -= 1) {
        const b = (hash[i] >> (j * 8)) & 255
        result += (b < 16 ? '0' : '') + b.toString(16)
      }
    }

    words = []

    return result
  }

  const bufferToBinaryString = (buffer) => {
    if (typeof buffer === 'string') return buffer
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      const part = bytes.subarray(i, i + chunk)
      binary += String.fromCharCode.apply(null, part)
    }
    return binary
  }

  const hexToArrayBuffer = (hex) => {
    const length = hex.length / 2
    const result = new Uint8Array(length)
    for (let i = 0; i < length; i += 1) {
      result[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    return result.buffer
  }

  const subtlePolyfill = {
    async digest(algorithm, data) {
      const algoName =
        typeof algorithm === 'string'
          ? algorithm.toLowerCase()
          : String(algorithm?.name ?? '').toLowerCase()

      if (algoName !== 'sha-256') {
        throw new Error(`Unsupported algorithm: ${algoName}`)
      }

      if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
        throw new TypeError('Expected ArrayBuffer input')
      }

      const binary = bufferToBinaryString(data)
      const hashHex = sha256Hex(binary)
      return hexToArrayBuffer(hashHex)
    },
  }

  globalCrypto.subtle = subtlePolyfill
  globalThis.crypto = globalCrypto
}

const ensureRandomValues = () => {
  const globalCrypto = globalThis.crypto || {}

  if (typeof globalCrypto.getRandomValues === 'function') {
    return
  }

  let generator = null

  try {
    const expoRandom = require('expo-random')
    if (expoRandom?.getRandomValues) {
      generator = expoRandom.getRandomValues
    }
  } catch (error) {
    console.log('[warn] expo-random unavailable, falling back to Math.random for getRandomValues')
  }

  if (!generator) {
    generator = (typedArray) => {
      if (!typedArray || typeof typedArray.length !== 'number') {
        throw new TypeError('Expected a TypedArray')
      }

      for (let index = 0; index < typedArray.length; index += 1) {
        typedArray[index] = Math.floor(Math.random() * 256)
      }

      return typedArray
    }
  }

  globalCrypto.getRandomValues = generator
  globalThis.crypto = globalCrypto
}

ensureRandomValues()
ensureSha256Digest()

// Polyfill for structuredClone in web browsers
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

const supabaseUrl = 'https://iinbwdrzmmcwajbmuynh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbmJ3ZHJ6bW1jd2FqYm11eW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODEwNjgsImV4cCI6MjA2NzA1NzA2OH0.31o5g-ES31ary6-JIe_QeRDctrP03NZ07V9icf2VWNU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})

const processDeepLink = async (rawUrl) => {
  if (!rawUrl) return

  const parsed = Linking.parse(rawUrl)
  const path = parsed?.path ?? ''

  if (typeof path !== 'string' || !path.includes('auth/callback')) {
    return
  }

  try {
    const { data, error } = await supabase.auth.getSessionFromUrl(rawUrl, {
      storeSession: true,
    })
    if (error) {
      console.log('[warn] supabase getSessionFromUrl error:', error)
      return
    }

    if (data?.session) {
      // Supabase already stores the session via storeSession: true.
      console.log('[info] Supabase session restored from deep link')
    }
  } catch (error) {
    console.log('[warn] processDeepLink exception:', error)
  }
}

if (!globalThis.__supabaseDeepLinkListenerSet) {
  globalThis.__supabaseDeepLinkListenerSet = true

  Linking.addEventListener('url', (event) => {
    processDeepLink(event?.url)
  })

  Linking.getInitialURL()
    .then((url) => processDeepLink(url))
    .catch((error) => {
      console.log('[warn] getInitialURL failed:', error)
    })
}
