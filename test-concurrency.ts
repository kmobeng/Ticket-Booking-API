import path from 'path';
import fs from 'fs';

async function getAuthToken(): Promise<string> {
  const res = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kenneth@gmail.com',
      password: 'pass1234',
    }),
  });
  const data = await res.json();
  return data.token;
}

async function fireRequests() {
  const token = await getAuthToken();
  const ticketId = '91c16ec8-3478-4768-816d-062c6b49a067';

  const promises = Array.from({ length: 100 }, (_, i) =>
    fetch('http://localhost:3000/api/v1/reservation/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': `test-${Date.now()}-${i}`,
      },
      body: JSON.stringify({ ticketId, quantity: 1 }),
    }),
  );

  //wait for all request to complete and write results to file "./results.txt"
  const results = await Promise.all(promises);

  const succeeded = results.filter((r) => r.status === 201).length;
  const failed = results.filter((r) => r.status !== 201).length;

  const filePath = path.join(__dirname, 'results.txt');
  const log = `Succeeded: ${succeeded}, Failed: ${failed}\n`;
  fs.appendFileSync(filePath, log);
}

void fireRequests();
