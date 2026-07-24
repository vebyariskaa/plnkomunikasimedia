document.addEventListener('DOMContentLoaded', () => {
  // Authentication check
  const token = localStorage.getItem('adminToken');
  if (token !== 'pln-admin-session-token-2026') {
    window.location.href = 'login.html';
    return;
  }

  const loadingOverlay = document.getElementById('loading-overlay');
  const btnLogout = document.getElementById('btnLogout');
  const adminForm = document.getElementById('adminForm');
  const editRequestId = document.getElementById('editRequestId');
  const tipePermohonanSelect = document.getElementById('tipePermohonan');

  // Modal show/hide wrappers
  const wrapperDokumentasi = document.getElementById('wrapperDokumentasi');
  const wrapperRilisBerita = document.getElementById('wrapperRilisBerita');

  // Input elements
  const noUrutInput = document.getElementById('noUrut');
  const namaPemohonInput = document.getElementById('namaPemohon');
  const bidangInput = document.getElementById('bidang');
  const namaKegiatanInput = document.getElementById('namaKegiatan');
  const tanggalKegiatanInput = document.getElementById('tanggalKegiatan');
  const tanggalSelesaiInput = document.getElementById('tanggalSelesai');
  const tempatKegiatanInput = document.getElementById('tempatKegiatan');
  const permintaanInput = document.getElementById('permintaan');
  // const siapaTerlibatInput = document.getElementById('siapaTerlibat'); // removed
  const deskripsiKegiatanInput = document.getElementById('deskripsiKegiatan');
  const fileInput = document.getElementById('fotoDokumentasi');
  
  // Photo keeping elements
  const currentPhotosWrapper = document.getElementById('currentPhotosWrapper');
  const currentPhotosList = document.getElementById('currentPhotosList');
  const keepExistingPhotosInput = document.getElementById('keepExistingPhotos');

  // Admin outputs inputs
  const hasilLinkDocInput = document.getElementById('hasilLinkDoc');
  const hasilLinkBeritaInput = document.getElementById('hasilLinkBerita');
  const petugasInput = document.getElementById('petugas');
  const alasanPendingInput = document.getElementById('alasanPending');

  const adminRequestsTableBody = document.getElementById('adminRequestsTableBody');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  // Modal setup
  const requestModalEl = document.getElementById('requestModal');
  const requestModal = new bootstrap.Modal(requestModalEl);
  const requestModalLabel = document.getElementById('requestModalLabel');
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');

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

  // Toggle dynamic fields in modal
  function toggleInputs() {
    const tipe = tipePermohonanSelect.value;
    const namaTerlibatInputModal = document.getElementById('namaTerlibat');
    const jabatanTerlibatInputModal = document.getElementById('jabatanTerlibat');
    
    if (tipe === 'Dokumentasi Kegiatan') {
      wrapperDokumentasi.classList.remove('d-none');
      permintaanInput.required = true;
      
      wrapperRilisBerita.classList.add('d-none');
      if (namaTerlibatInputModal) namaTerlibatInputModal.required = false;
      if (jabatanTerlibatInputModal) jabatanTerlibatInputModal.required = false;
      deskripsiKegiatanInput.required = false;
      fileInput.required = false;
    } else {
      wrapperDokumentasi.classList.add('d-none');
      permintaanInput.required = false;
      
      wrapperRilisBerita.classList.remove('d-none');
      if (namaTerlibatInputModal) namaTerlibatInputModal.required = true;
      if (jabatanTerlibatInputModal) jabatanTerlibatInputModal.required = true;
      deskripsiKegiatanInput.required = true;
      
      // Admin has no required file upload constraints
      fileInput.required = false;
    }
  }

  tipePermohonanSelect.addEventListener('change', toggleInputs);

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

    // Add touch support for buttons
    // Logout button
    btnLogout.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btnLogout.click();
    });
    // Theme toggle button
    themeToggle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      themeToggle.click();
    });
    // Open Add Modal button
    btnOpenAddModal.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btnOpenAddModal.click();
    });

  // Logout
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    window.location.href = 'index.html';
  });

  // Load requests
  async function loadRequests(isSilent = false) {
    try {
      const response = await fetch('/api/requests');
      if (!response.ok) throw new Error('Gagal mengambil data permintaan.');
      
      requestsData = await response.json();
      renderAdminTable();
      updateNextNoUrut();
    } catch (error) {
      console.error(error);
      if (!isSilent) {
        adminRequestsTableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-5 text-danger">
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

  // Update Next No Urut field
  function updateNextNoUrut() {
    if (!editRequestId.value) {
      const nextNo = requestsData.length > 0 ? Math.max(...requestsData.map(r => r.no || 0)) + 1 : 1;
      noUrutInput.value = nextNo;
    }
  }

  // Format Date to Local String
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

  // Render Admin Tables
  function renderAdminTable() {
    const adminDokumentasiTableBody = document.getElementById('adminDokumentasiTableBody');
    const adminRilisTableBody = document.getElementById('adminRilisTableBody');
    
    adminDokumentasiTableBody.innerHTML = '';
    adminRilisTableBody.innerHTML = '';

    const dokumentasiData = requestsData.filter(req => req.tipePermohonan && !req.tipePermohonan.toLowerCase().includes('rilis berita'));
    const rilisData = requestsData.filter(req => req.tipePermohonan && req.tipePermohonan.toLowerCase().includes('rilis berita'));

    // ── Render Dokumentasi ──
    if (dokumentasiData.length === 0) {
      adminDokumentasiTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-secondary">Belum ada data permintaan dokumentasi.</td></tr>`;
    } else {
      dokumentasiData.forEach((req) => {
        const tr = document.createElement('tr');
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

        tr.innerHTML = `
          <td class="fw-bold">${req.no}</td>
          <td>
            ${typeBadge}
            <div class="fw-bold mt-1 text-truncate" style="max-width: 150px;">${escapeHtml(req.namaPemohon)}</div>
            <div class="small text-secondary text-truncate" style="max-width: 150px;">${escapeHtml(req.bidang)}</div>
          </td>
          <td>
            <div class="fw-bold text-primary text-wrap" style="max-width: 180px;">${escapeHtml(req.namaKegiatan)}</div>
            <div class="small text-secondary mb-1"><i class="bi bi-calendar-event me-1"></i>${formatDate(req.tanggalKegiatan)}${req.tanggalSelesai ? ' - ' + formatDate(req.tanggalSelesai) : ''}</div>
            ${req.waktuKegiatan ? `<div class="small text-secondary mb-1"><i class="bi bi-clock me-1"></i>${escapeHtml(req.waktuKegiatan)}</div>` : ''}
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
        bindActionButtons(tr, req.id);
        adminDokumentasiTableBody.appendChild(tr);
      });
    }

    // ── Render Rilis Berita ──
    if (rilisData.length === 0) {
      adminRilisTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-secondary">Belum ada data rilis berita.</td></tr>`;
    } else {
      rilisData.forEach((req) => {
        const tr = document.createElement('tr');
        
        const requestDetailsHtml = `
          <div class="mb-1 text-wrap" style="max-width: 200px;"><span class="text-secondary small fw-semibold">Deskripsi:</span> ${escapeHtml(req.deskripsiKegiatan)}</div>
          <div class="text-wrap small text-secondary" style="max-width: 200px; white-space: pre-wrap;"><span class="fw-semibold">Terlibat:</span><br>${req.namaTerlibatPln ? `<b>PLN:</b><br>${escapeHtml(req.namaTerlibatPln)} (${escapeHtml(req.jabatanTerlibatPln)})<br><b>Stakeholder:</b><br>${escapeHtml(req.namaTerlibatStakeholder)} (${escapeHtml(req.jabatanTerlibatStakeholder)})` : (req.namaTerlibat ? `<b>Nama:</b><br>${escapeHtml(req.namaTerlibat)}<br><b>Jabatan:</b><br>${escapeHtml(req.jabatanTerlibat)}` : escapeHtml(req.siapaTerlibat))}</div>
          ${req.penyampaianStakeholder ? `<div class="mt-2 text-wrap small" style="max-width: 200px; white-space: pre-wrap; font-style: italic; border-left: 2px solid #0ea5e9; padding-left: 6px;">"${escapeHtml(req.penyampaianStakeholder)}"</div>` : ''}
        `;
        
        let photosGridHtml = '';
        if (req.fotoPaths && req.fotoPaths.length > 0) {
          photosGridHtml = '<div class="img-grid">';
          req.fotoPaths.forEach((path) => {
            photosGridHtml += `<img src="${path}" class="img-thumbnail-preview" alt="Foto" data-src="${path}">`;
          });
          photosGridHtml += '</div>';
          photosGridHtml += `<button class="btn btn-outline-secondary btn-xs mt-2 py-1 px-2 rounded d-inline-flex align-items-center gap-1 btn-download-photos" style="font-size: 11px;"><i class="bi bi-download"></i> Unduh Foto</button>`;
        }
        if (!req.fotoPaths || req.fotoPaths.length === 0) {
          photosGridHtml = '<span class="text-secondary small">Belum ada foto</span>';
        }

        let linkBeritaHtml = req.hasilLinkBerita
          ? `<a href="${req.hasilLinkBerita}" target="_blank" class="btn btn-outline-success btn-xs px-2 py-1 fs-8 rounded d-inline-flex align-items-center gap-1"><i class="bi bi-newspaper"></i> Link Berita</a>`
          : '<span class="text-secondary small">Belum ada link</span>';

        const status = req.status || 'Disetujui';
        let statusBadge = status === 'Disetujui' ? '<span class="badge bg-success">ACC</span>' : '<span class="badge bg-warning text-dark">Pending</span>';
        if (status !== 'Disetujui' && req.alasanPending) statusBadge += `<div class="small text-danger mt-1 text-wrap" style="max-width: 100px;">Catatan: ${escapeHtml(req.alasanPending)}</div>`;
        
        const approveBtn = status === 'Pending' ? `<button class="btn btn-outline-success btn-sm rounded me-1 btn-approve" data-id="${req.id}" title="ACC"><i class="bi bi-check-lg"></i> ACC</button>` : '';

        tr.innerHTML = `
          <td class="fw-bold">${req.no}</td>
          <td>
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
          <td>${linkBeritaHtml}</td>
          <td>${statusBadge}</td>
          <td class="text-center">
            ${approveBtn}
            <button class="btn btn-outline-primary btn-sm rounded me-1 btn-edit" data-id="${req.id}" title="Edit/Tambah Link Berita"><i class="bi bi-pencil-fill"></i></button>
            <button class="btn btn-outline-danger btn-sm rounded btn-delete" data-id="${req.id}" title="Hapus"><i class="bi bi-trash-fill"></i></button>
          </td>
        `;
        
        // Zoom preview handler for thumbnail click
        tr.querySelectorAll('.img-thumbnail-preview').forEach((img) => {
          img.addEventListener('click', (e) => {
            const src = e.target.getAttribute('data-src');
            modalPreviewImage.src = src;
            
            const modalDownloadBtn = document.getElementById('modalDownloadBtn');
            if (modalDownloadBtn) {
              modalDownloadBtn.href = src;
              const ext = src.split('.').pop() || 'jpg';
              modalDownloadBtn.download = `Foto_Rilis_${req.id}.${ext}`;
            }
            
            imagePreviewModal.show();
          });
        });

        // Download photos handler
        const downloadBtn = tr.querySelector('.btn-download-photos');
        if (downloadBtn) {
          const downloadHandler = async (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Mengunduh...';
            downloadBtn.disabled = true;
            try {
              for (let i = 0; i < req.fotoPaths.length; i++) {
                const path = req.fotoPaths[i];
                const response = await fetch(path);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                const ext = path.split('.').pop() || 'jpg';
                a.download = `Foto_Rilis_${req.id}_${i + 1}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                await new Promise(r => setTimeout(r, 300));
              }
            } catch (err) {
              console.error('Error downloading photos:', err);
              showToast('Error', 'Gagal mengunduh beberapa foto.', false);
            } finally {
              downloadBtn.innerHTML = originalText;
              downloadBtn.disabled = false;
            }
          };
          downloadBtn.addEventListener('click', downloadHandler);
          downloadBtn.addEventListener('touchstart', downloadHandler);
        }
        
        bindActionButtons(tr, req.id);
        adminRilisTableBody.appendChild(tr);
      });
    }
  }

  function bindActionButtons(tr, reqId) {
    // Approve click handler
    const approveBtnEl = tr.querySelector('.btn-approve');
    if (approveBtnEl) {
      const handler = async (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        if (confirm('Apakah Anda yakin ingin menyetujui (ACC) permintaan ini?')) {
          await approveRequest(reqId);
        }
      };
      approveBtnEl.addEventListener('click', handler);
      approveBtnEl.addEventListener('touchstart', handler);
    }
    
    // Edit click handler
    const editBtnEl = tr.querySelector('.btn-edit');
    if (editBtnEl) {
      const handler = (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        openEditModal(reqId);
      };
      editBtnEl.addEventListener('click', handler);
      editBtnEl.addEventListener('touchstart', handler);
    }
    
    // Delete click handler
    const deleteBtnEl = tr.querySelector('.btn-delete');
    if (deleteBtnEl) {
      const handler = async (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        if (confirm('Apakah Anda yakin ingin menghapus permintaan ini?')) {
          await deleteRequest(reqId);
        }
      };
      deleteBtnEl.addEventListener('click', handler);
      deleteBtnEl.addEventListener('touchstart', handler);
    }
  }

  // Escape HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Open Modal for Dokumentasi Kegiatan
  if (btnOpenAddModal) {
    btnOpenAddModal.addEventListener('click', () => {
      adminForm.reset();
      adminForm.classList.remove('was-validated');
      fileInput.classList.remove('is-invalid');
      editRequestId.value = '';
      requestModalLabel.textContent = 'Tambah Permintaan Dokumentasi';
      tipePermohonanSelect.value = 'Dokumentasi Kegiatan';
      currentPhotosWrapper.classList.add('d-none');
      currentPhotosList.innerHTML = '';
      toggleInputs();
      updateNextNoUrut();
      requestModal.show();
    });
  }

  // Quick button to edit banner / scroll to Banner Section
  const btnQuickEditBanner = document.getElementById('btnQuickEditBanner');
  if (btnQuickEditBanner) {
    btnQuickEditBanner.addEventListener('click', () => {
      const bannerCard = document.querySelector('.banner-mgmt-card');
      if (bannerCard) {
        bannerCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        bannerCard.style.transition = 'outline 0.3s, box-shadow 0.3s';
        bannerCard.style.outline = '3px solid #0c4a6e';
        setTimeout(() => { bannerCard.style.outline = 'none'; }, 2000);
      }
    });
  }

  // Open Edit Modal & Bind Data
  function openEditModal(id) {
    const req = requestsData.find(r => r.id === id);
    if (!req) return;

    adminForm.classList.remove('was-validated');
    fileInput.classList.remove('is-invalid');
    requestModalLabel.textContent = 'Ubah Data Permintaan';
    editRequestId.value = req.id;
    noUrutInput.value = req.no;
    
    tipePermohonanSelect.value = req.tipePermohonan;
    namaPemohonInput.value = req.namaPemohon;
    bidangInput.value = req.bidang;
    namaKegiatanInput.value = req.namaKegiatan;
    tanggalKegiatanInput.value = req.tanggalKegiatan;
    
    const waktuKegiatanInput = document.getElementById('waktuKegiatan');
    if (waktuKegiatanInput) waktuKegiatanInput.value = req.waktuKegiatan || '';

    if (tanggalSelesaiInput) {
      tanggalSelesaiInput.value = req.tanggalSelesai || '';
    }
    tempatKegiatanInput.value = req.tempatKegiatan;
    
    permintaanInput.value = req.permintaan || '';
    const namaTerlibatPlnInput = document.getElementById('namaTerlibatPln');
    const jabatanTerlibatPlnInput = document.getElementById('jabatanTerlibatPln');
    const namaTerlibatStakeholderInput = document.getElementById('namaTerlibatStakeholder');
    const jabatanTerlibatStakeholderInput = document.getElementById('jabatanTerlibatStakeholder');
    if (namaTerlibatPlnInput) namaTerlibatPlnInput.value = req.namaTerlibatPln || req.namaTerlibat || req.siapaTerlibat || '';
    if (jabatanTerlibatPlnInput) jabatanTerlibatPlnInput.value = req.jabatanTerlibatPln || req.jabatanTerlibat || '';
    if (namaTerlibatStakeholderInput) namaTerlibatStakeholderInput.value = req.namaTerlibatStakeholder || '';
    if (jabatanTerlibatStakeholderInput) jabatanTerlibatStakeholderInput.value = req.jabatanTerlibatStakeholder || '';
    
    deskripsiKegiatanInput.value = req.deskripsiKegiatan || '';
    
    const isiRilisAdminInput = document.getElementById('isiRilisAdmin');
    if (isiRilisAdminInput) isiRilisAdminInput.value = req.isiRilisAdmin || '';

    const judulBeritaAdminInput = document.getElementById('judulBeritaAdmin');
    if (judulBeritaAdminInput) judulBeritaAdminInput.value = req.judulBeritaAdmin || '';
    
    deskripsiKegiatanInput.value = req.deskripsiKegiatan || '';
    
    const penyampaianStakeholderInput = document.getElementById('penyampaianStakeholder');
    if (penyampaianStakeholderInput) penyampaianStakeholderInput.value = req.penyampaianStakeholder || '';
    
    hasilLinkDocInput.value = req.hasilLinkDoc || '';
    hasilLinkBeritaInput.value = req.hasilLinkBerita || '';
    petugasInput.value = req.petugas || '';
    alasanPendingInput.value = req.alasanPending || '';

    // Render existing photos
    currentPhotosList.innerHTML = '';
    if (req.fotoPaths && req.fotoPaths.length > 0) {
      req.fotoPaths.forEach((path) => {
        const isVideo = path.toLowerCase().includes('.mp4') || path.toLowerCase().includes('.mov') || path.toLowerCase().includes('.webm');
        const media = document.createElement(isVideo ? 'video' : 'img');
        media.src = path;
        media.className = 'img-thumbnail-preview m-1';
        if (isVideo) {
          media.controls = true;
          media.controlsList = "nodownload";
        } else {
          media.addEventListener('click', () => {
            modalPreviewImage.src = path;
            imagePreviewModal.show();
          });
        }
        currentPhotosList.appendChild(media);
      });
      currentPhotosWrapper.classList.remove('d-none');
    } else {
      currentPhotosWrapper.classList.add('d-none');
    }

    keepExistingPhotosInput.checked = true;

    toggleInputs();
    requestModal.show();
  }

  // Approve Request API call
  async function approveRequest(id) {
    try {
      const response = await fetch(`/api/requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menyetujui data.');
      }

      showToast('Berhasil', 'Permintaan kegiatan berhasil disetujui (ACC) & dipublikasikan.');
      await loadRequests();
    } catch (error) {
      console.error(error);
      showToast('Error', error.message || 'Gagal menyetujui data di server.', false);
    }
  }

  // Delete Request API call
  async function deleteRequest(id) {
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menghapus data.');
      }

      showToast('Berhasil', 'Permintaan kegiatan berhasil dihapus.');
      await loadRequests();
    } catch (error) {
      console.error(error);
      showToast('Error', error.message || 'Gagal menghapus data dari server.', false);
    }
  }

  // Admin form submission (Add / Edit)
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isRilisBerita = (tipePermohonanSelect.value === 'Rilis Berita');
    const isEdit = !!editRequestId.value;

    // Check Max 15 Photos constraint for Rilis Berita
    if (isRilisBerita && fileInput.files.length > 15) {
      showToast('Peringatan', 'Dokumentasi Rilis Berita maksimal 15 foto.', false);
      fileInput.classList.add('is-invalid');
      const errEl = document.getElementById('fileValidationError');
      if (errEl) errEl.textContent = 'Maksimal 15 foto dokumentasi yang dapat diunggah.';
      return;
    } else if (isRilisBerita && !isEdit && fileInput.files.length > 0 && fileInput.files.length < 5) {
      showToast('Peringatan', 'Dokumentasi Rilis Berita minimal 5 foto.', false);
      fileInput.classList.add('is-invalid');
      const errEl = document.getElementById('fileValidationError');
      if (errEl) errEl.textContent = 'Minimal 5 foto dokumentasi yang dapat diunggah.';
      return;
    } else {
      fileInput.classList.remove('is-invalid');
    }

    // Auto-fill fallback fields if missing for Rilis Berita
    if (isRilisBerita) {
      if (!namaPemohonInput.value.trim()) namaPemohonInput.value = 'Humas PLN UP3 Kotamobagu';
      if (!tempatKegiatanInput.value.trim()) tempatKegiatanInput.value = 'Kotamobagu';
    }

    if (!adminForm.checkValidity()) {
      e.stopPropagation();
      adminForm.classList.add('was-validated');
      return;
    }

    const btnSubmitAdmin = document.getElementById('btnSubmitAdmin');
    const originalBtnText = btnSubmitAdmin.innerHTML;
    btnSubmitAdmin.disabled = true;
    btnSubmitAdmin.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...`;

    // Create FormData payload
    const formData = new FormData();
    formData.append('tipePermohonan', tipePermohonanSelect.value);
    formData.append('namaPemohon', namaPemohonInput.value.trim());
    formData.append('bidang', bidangInput.value.trim());
    formData.append('namaKegiatan', namaKegiatanInput.value.trim());
    formData.append('tanggalKegiatan', tanggalKegiatanInput.value);
    
    const waktuKegiatanInput = document.getElementById('waktuKegiatan');
    if (waktuKegiatanInput) formData.append('waktuKegiatan', waktuKegiatanInput.value);

    if (tanggalSelesaiInput && tanggalSelesaiInput.value) {
      formData.append('tanggalSelesai', tanggalSelesaiInput.value);
    }
    formData.append('tempatKegiatan', tempatKegiatanInput.value.trim());
    
    if (isRilisBerita) {
      const namaTerlibatPlnInput = document.getElementById('namaTerlibatPln');
      const jabatanTerlibatPlnInput = document.getElementById('jabatanTerlibatPln');
      const namaTerlibatStakeholderInput = document.getElementById('namaTerlibatStakeholder');
      const jabatanTerlibatStakeholderInput = document.getElementById('jabatanTerlibatStakeholder');
      
      formData.append('judulBeritaAdmin', document.getElementById('judulBeritaAdmin') ? document.getElementById('judulBeritaAdmin').value.trim() : '');
      
      if (namaTerlibatPlnInput) formData.append('namaTerlibatPln', namaTerlibatPlnInput.value.trim());
      if (jabatanTerlibatPlnInput) formData.append('jabatanTerlibatPln', jabatanTerlibatPlnInput.value.trim());
      if (namaTerlibatStakeholderInput) formData.append('namaTerlibatStakeholder', namaTerlibatStakeholderInput.value.trim());
      if (jabatanTerlibatStakeholderInput) formData.append('jabatanTerlibatStakeholder', jabatanTerlibatStakeholderInput.value.trim());
      
      formData.append('deskripsiKegiatan', deskripsiKegiatanInput.value.trim());
      formData.append('isiRilisAdmin', document.getElementById('isiRilisAdmin') ? document.getElementById('isiRilisAdmin').value.trim() : '');
      
      const penyampaianStakeholderInput = document.getElementById('penyampaianStakeholder');
      if (penyampaianStakeholderInput) {
        formData.append('penyampaianStakeholder', penyampaianStakeholderInput.value.trim());
      }
      
      formData.append('keepExistingPhotos', keepExistingPhotosInput.checked ? 'true' : 'false');
    } else {
      formData.append('permintaan', permintaanInput.value.trim());
    }

    formData.append('hasilLinkDoc', hasilLinkDocInput.value.trim());
    formData.append('hasilLinkBerita', hasilLinkBeritaInput.value.trim());
    formData.append('petugas', petugasInput.value.trim());
    formData.append('alasanPending', alasanPendingInput.value.trim());
    
    const isiRilisAdminInput = document.getElementById('isiRilisAdmin');
    if (isiRilisAdminInput) formData.append('isiRilisAdmin', isiRilisAdminInput.value.trim());

    // Append files
    if (fileInput.files.length > 0) {
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('fotoDokumentasi', fileInput.files[i]);
      }
    }

    const url = isEdit ? `/api/requests/${editRequestId.value}` : '/api/requests';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Gagal menyimpan data.');

      showToast('Berhasil', isEdit ? 'Data permintaan berhasil diubah.' : 'Data permintaan baru berhasil disimpan.');
      requestModal.hide();
      adminForm.reset();
      adminForm.classList.remove('was-validated');

      await loadRequests();
    } catch (error) {
      console.error(error);
      showToast('Error', 'Gagal menyimpan perubahan ke server.', false);
    } finally {
      btnSubmitAdmin.disabled = false;
      btnSubmitAdmin.innerHTML = originalBtnText;
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

  // ══════════════════════════════════════════════════════
  // BANNER MANAGEMENT
  // ══════════════════════════════════════════════════════
  const bannerModal = new bootstrap.Modal(document.getElementById('bannerModal'));
  const bannerUploadSlot = document.getElementById('bannerUploadSlot');
  const bannerModalSlotLabel = document.getElementById('bannerModalSlotLabel');
  const bannerModalCurrentImg = document.getElementById('bannerModalCurrentImg');
  const bannerDropZone = document.getElementById('bannerDropZone');
  const bannerFileInput = document.getElementById('bannerFileInput');
  const bannerUploadPreview = document.getElementById('bannerUploadPreview');
  const bannerUploadMsg = document.getElementById('bannerUploadMsg');
  const btnUploadBanner = document.getElementById('btnUploadBanner');

  let bannerSelectedFile = null;

  // Open banner modal for a given slot
  function openBannerModal(slot) {
    bannerUploadSlot.value = slot;
    bannerModalSlotLabel.textContent = slot;
    const imgEl = document.getElementById(`bannerPreview${slot}`);
    const currentSrc = (imgEl && imgEl.style.display !== 'none' && imgEl.src) ? imgEl.src : '';

    if (currentSrc) {
      bannerModalCurrentImg.src = currentSrc;
      bannerModalCurrentImg.style.display = 'block';
    } else {
      bannerModalCurrentImg.style.display = 'none';
    }

    // Reset state
    bannerSelectedFile = null;
    bannerUploadPreview.style.display = 'none';
    bannerUploadPreview.src = '';
    bannerUploadMsg.classList.add('d-none');
    bannerUploadMsg.textContent = '';
    btnUploadBanner.disabled = true;
    if (bannerFileInput) bannerFileInput.value = '';
    bannerModal.show();
  }

  // Attach open modal buttons for slots 1 to 10
  for (let s = 1; s <= 10; s++) {
    const btn = document.getElementById(`btnChangeBanner${s}`);
    if (btn) {
      btn.addEventListener('click', () => openBannerModal(s));
      btn.addEventListener('touchend', (e) => { e.preventDefault(); openBannerModal(s); });
    }
  }

  // Handle file selection (input or drag-drop)
  function handleBannerFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      bannerUploadMsg.textContent = 'File harus berupa gambar (JPG, PNG, WEBP).';
      bannerUploadMsg.className = 'mt-3 small text-danger';
      bannerUploadMsg.classList.remove('d-none');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      bannerUploadMsg.textContent = 'Ukuran file terlalu besar. Maksimal 10MB.';
      bannerUploadMsg.className = 'mt-3 small text-danger';
      bannerUploadMsg.classList.remove('d-none');
      return;
    }
    bannerSelectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      bannerUploadPreview.src = e.target.result;
      bannerUploadPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    bannerUploadMsg.textContent = `File dipilih: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    bannerUploadMsg.className = 'mt-3 small text-success';
    bannerUploadMsg.classList.remove('d-none');
    btnUploadBanner.disabled = false;
  }

  if (bannerFileInput) {
    bannerFileInput.addEventListener('change', () => {
      if (bannerFileInput.files.length > 0) handleBannerFile(bannerFileInput.files[0]);
    });
  }

  if (bannerDropZone) {
    bannerDropZone.addEventListener('click', () => bannerFileInput && bannerFileInput.click());
    bannerDropZone.addEventListener('dragover', (e) => { e.preventDefault(); bannerDropZone.classList.add('dragover'); });
    bannerDropZone.addEventListener('dragleave', () => bannerDropZone.classList.remove('dragover'));
    bannerDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      bannerDropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) handleBannerFile(e.dataTransfer.files[0]);
    });
  }

  // Upload banner to API
  if (btnUploadBanner) {
    btnUploadBanner.addEventListener('click', async () => {
      if (!bannerSelectedFile) return;
      const slot = bannerUploadSlot.value;
      const originalText = btnUploadBanner.innerHTML;
      btnUploadBanner.disabled = true;
      btnUploadBanner.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Mengupload...`;

      try {
        const formData = new FormData();
        formData.append('banner', bannerSelectedFile);

        const res = await fetch(`/api/banners/${slot}`, {
          method: 'POST',
          headers: { 
            'Authorization': 'Bearer ' + token,
            'admin-token': token 
          },
          body: formData
        });
        const result = await res.json();

        if (!res.ok) throw new Error(result.error || 'Gagal upload banner.');

        // Update preview in card
        const previewImg = document.getElementById(`bannerPreview${slot}`);
        const fallback = document.getElementById(`bannerFallback${slot}`);
        if (previewImg) {
          previewImg.src = result.url || bannerUploadPreview.src;
          previewImg.style.display = 'block';
          if (fallback) fallback.style.display = 'none';
        }

        bannerUploadMsg.textContent = `✅ Banner ${slot} berhasil diperbarui! Perubahan tampil di halaman utama.`;
        bannerUploadMsg.className = 'mt-3 small text-success fw-semibold';
        bannerUploadMsg.classList.remove('d-none');
        showToast('Berhasil', `Gambar Banner ${slot} berhasil diperbarui dan aktif di portal.`);

        setTimeout(() => bannerModal.hide(), 1800);
      } catch (err) {
        console.error(err);
        bannerUploadMsg.textContent = `❌ ${err.message}`;
        bannerUploadMsg.className = 'mt-3 small text-danger';
        bannerUploadMsg.classList.remove('d-none');
        btnUploadBanner.disabled = false;
        btnUploadBanner.innerHTML = originalText;
      }
    });
  }

  // Fetch live banner URLs and update previews
  async function loadBannerPreviews() {
    try {
      const res = await fetch('/api/banners');
      if (!res.ok) return;
      const banners = await res.json();
      banners.forEach(b => {
        if (!b.url) return;
        const img = document.getElementById(`bannerPreview${b.slot}`);
        const fallback = document.getElementById(`bannerFallback${b.slot}`);
        if (img) {
          img.src = b.url;
          img.style.display = 'block';
          img.onerror = () => {
            img.style.display = 'none';
            if (fallback) fallback.style.display = 'flex';
          };
          if (fallback) fallback.style.display = 'none';
        }
      });
    } catch (e) {
      // Silent fail — defaults show local images
    }
  }

  // Run initialization
  loadRequests();
  loadBannerPreviews();

  // Interactive Live Connection: poll every 3.5 seconds silently
  setInterval(() => {
    loadRequests(true);
  }, 3500);
});

