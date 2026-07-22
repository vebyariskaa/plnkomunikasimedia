document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  const requestForm = document.getElementById('requestForm');
  
  // Input fields
  const noUrutInput = document.getElementById('noUrut');
  const namaPemohonInput = document.getElementById('namaPemohon');
  const bidangInput = document.getElementById('bidang');
  const namaKegiatanInput = document.getElementById('namaKegiatan');
  const tanggalKegiatanInput = document.getElementById('tanggalKegiatan');
  const tempatKegiatanInput = document.getElementById('tempatKegiatan');
  const permintaanInput = document.getElementById('permintaan');
  
  const requestsTableBody = document.getElementById('requestsTableBody');
  const requestCounter = document.getElementById('requestCounter');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  // Preview Image Modal Elements
  const imagePreviewModal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
  const modalPreviewImage = document.getElementById('modalPreviewImage');

  // Toast elements
  const toastEl = document.getElementById('liveToast');
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');

  let requestsData = [];

  // Hide loader
  function hideLoader() {
    if (loadingOverlay) {
      loadingOverlay.classList.add('fade-out');
    }
  }

  // Toast helper
  function showToast(title, message, isSuccess = true) {
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    if (isSuccess) {
      toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
    } else {
      toastIcon.className = 'bi bi-exclamation-triangle-fill text-danger me-2';
    }
    toast.show();
  }

  let lastStatusMap = {};

  // Load Requests (only Dokumentasi Kegiatan type)
  async function loadRequests(isSilent = false) {
    try {
      const response = await fetch('/api/requests');
      if (!response.ok) throw new Error('Gagal mengambil data permintaan.');
      
      const allData = await response.json();
      const newFiltered = allData.filter(r => r.tipePermohonan === 'Dokumentasi Kegiatan');

      // Check if any status changed to notify user with Toast
      if (isSilent && Object.keys(lastStatusMap).length > 0) {
        newFiltered.forEach(req => {
          const oldStatus = lastStatusMap[req.id];
          if (oldStatus && oldStatus !== req.status && req.status === 'Disetujui') {
            showToast('✅ Status Berubah!', `Permintaan #${req.no} ("${req.namaKegiatan}") telah DISETUJUI (ACC) oleh Admin!`);
          }
        });
      }

      // Update status map
      lastStatusMap = {};
      newFiltered.forEach(req => { lastStatusMap[req.id] = req.status; });

      requestsData = newFiltered;
      renderRequestsTable();
      updateNextNoUrut(allData);
    } catch (error) {
      console.error(error);
      if (!isSilent) {
        requestsTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4 text-danger">
              <i class="bi bi-x-circle-fill me-2"></i> Gagal memuat data dari server.
            </td>
          </tr>
        `;
      }
    } finally {
      if (!isSilent) {
        setTimeout(hideLoader, 500);
      }
    }
  }

  // Update Next No Urut field (based on ALL requests, not just filtered)
  function updateNextNoUrut(allData) {
    const data = allData || requestsData;
    const nextNo = data.length > 0 ? Math.max(...data.map(r => r.no || 0)) + 1 : 1;
    noUrutInput.value = nextNo;
  }

  // Format Date to Local String
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

  // Render requests table with interactive badges
  function renderRequestsTable() {
    requestsTableBody.innerHTML = '';
    requestCounter.textContent = `${requestsData.length} Data`;

    if (requestsData.length === 0) {
      requestsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-secondary">
            Belum ada data permintaan dokumentasi.
          </td>
        </tr>
      `;
      return;
    }

    requestsData.forEach((req) => {
      const tr = document.createElement('tr');

      // Link Drive column
      let linkDriveHtml = '';
      if (req.hasilLinkDoc) {
        linkDriveHtml = `
          <a href="${req.hasilLinkDoc}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-success px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 shadow-sm fw-semibold" style="font-size: 11px;">
            <i class="bi bi-folder2-open"></i> Buka Drive Hasil
          </a>
        `;
      } else {
        linkDriveHtml = '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle small px-2 py-1">Belum Ada Tautan</span>';
      }

      // Petugas column
      let petugasHtml = '';
      if (req.petugas) {
        petugasHtml = `<div class="text-wrap" style="max-width: 140px;"><i class="bi bi-person-badge-fill me-1 text-primary"></i><span class="fw-semibold">${escapeHtml(req.petugas)}</span></div>`;
      } else {
        petugasHtml = '<span class="text-secondary small italic">Menunggu Petugas</span>';
      }

      // Interactive Status Badge
      const status = req.status || 'Pending';
      let statusBadge = '';
      if (status === 'Disetujui') {
        statusBadge = `<span class="badge status-badge-acc px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-bold"><i class="bi bi-check-circle-fill"></i> ✅ Disetujui (ACC)</span>`;
      } else {
        statusBadge = `<span class="badge status-badge-pending px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-bold"><span class="spinner-grow spinner-grow-sm text-warning me-0.5" style="width:0.45rem;height:0.45rem;" role="status"></span> ⏳ Menunggu ACC Admin</span>`;
      }

      if (status !== 'Disetujui' && req.alasanPending) {
        statusBadge += `<div class="small text-danger mt-1 text-wrap fw-semibold" style="max-width: 130px;"><i class="bi bi-info-circle me-1"></i>Catatan: ${escapeHtml(req.alasanPending)}</div>`;
      }

      tr.innerHTML = `
        <td class="fw-bold">${req.no}</td>
        <td>
          <div class="fw-bold text-truncate" style="max-width: 150px;">${escapeHtml(req.namaPemohon)}</div>
          <div class="small text-secondary text-truncate" style="max-width: 150px;">${escapeHtml(req.bidang)}</div>
        </td>
        <td>
          <div class="fw-bold text-primary text-wrap" style="max-width: 180px;">${escapeHtml(req.namaKegiatan)}</div>
          <div class="small text-secondary mb-1"><i class="bi bi-calendar-event me-1"></i>${formatDate(req.tanggalKegiatan)}${req.tanggalSelesai ? ' - ' + formatDate(req.tanggalSelesai) : ''}</div>
          <div class="small text-secondary"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(req.tempatKegiatan)}</div>
        </td>
        <td>
          <div class="text-wrap" style="max-width: 230px;">${escapeHtml(req.permintaan)}</div>
        </td>
        <td>${linkDriveHtml}</td>
        <td>${petugasHtml}</td>
        <td>${statusBadge}</td>
      `;

      requestsTableBody.appendChild(tr);
    });
  }

  // Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Submit Request Form
  const btnSubmitEl = document.getElementById('btnSubmit');
  if (btnSubmitEl) {
    btnSubmitEl.addEventListener('touchstart', (e) => {
      // Allow touch on mobile submit button
    });
  }

  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!requestForm.checkValidity()) {
      e.stopPropagation();
      requestForm.classList.add('was-validated');
      return;
    }

    const btnSubmit = document.getElementById('btnSubmit');
    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...`;

    // Create JSON payload (no file uploads for Dokumentasi requests)
    const payload = {
      tipePermohonan: 'Dokumentasi Kegiatan',
      namaPemohon: (document.getElementById('namaPemohon') ? document.getElementById('namaPemohon').value : '').trim(),
      bidang: (document.getElementById('bidang') ? document.getElementById('bidang').value : '').trim(),
      namaKegiatan: (document.getElementById('namaKegiatan') ? document.getElementById('namaKegiatan').value : '').trim(),
      tanggalKegiatan: document.getElementById('tanggalKegiatan') ? document.getElementById('tanggalKegiatan').value : '',
      tanggalSelesai: document.getElementById('tanggalSelesai') ? document.getElementById('tanggalSelesai').value : '',
      tempatKegiatan: (document.getElementById('tempatKegiatan') ? document.getElementById('tempatKegiatan').value : '').trim(),
      permintaan: (document.getElementById('permintaan') ? document.getElementById('permintaan').value : '').trim()
    };

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal mengirim data permintaan.');
      }

      showToast('Berhasil', 'Permintaan dokumentasi kegiatan berhasil disimpan.');
      requestForm.reset();
      requestForm.classList.remove('was-validated');
      
      await loadRequests();
    } catch (error) {
      console.error(error);
      showToast('Error', error.message || 'Terjadi kesalahan saat menyimpan data.', false);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
    }
  });

  // Dark / Light Mode Sync
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  }

  // Scroll to Top
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollToTopBtn.classList.add('show');
    } else {
      scrollToTopBtn.classList.remove('show');
    }
  });

  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // Run initialization
  loadRequests();

  // Interactive Live Connection: poll every 3.5 seconds silently
  setInterval(() => {
    loadRequests(true);
  }, 3500);
});

