const fs = require('fs');

let token = '';
let baseUrl = 'https://sandbox.clicksign.com';

try {
  const content = fs.readFileSync('.env.production.local', 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
      if (key === 'CLICKSIGN_ACCESS_TOKEN') token = val;
      if (key === 'CLICKSIGN_API_URL') baseUrl = val;
    }
  });
} catch (e) {
  console.error('Error reading env file:', e);
}

const envelopeId = '4c75888b-2633-4ada-bb7c-acab9bc341a6';

async function run() {
  console.log(`Using Base URL: ${baseUrl}`);
  console.log(`Using Token: ${token ? 'Loaded' : 'NOT Loaded'}`);

  if (!token) return;

  const res = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}`, {
    method: 'GET',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json'
    }
  });

  console.log(`Response Status: ${res.status}`);
  const data = await res.json();
  console.log(`Response Body:`, JSON.stringify(data, null, 2));
}

run().catch(err => console.error(err));
