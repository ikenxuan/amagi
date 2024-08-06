import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'


const sourcePath = path.join(dirname(fileURLToPath(import.meta.url)), 'business', 'douyin', 'sign', 'a_bougs.js')
const targetPath = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'business', 'douyin', 'sign', 'a_bougs.js')
fs.copyFileSync(sourcePath, targetPath)