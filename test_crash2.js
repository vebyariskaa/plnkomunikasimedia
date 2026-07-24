const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('./test_data.json', 'utf8'));

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

rawData.forEach(req => {
    try {
        escapeHtml(req.namaKegiatan);
        escapeHtml(req.tempatKegiatan);
        escapeHtml(req.waktuKegiatan);
        escapeHtml(req.permintaan);
    } catch(e) {
        console.log("CRASH ON REQ:", req);
        console.log("ERROR:", e);
    }
});
