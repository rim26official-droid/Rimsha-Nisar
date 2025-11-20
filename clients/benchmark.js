// clients/benchmark.js
// Simple benchmark: HTTP/1.1 vs HTTP/2

const https = require('https');
const http2 = require('http2');
const { performance } = require('perf_hooks');

const PATHS = ['/', '/style.css', '/app.js'];
const ITERATIONS = 5; // setiap path diminta 5x

function requestHttp1(path) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: 'localhost',
        port: 8080,
        path,
        rejectUnauthorized: false, // self-signed
      },
      (res) => {
        // Consume data tanpa disimpan
        res.on('data', () => {});
        res.on('end', () => resolve());
      }
    );

    req.on('error', (err) => reject(err));
  });
}

async function runHttp1() {
  const start = performance.now();

  for (let i = 0; i < ITERATIONS; i++) {
    await Promise.all(PATHS.map((p) => requestHttp1(p)));
  }

  const end = performance.now();
  return end - start;
}

function requestHttp2(client, path) {
  return new Promise((resolve, reject) => {
    const req = client.request({
      ':method': 'GET',
      ':path': path,
    });

    req.on('response', () => {
      // ignore headers
    });

    req.on('data', () => {
      // consume data without storing
    });

    req.on('end', () => resolve());
    req.on('error', (err) => reject(err));

    req.end();
  });
}

async function runHttp2() {
  const client = http2.connect('https://localhost:8443', {
    rejectUnauthorized: false,
  });

  const start = performance.now();

  for (let i = 0; i < ITERATIONS; i++) {
    // HTTP/2 bisa multiplex, kirim semua path paralel
    await Promise.all(PATHS.map((p) => requestHttp2(client, p)));
  }

  const end = performance.now();

  client.close();
  return end - start;
}

(async () => {
  try {
    console.log('Running benchmark, please make sure servers are running:');
    console.log('- HTTP/1.1 : npm run http1');
    console.log('- HTTP/2   : npm run http2');
    console.log('');

    const http1Time = await runHttp1();
    console.log(`HTTP/1.1 total time: ${http1Time.toFixed(2)} ms`);

    const http2Time = await runHttp2();
    console.log(`HTTP/2   total time: ${http2Time.toFixed(2)} ms`);

    const improvement = ((http1Time - http2Time) / http1Time) * 100;
    console.log('');
    console.log(`Improvement: ${improvement.toFixed(2)} % (positive = HTTP/2 faster)`);
  } catch (err) {
    console.error('Benchmark error:', err);
  }
})();
