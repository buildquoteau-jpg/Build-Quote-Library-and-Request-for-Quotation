const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = 'C:/Users/melia/OneDrive/Desktop'
const PORT = 4323

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.pdf':  'application/pdf',
  '.svg':  'image/svg+xml',
}

http.createServer((req, res) => {
  const filePath = path.join(ROOT, decodeURIComponent(req.url))
  const ext = path.extname(filePath)
  try {
    const data = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  } catch (e) {
    res.writeHead(404)
    res.end('Not found: ' + filePath)
  }
}).listen(PORT, () => {
  console.log('Server running on http://localhost:' + PORT)
})
