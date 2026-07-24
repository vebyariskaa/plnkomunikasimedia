const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('./test_data.json', 'utf8'));

// Format Date to local Indonesian format
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

try {
    const rilisAcc = rawData.filter(item => item.tipePermohonan && String(item.tipePermohonan).toLowerCase().includes('rilis berita') && item.status === 'Disetujui').length;
    console.log("Rilis acc:", rilisAcc);
    
    let allNews = rawData.filter(item => item.tipePermohonan && String(item.tipePermohonan).toLowerCase().includes('rilis berita') && item.status === 'Disetujui');
    
    allNews.forEach(req => {
        const desc = req.isiRilisAdmin || 'Rilis berita resmi Komunikasi PLN UP3 Kotamobagu';
        const title = escapeHtml(req.judulBeritaAdmin || 'Judul Rilis Berita (Draft Admin)');
        const t2 = escapeHtml(desc);
        const t3 = formatDate(req.tanggalKegiatan);
        const t4 = escapeHtml(req.tempatKegiatan);
        const thumbnail = (req.fotoPaths && req.fotoPaths.length > 0) ? req.fotoPaths[0] : '';
        if (thumbnail) {
            escapeHtml(req.namaKegiatan);
        }
    });

    const reqDokumentasi = rawData.filter(item => !item.tipePermohonan || !String(item.tipePermohonan).toLowerCase().includes('rilis berita'));
    reqDokumentasi.forEach((req) => {
        const no = req.no;
        const nk = escapeHtml(req.namaKegiatan);
        const dt = formatDate(req.tanggalKegiatan);
        if (req.waktuKegiatan) escapeHtml(req.waktuKegiatan);
        const tk = escapeHtml(req.tempatKegiatan);
    });

    console.log("SUCCESS");
} catch(e) {
    console.error("ERROR:", e);
}
