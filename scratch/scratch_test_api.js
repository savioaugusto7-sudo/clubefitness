async function test() {
  const url = 'https://clubefitness.vercel.app/api/clicksign';
  console.log(`Sending GET request to ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Response status: ${res.status}`);
    const data = await res.json();
    console.log('Returned data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error during fetch:', err);
  }
}

test();
