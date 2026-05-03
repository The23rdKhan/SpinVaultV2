const path = require('path')
const fs = require('fs')
const { getDefaultConfig } = require('expo/metro-config')
const { resolve: metroResolve } = require('metro-resolver').default

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '..')
/** Repo `shared/` (dev). EAS `eas-build-pre-install` may mirror it into `mobile/shared/`. */
const embeddedSharedRoot = path.join(projectRoot, 'shared')
const monorepoSharedRoot = path.join(monorepoRoot, 'shared')

function resolveSharedSourceFile(baseWithoutExt) {
  const exts = ['.tsx', '.ts', '.jsx', '.js', '.json']
  for (const ext of exts) {
    const full = baseWithoutExt + ext
    try {
      if (fs.statSync(full).isFile()) return full
    } catch {
      /* try next */
    }
  }
  for (const ext of exts) {
    const full = path.join(baseWithoutExt, 'index' + ext)
    try {
      if (fs.statSync(full).isFile()) return full
    } catch {
      /* try next */
    }
  }
  return null
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot)

const existingWatch = config.watchFolders ?? []
config.watchFolders = existingWatch.includes(monorepoRoot)
  ? existingWatch
  : [...existingWatch, monorepoRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

const upstreamResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@shared/')) {
    const rel = moduleName.slice('@shared/'.length)
    for (const root of [embeddedSharedRoot, monorepoSharedRoot]) {
      const filePath = resolveSharedSourceFile(path.join(root, rel))
      if (filePath) {
        return { type: 'sourceFile', filePath }
      }
    }
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform)
  }
  return metroResolve(context, moduleName, platform)
}

module.exports = config
