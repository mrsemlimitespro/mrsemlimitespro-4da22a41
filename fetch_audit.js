const http = require('http');
const fs = require('fs');

const fetch = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => resolve({ status: res.statusCode, data }));
  }).on('error', reject);
});

async function main() {
  console.log("Waiting for server...");
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://localhost:8080/api/public/migration-audit-v3');
      if (res.status === 200) {
        fs.writeFileSync('/tmp/audit_results.json', res.data);
        console.log("Audit data fetched successfully.");
        return;
      }
      console.log("Server returned " + res.status + ", retrying...");
    } catch (e) {
      console.log("Server not ready, retrying...");
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Timeout waiting for audit endpoint");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
