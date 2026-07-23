const fs = require('fs');

const requestsData = [{"id":"1784773875332","no":1,"tipePermohonan":"Rilis Berita","namaPemohon":"FEY","bidang":"Niaga dan Pemasaran","namaKegiatan":"plnn","tanggalKegiatan":"2026-07-24","tanggalSelesai":"2026-07-26","tempatKegiatan":"Kantor PLN UP3 Kotamobagu","permintaan":"","siapaTerlibat":"gm","deskripsiKegiatan":"chjbsdhc","fotoPaths":["https://eniklqmbwfcqyvyuwkjp.supabase.co/storage/v1/object/public/photos/1784773871657-556059561.jpg","https://eniklqmbwfcqyvyuwkjp.supabase.co/storage/v1/object/public/photos/1784773872289-393201168.jpg","https://eniklqmbwfcqyvyuwkjp.supabase.co/storage/v1/object/public/photos/1784773873355-757398149.png","https://eniklqmbwfcqyvyuwkjp.supabase.co/storage/v1/object/public/photos/1784773874333-457337596.png"],"hasilLinkDoc":"","hasilLinkBerita":"","status":"Pending","petugas":"","alasanPending":""},{"id":"1784773998577","no":2,"tipePermohonan":"Dokumentasi Kegiatan","namaPemohon":"FEY","bidang":"Jaringan dan Konstruksi","namaKegiatan":"Upacara 17 Agustus","tanggalKegiatan":"2026-07-24","tanggalSelesai":"2026-07-25","tempatKegiatan":"Kantor PLN UP3 Kotamobagu","permintaan":"Foto & Video","siapaTerlibat":"","deskripsiKegiatan":"","fotoPaths":[],"hasilLinkDoc":"","hasilLinkBerita":"","status":"Pending","petugas":"","alasanPending":""}];

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed month
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

const dokumentasiData = requestsData.filter(req => req.tipePermohonan !== 'Rilis Berita');
console.log('Dokumentasi length:', dokumentasiData.length);

dokumentasiData.forEach((req) => {
  try {
    const typeBadge = '<span class="card-info-badge bg-primary-subtle text-primary border border-primary-subtle">Dokumentasi</span>';
    const requestDetailsHtml = `<div class="text-wrap" style="max-width: 200px;"><span class="text-secondary small fw-semibold">Permintaan:</span> ${escapeHtml(req.permintaan)}</div>`;
    
    let photosGridHtml = req.hasilLinkDoc
      ? `<a href="${req.hasilLinkDoc}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary px-2 py-1 rounded d-inline-flex align-items-center gap-1 shadow-sm" style="font-size: 11px;"><i class="bi bi-folder2-open"></i> Buka Drive</a>`
      : '<span class="text-secondary small">Belum diisi admin</span>';
      
    let outcomeLinksHtml = '<div class="d-flex flex-column gap-1">';
    let hasContent = false;
    if (req.petugas) {
      outcomeLinksHtml += `<div class="small mt-1 text-wrap" style="max-width: 140px;"><i class="bi bi-person-badge me-1 text-primary"></i>Petugas: <span class="fw-semibold text-primary">${escapeHtml(req.petugas)}</span></div>`;
      hasContent = true;
    }
    outcomeLinksHtml += '</div>';
    if (!hasContent) outcomeLinksHtml = '<span class="text-secondary small">Belum ditugaskan</span>';

    const status = req.status || 'Disetujui';
    let statusBadge = status === 'Disetujui' ? '<span class="badge bg-success">ACC</span>' : '<span class="badge bg-warning text-dark">Pending</span>';
    if (status !== 'Disetujui' && req.alasanPending) statusBadge += `<div class="small text-danger mt-1 text-wrap" style="max-width: 100px;">Catatan: ${escapeHtml(req.alasanPending)}</div>`;
    
    const approveBtn = status === 'Pending' ? `<button class="btn btn-outline-success btn-sm rounded me-1 btn-approve" data-id="${req.id}" title="ACC"><i class="bi bi-check-lg"></i> ACC</button>` : '';

    const html = `
      <td class="fw-bold">${req.no}</td>
      <td>
        ${typeBadge}
        <div class="fw-bold mt-1 text-truncate" style="max-width: 150px;">${escapeHtml(req.namaPemohon)}</div>
        <div class="small text-secondary text-truncate" style="max-width: 150px;">${escapeHtml(req.bidang)}</div>
      </td>
      <td>
        <div class="fw-bold text-primary text-wrap" style="max-width: 180px;">${escapeHtml(req.namaKegiatan)}</div>
        <div class="small text-secondary mb-1"><i class="bi bi-calendar-event me-1"></i>${formatDate(req.tanggalKegiatan)}${req.tanggalSelesai ? ' - ' + formatDate(req.tanggalSelesai) : ''}</div>
        <div class="small text-secondary"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(req.tempatKegiatan)}</div>
      </td>
      <td>${requestDetailsHtml}</td>
      <td>${photosGridHtml}</td>
      <td>${outcomeLinksHtml}</td>
      <td>${statusBadge}</td>
      <td class="text-center">
        ${approveBtn}
        <button class="btn btn-outline-primary btn-sm rounded me-1 btn-edit" data-id="${req.id}" title="Edit"><i class="bi bi-pencil-fill"></i></button>
        <button class="btn btn-outline-danger btn-sm rounded btn-delete" data-id="${req.id}" title="Hapus"><i class="bi bi-trash-fill"></i></button>
      </td>
    `;
    console.log('Success for row', req.id);
  } catch (e) {
    console.error('FAILED for row', req.id, e);
  }
});
