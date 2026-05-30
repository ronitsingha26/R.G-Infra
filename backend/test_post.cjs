const http = require('http');

const data = JSON.stringify({
  name: 'Test Client',
  phone: '9999999999',
  flat_id: 1,
  corpus_fund: '5000'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/clients',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer ' // Needs a token! But auth might fail first
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
