// lib/healthkit.ios.js
import AppleHealthKit from 'react-native-health'

// selectedItems: [{ identifier, read: bool, write: bool }]
export async function requestHealthPermissions(selectedItems) {
  const read = []
  const write = []
  for (const it of selectedItems) {
    if (it.read) read.push(it.identifier)
    if (it.write) write.push(it.identifier)
  }

  const perms = { permissions: { read, write } }

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(perms, (err) => {
      if (err) {
        console.log('HealthKit init error:', err)
        resolve({ ok: false, reason: String(err?.message || err) })
      } else {
        resolve({ ok: true })
      }
    })
  })
}
