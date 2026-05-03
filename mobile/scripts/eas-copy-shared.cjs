/**
 * EAS runs this before `npm install` in `mobile/`. Copies repo `shared/` into `mobile/shared/`
 * so Metro can resolve `@shared/*` when the build worker only has the app subtree.
 * Safe no-op if `../shared` is missing (local mobile-only trees should keep using ../shared via Metro).
 */
const fs = require('fs')
const path = require('path')

const mobileRoot = path.resolve(__dirname, '..')
const repoShared = path.join(mobileRoot, '..', 'shared')
const dest = path.join(mobileRoot, 'shared')

if (!fs.existsSync(repoShared)) {
  process.exit(0)
}

fs.rmSync(dest, { recursive: true, force: true })
fs.cpSync(repoShared, dest, { recursive: true })
