import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'
import chalk from 'chalk'

const __dirname = dirname(fileURLToPath(import.meta.url))
// file output path
const output = fs.createWriteStream(path.join('amagi.zip'))
const archive = archiver('zip', {
  zlib: { level: 9 } // 压缩级别
})

output.on('close', function () {
  console.log(archive.pointer() + ' total bytes')
  console.log(chalk.green('Done! archiver has been finalized and the output file descriptor has closed.'))
})

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
output.on('end', function () {
  console.log('Data has been drained')
})

// good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', function (err) {
  if (err.code === 'ENOENT') {
    // log warning
  } else {
    // throw error
    throw err
  }
})

// good practice to catch this error explicitly
archive.on('error', function (err) {
  throw err
})


// pipe archive data to the file
archive.pipe(output)

// append files from a sub-directory and naming it `new-subdir` within the archivearchive.directory('node_modules/', 'node_modules')
archive.directory('node_modules/', 'node_modules')
archive.directory('lib/', 'lib')
archive.directory('config/', 'config')

// append a file from stream
archive.append(fs.createReadStream(path.join(__dirname, '..', '/README.md')), { name: 'README.md' })
archive.append(fs.createReadStream(path.join(__dirname, '..', '/package.json')), { name: 'package.json' })

// Done
archive.finalize()