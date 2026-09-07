const http = require('http');
const fs = require('fs');
const token = fs.readFileSync(process.env.TEMP + '\\token-test.txt', 'utf8').trim();

// Test document upload with multipart form data
const boundary = '----FormBoundary' + Math.random().toString(16).slice(2);
const fileContent = 'Test document content for insurance claim';
const parts = [
  '--' + boundary,
  'Content-Disposition: form-data; name="documentType"',
  '',
  'claim_form',
  '--' + boundary,
  'Content-Disposition: form-data; name="file"; filename="test.pdf"',
  'Content-Type: application/pdf',
  '',
  fileContent,
  '--' + boundary + '--',
  ''
];
const body = parts.join('\r\n');

const req = http.request({
  hostname: 'localhost',
  port: 8531,
  path: '/api/v1/insurance/claims/11111111-1111-1111-1111-111111111111/documents',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let d = '';
  res.on('data', (c) => d += c);
  res.on('end', () => {
    console.log('POST /claims/{id}/documents:', res.statusCode, d.substring(0, 400));
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
