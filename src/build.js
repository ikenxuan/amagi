import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const sourcePath = path.join(dirname(fileURLToPath(import.meta.url)), 'business', 'douyin', 'sign', 'a_bougs.cjs')
const targetPath = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'business', 'douyin', 'sign', 'a_bougs.cjs')
fs.copyFileSync(sourcePath, targetPath)

console.log(chalk.green('Done, The build is success!'))