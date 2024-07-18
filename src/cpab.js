import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const sourcePath = path.join(dirname(fileURLToPath(import.meta.url)), 'parse', 'sign', 'a_bougs.cjs')
const targetPath = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'parse', 'sign', 'a_bougs.cjs')
fs.copyFileSync(sourcePath, targetPath)

function createcfgfile () {
  const configDir = path.join(process.cwd(), 'config')
  const configFilePath = path.join(configDir, 'config.yaml')
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  const configContent = `
ck: 
  `

  fs.writeFileSync(configFilePath, configContent)
}
try { fs.readFileSync(configFilePath) } catch { createcfgfile() }

console.log('Done, The build is success!')