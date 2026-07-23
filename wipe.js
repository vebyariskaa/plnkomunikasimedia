async function wipe() {
  const res = await fetch('https://plnkomunikasimedia.vercel.app/api/requests');
  const data = await res.json();
  console.log('Total data:', data.length);
  for (const req of data) {
    console.log('Deleting', req.id);
    await fetch(`https://plnkomunikasimedia.vercel.app/api/requests/${req.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer pln-admin-session-token-2026' }
    });
  }
  console.log('Done wipe');
}
wipe();
