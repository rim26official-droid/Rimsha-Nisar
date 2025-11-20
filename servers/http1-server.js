// servers/http1-server.js
// HTTP/1.1 server over HTTPS (port 8080)

const https = require('https');
const fs = require('fs');
const path = require('path');
const { getContentType } = require('./utils');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Load self-signed certificate
const options = {
  key: fs.readFileSync(path.join(__dirname, '..', 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'localhost.pem')),
};

/**
 * Helper untuk kirim file statis
 */
function sendFile(res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found (HTTP/1.1)');
      return;
    }

    const contentType = getContentType(filePath);
    res.writeHead(200, { 'Content-Type': contentType });

    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (err) => {
      console.error('[HTTP/1.1] Read error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    });

    readStream.pipe(res);
  });
}

const server = https.createServer(options, (req, res) => {
  console.log(`[HTTP/1.1] ${req.method} ${req.url}`);

  let urlPath = req.url;

  // Default ke /index.html
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  // Normalisasi path
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  sendFile(res, filePath);
});

const PORT = 8080;

server.listen(PORT, () => {
  console.log('====================================');
  console.log('HTTP/1.1 Server is running');
  console.log(`URL  : https://localhost:${PORT}`);
  console.log('Prot : HTTP/1.1 over TLS');
  console.log('====================================');
});
