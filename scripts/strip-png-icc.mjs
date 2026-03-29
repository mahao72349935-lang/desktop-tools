/**
 * Remove iCCP / sRGB-related chunks from PNG to silence Chromium libpng iCCP warnings.
 * Run: node scripts/strip-png-icc.mjs
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const inputPath = join(__dirname, '../resources/icon.png')

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const SKIP_TYPES = new Set(['iCCP', 'sRGB', 'cHRM', 'gAMA'])

function stripPngChunks(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error('Not a PNG file')
  }
  const out = [PNG_SIG]
  let offset = 8
  while (offset < buf.length) {
    if (offset + 12 > buf.length) break
    const len = buf.readUInt32BE(offset)
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii')
    const total = 12 + len
    if (offset + total > buf.length) break
    if (!SKIP_TYPES.has(type)) {
      out.push(buf.subarray(offset, offset + total))
    }
    offset += total
    if (type === 'IEND') break
  }
  return Buffer.concat(out)
}

const raw = fs.readFileSync(inputPath)
const cleaned = stripPngChunks(raw)
fs.writeFileSync(inputPath, cleaned)
console.log('Stripped ICC/sRGB chunks from resources/icon.png')
