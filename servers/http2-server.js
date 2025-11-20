// servers/http2-server.js
// HTTP/2 server over TLS (port 8443)

const http2 = require('http2');
const fs = require('fs');
const path = require('path');
const { getContentType } = require('./utils');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Load self-signed certificate
const options = {
  key: fs.readFileSync(path.join(__dirname, '..', 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'localhost.pem')),
  allowHTTP1: false, // Force HTTP/2 only
};

function sendFile(stream, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      stream.respond({
        'content-type': 'text/plain; charset=utf-8',
        ':status': 404,
      });
      stream.end('404 Not Found (HTTP/2)');
      return;
    }

    const contentType = getContentType(filePath);

    stream.respond({
      'content-type': contentType,
      ':status': 200,
    });

    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (err) => {
      console.error('[HTTP/2] Read error:', err.message);
      stream.respond({
        'content-type': 'text/plain; charset=utf-8',
        ':status': 500,
      });
      stream.end('500 Internal Server Error');
    });

    readStream.pipe(stream);
  });
}

const server = http2.createSecureServer(options);

server.on('stream', (stream, headers) => {
  const method = headers[':method'];
  let reqPath = headers[':path'] || '/';

  console.log(`[HTTP/2] ${method} ${reqPath}`);

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  sendFile(stream, filePath);
});

const PORT = 8443;

server.listen(PORT, () => {
  console.log('====================================');
  console.log('HTTP/2 Server is running');
  console.log(`URL  : https://localhost:${PORT}`);
  console.log('Prot : HTTP/2 over TLS');
  console.log('====================================');
});
