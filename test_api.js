async function test() {
  const res = await fetch('https://plnkomunikasimedia.vercel.app/api/requests');
  const data = await res.json();
  console.log('Available IDs:', data.map(r => r.id));
  
  if (data.length > 0) {
    const id = data[0].id;
    console.log('Approving id', id);
    const approveRes = await fetch(`https://plnkomunikasimedia.vercel.app/api/requests/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer pln-admin-session-token-2026'
      }
    });
    console.log('Approve status:', approveRes.status);
    const text = await approveRes.text();
    console.log('Approve body:', text);
  }
}
test();
