import { translate } from 'google-translate-api-x'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const exercisesPath = path.join(root, 'src/data/exercises.json')
const outPath = path.join(root, 'src/data/i18nKo.json')

const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'))
const phrases = new Set()
for (const e of exercises) {
  if (e.name) phrases.add(e.name)
  if (e.shortDescription) phrases.add(e.shortDescription)
  if (e.instructions) phrases.add(e.instructions)
  if (e.breathing) phrases.add(e.breathing)
  for (const x of e.steps || []) phrases.add(x)
  for (const x of e.formCues || []) phrases.add(x)
  for (const x of e.commonMistakes || []) phrases.add(x)
}

let map = {}
if (fs.existsSync(outPath)) {
  map = JSON.parse(fs.readFileSync(outPath, 'utf8'))
}

const pending = [...phrases].filter((p) => !map[p])
console.log(`total=${phrases.size} cached=${phrases.size - pending.length} pending=${pending.length}`)

const BATCH = 20
for (let i = 0; i < pending.length; i += BATCH) {
  const chunk = pending.slice(i, i + BATCH)
  let attempt = 0
  while (attempt < 6) {
    try {
      const results = await translate(chunk, { from: 'en', to: 'ko', forceBatch: false })
      const arr = Array.isArray(results) ? results : [results]
      chunk.forEach((src, idx) => {
        const text = arr[idx]?.text
        if (text) map[src] = text
      })
      fs.writeFileSync(outPath, JSON.stringify(map))
      console.log(`ok ${Math.min(i + BATCH, pending.length)}/${pending.length}`)
      break
    } catch (err) {
      attempt += 1
      const wait = 2000 * attempt
      console.warn(`retry ${attempt} after ${wait}ms`, err?.message || err)
      await new Promise((r) => setTimeout(r, wait))
      if (attempt >= 6) throw err
    }
  }
  await new Promise((r) => setTimeout(r, 500))
}

fs.writeFileSync(outPath, JSON.stringify(map))
console.log(`wrote ${outPath} entries=${Object.keys(map).length}`)
