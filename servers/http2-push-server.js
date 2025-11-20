// servers/http2-push-server.js
// HTTP/2 server with Server Push (port 8444)

const http2 = require('http2');
const fs = require('fs');
const path = require('path');
const { getContentType } = require('./utils');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Load self-signed certificate
const options = {
  key: fs.readFileSync(path.join(__dirname, '..', 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'localhost.pem')),
  allowHTTP1: false,
};

/**
 * Helper untuk kirim file pada HTTP/2 stream
 */
function sendFile(stream, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      stream.respond({
        'content-type': 'text/plain; charset=utf-8',
        ':status': 404,
      });
      stream.end('404 Not Found (HTTP/2 Push)');
      return;
    }

    const contentType = getContentType(filePath);

    stream.respond({
      'content-type': contentType,
      ':status': 200,
    });

    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (err) => {
      console.error('[HTTP/2 PUSH] Read error:', err.message);
      stream.respond({
        'content-type': 'text/plain; charset=utf-8',
        ':status': 500,
      });
      stream.end('500 Internal Server Error');
    });

    readStream.pipe(stream);
  });
}

/**
 * Helper untuk melakukan server push
 */
function pushResource(parentStream, pathToPush) {
  const fullPath = path.join(PUBLIC_DIR, pathToPush);

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.warn('[HTTP/2 PUSH] Resource not found, skip push:', pathToPush);
      return;
    }

    parentStream.pushStream({ ':path': pathToPush }, (pushErr, pushStream) => {
      if (pushErr) {
        console.error('[HTTP/2 PUSH] pushStream error:', pushErr.message);
        return;
      }

      console.log(`[HTTP/2 PUSH] Pushing: ${pathToPush}`);

      const contentType = getContentType(fullPath);

      pushStream.respond({
        'content-type': contentType,
        ':status': 200,
      });

      const readStream = fs.createReadStream(fullPath);
      readStream.on('error', (err) => {
        console.error('[HTTP/2 PUSH] Read error:', err.message);
        pushStream.respond({
          'content-type': 'text/plain; charset=utf-8',
          ':status': 500,
        });
        pushStream.end('500 Internal Server Error (push)');
      });

      readStream.pipe(pushStream);
    });
  });
}

const server = http2.createSecureServer(options);

server.on('stream', (stream, headers) => {
  const method = headers[':method'];
  let reqPath = headers[':path'] || '/';

  console.log(`[HTTP/2 PUSH] ${method} ${reqPath}`);

  // Hanya lakukan push untuk halaman utama
  if (reqPath === '/' || reqPath === '') {
    // Push CSS dan JS
    pushResource(stream, '/style.css');
    pushResource(stream, '/app.js');

    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  sendFile(stream, filePath);
});

const PORT = 8444;

server.listen(PORT, () => {
  console.log('====================================');
  console.log('HTTP/2 + Server Push Server running');
  console.log(`URL  : https://localhost:${PORT}`);
  console.log('Prot : HTTP/2 over TLS with PUSH');
  console.log('====================================');
});
