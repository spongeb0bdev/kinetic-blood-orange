import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)

console.log('=== KINETIC M1 VERIFICATION SUITE ===')
console.log('Project Root:', rootDir)

let failures = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
  } else {
    console.error(`[FAIL] ${message}`)
    failures++
  }
}

// 1. Verify Dependencies
console.log('\n--- 1. Dependency Resolution ---')
const packages = [
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'gsap',
  '@gsap/react',
  'lucide-react',
  'tailwindcss',
  '@tailwindcss/vite',
  'typescript',
  'vite',
]

for (const pkg of packages) {
  try {
    const resolved = require.resolve(pkg, { paths: [rootDir] })
    assert(Boolean(resolved), `Package resolved: ${pkg} (${resolved})`)
  } catch (err) {
    assert(false, `Package resolved: ${pkg} (Error: ${err.message})`)
  }
}

// 2. Verify 3D Model Asset
console.log('\n--- 2. 3D Model Asset Verification ---')
const modelPath = path.join(rootDir, 'public', 'models', 'Kinetic_Blood_Orange.glb')
assert(fs.existsSync(modelPath), `Model file exists at ${modelPath}`)

if (fs.existsSync(modelPath)) {
  const stat = fs.statSync(modelPath)
  assert(stat.size === 2132256, `Model size is exactly 2,132,256 bytes (got ${stat.size})`)

  const buffer = fs.readFileSync(modelPath)
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  const expectedHash = 'cc0bfea28ba2f97e61ab56412c8bc00da2c258bd9ff32a5c5191fbf5b1558b35'
  assert(hash === expectedHash, `Model SHA256 matches authentic asset (${hash})`)
}

// 3. Verify Standalone Isolation
console.log('\n--- 3. Standalone Isolation Verification ---')
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDir(fullPath)
    } else if (/\.(tsx?|jsx?|json|html|css|md)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      const hasRaymond = /raymond/i.test(content)
      const relative = path.relative(rootDir, fullPath)
      assert(!hasRaymond, `Zero Raymond references in ${relative}`)
    }
  }
}
scanDir(rootDir)

// 4. Verify Build Output
console.log('\n--- 4. Build Output Verification ---')
const distIndex = path.join(rootDir, 'dist', 'index.html')
const distModel = path.join(rootDir, 'dist', 'models', 'Kinetic_Blood_Orange.glb')
assert(fs.existsSync(distIndex), `dist/index.html exists`)
assert(fs.existsSync(distModel), `dist/models/Kinetic_Blood_Orange.glb exists`)

console.log('\n=== VERIFICATION SUMMARY ===')
if (failures === 0) {
  console.log('ALL CHECKS PASSED: Standalone project M1 foundation is 100% verified.')
  process.exit(0)
} else {
  console.error(`FAILED: ${failures} checks failed.`)
  process.exit(1)
}
