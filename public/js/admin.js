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
  const tempatKegiatanInput = document.getElementById('tempatKegiatan');
  const permintaanInput = document.getElementById('permintaan');
  const siapaTerlibatInput = document.getElementById('siapaTerlibat');
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
    if (tipe === 'Dokumentasi Kegiatan') {
      wrapperDokumentasi.classList.remove('d-none');
      permintaanInput.required = true;
      
      wrapperRilisBerita.classList.add('d-none');
      siapaTerlibatInput.required = false;
      deskripsiKegiatanInput.required = false;
      fileInput.required = false;
    } else {
      wrapperDokumentasi.classList.add('d-none');
      permintaanInput.required = false;
      
      wrapperRilisBerita.classList.remove('d-none');
      siapaTerlibatInput.required = true;
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
  async function loadRequests() {
    try {
      const response = await fetch('/api/requests');
      if (!response.ok) throw new Error('Gagal mengambil data permintaan.');
      
      requestsData = await response.json();
      renderAdminTable();
      updateNextNoUrut();
    } catch (error) {
      console.error(error);
      adminRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-danger">
            <i class="bi bi-x-circle-fill me-2"></i> Gagal memuat data dari server.
          </td>
        </tr>
      `;
    } finally {
      setTimeout(hideLoader, 500);
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

  // Render Admin Table
  function renderAdminTable() {
    adminRequestsTableBody.innerHTML = '';

    if (requestsData.length === 0) {
      adminRequestsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-secondary">
            Belum ada data permintaan kegiatan.
          </td>
        </tr>
      `;
      return;
    }

    requestsData.forEach((req) => {
      const tr = document.createElement('tr');

      // Tipe Badge
      const typeBadge = req.tipePermohonan === 'Rilis Berita' 
        ? '<span class="card-info-badge bg-success-subtle text-success border border-success-subtle">Rilis Berita</span>'
        : '<span class="card-info-badge bg-primary-subtle text-primary border border-primary-subtle">Dokumentasi</span>';

      // Keterangan / Detail info based on Tipe
      let requestDetailsHtml = '';
      if (req.tipePermohonan === 'Rilis Berita') {
        requestDetailsHtml = `
          <div class="mb-1 text-wrap" style="max-width: 200px;"><span class="text-secondary small fw-semibold">Deskripsi:</span> ${escapeHtml(req.deskripsiKegiatan)}</div>
          <div class="text-wrap small text-secondary" style="max-width: 200px;"><span class="fw-semibold">Terlibat:</span> ${escapeHtml(req.siapaTerlibat)}</div>
        `;
      } else {
        requestDetailsHtml = `
          <div class="text-wrap" style="max-width: 200px;"><span class="text-secondary small fw-semibold">Permintaan:</span> ${escapeHtml(req.permintaan)}</div>
        `;
      }

      // Documentation / Drive Link Column
      let photosGridHtml = '';
      if (req.tipePermohonan === 'Rilis Berita') {
        if (req.fotoPaths && req.fotoPaths.length > 0) {
          photosGridHtml = '<div class="img-grid">';
          req.fotoPaths.forEach((path) => {
            photosGridHtml += `<img src="${path}" class="img-thumbnail-preview" alt="Foto" data-src="${path}">`;
          });
          photosGridHtml += '</div>';
        }
        if (req.hasilLinkDoc) {
          photosGridHtml += `
            <div class="mt-2">
              <a href="${req.hasilLinkDoc}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary px-2 py-1 rounded d-inline-flex align-items-center gap-1 shadow-sm" style="font-size: 11px;">
                <i class="bi bi-folder2-open"></i> Link Drive
              </a>
            </div>
          `;
        }
        if (!req.fotoPaths || req.fotoPaths.length === 0) {
          if (!req.hasilLinkDoc) photosGridHtml = '<span class="text-secondary small">Belum ada foto/link</span>';
        }
      } else {
        // Dokumentasi Kegiatan: link drive only
        if (req.hasilLinkDoc) {
          photosGridHtml = `
            <a href="${req.hasilLinkDoc}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary px-2 py-1 rounded d-inline-flex align-items-center gap-1 shadow-sm" style="font-size: 11px;">
              <i class="bi bi-folder2-open"></i> Buka Drive
            </a>
          `;
        } else {
          photosGridHtml = '<span class="text-secondary small">Belum diisi admin</span>';
        }
      }

      // Outcomes & Petugas Column
      let outcomeLinksHtml = '<div class="d-flex flex-column gap-1">';
      let hasContent = false;

      if (req.tipePermohonan === 'Rilis Berita' && req.hasilLinkBerita) {
        outcomeLinksHtml += `<a href="${req.hasilLinkBerita}" target="_blank" class="btn btn-outline-success btn-xs px-2 py-1 fs-8 rounded d-inline-flex align-items-center gap-1"><i class="bi bi-newspaper"></i> Link Berita</a>`;
        hasContent = true;
      }
      
      if (req.petugas) {
        outcomeLinksHtml += `<div class="small mt-1 text-wrap" style="max-width: 140px;"><i class="bi bi-person-badge me-1 text-primary"></i>Petugas: <span class="fw-semibold text-primary">${escapeHtml(req.petugas)}</span></div>`;
        hasContent = true;
      }
      
      outcomeLinksHtml += '</div>';

      if (!hasContent) {
        outcomeLinksHtml = '<span class="text-secondary small">Belum ditugaskan</span>';
      }

      // Status Badge & Approve Button
      const status = req.status || 'Disetujui';
      let statusBadge = '';
      let approveBtn = '';

      if (req.tipePermohonan === 'Rilis Berita') {
        statusBadge = '<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>Terpublikasi</span>';
        approveBtn = ''; // Rilis Berita does NOT use ACC button
      } else {
        statusBadge = status === 'Disetujui'
          ? '<span class="badge bg-success">ACC</span>'
          : '<span class="badge bg-warning text-dark">Pending</span>';

        if (status !== 'Disetujui' && req.alasanPending) {
          statusBadge += `<div class="small text-danger mt-1 text-wrap" style="max-width: 100px;">Catatan: ${escapeHtml(req.alasanPending)}</div>`;
        }

        if (status === 'Pending') {
          approveBtn = `<button class="btn btn-outline-success btn-sm rounded me-1 btn-approve" data-id="${req.id}" title="ACC Permintaan"><i class="bi bi-check-lg"></i> ACC</button>`;
        }
      }

      tr.innerHTML = `
        <td class="fw-bold">${req.no}</td>
        <td>
          ${typeBadge}
          <div class="fw-bold mt-1 text-truncate" style="max-width: 150px;">${escapeHtml(req.namaPemohon)}</div>
          <div class="small text-secondary text-truncate" style="max-width: 150px;">${escapeHtml(req.bidang)}</div>
        </td>
        <td>
          <div class="fw-bold text-primary text-wrap" style="max-width: 180px;">${escapeHtml(req.namaKegiatan)}</div>
          <div class="small text-secondary mb-1"><i class="bi bi-calendar-event me-1"></i>${formatDate(req.tanggalKegiatan)}</div>
          <div class="small text-secondary"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(req.tempatKegiatan)}</div>
        </td>
        <td>${requestDetailsHtml}</td>
        <td>${photosGridHtml}</td>
        <td>${outcomeLinksHtml}</td>
        <td>${statusBadge}</td>
        <td class="text-center">
          ${approveBtn}
          <button class="btn btn-outline-primary btn-sm rounded me-1 btn-edit" data-id="${req.id}" title="Edit Permintaan">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm rounded btn-delete" data-id="${req.id}" title="Hapus Permintaan">
            <i class="bi bi-trash-fill"></i>
          </button>
        </td>
      `;

      // Zoom preview handler for thumbnail click
      tr.querySelectorAll('.img-thumbnail-preview').forEach((img) => {
        img.addEventListener('click', (e) => {
          modalPreviewImage.src = e.target.getAttribute('data-src');
          imagePreviewModal.show();
        });
      });

      // Approve click handler
      const approveBtnEl = tr.querySelector('.btn-approve');
      if (approveBtnEl) {
        approveBtnEl.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm('Apakah Anda yakin ingin menyetujui (ACC) permintaan ini?')) {
            await approveRequest(id);
          }
        });
        // Add touch support for approve button
        approveBtnEl.addEventListener('touchstart', (e) => {
          e.preventDefault();
          approveBtnEl.click();
        });
      }

      // Edit click handler
      const editBtnEl = tr.querySelector('.btn-edit');
      if (editBtnEl) {
        editBtnEl.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          openEditModal(id);
        });
        // Add touch support for edit button
        editBtnEl.addEventListener('touchstart', (e) => {
          e.preventDefault();
          editBtnEl.click();
        });
      }

      // Delete click handler
      const deleteBtnEl = tr.querySelector('.btn-delete');
      if (deleteBtnEl) {
        deleteBtnEl.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm('Apakah Anda yakin ingin menghapus permintaan ini?')) {
            await deleteRequest(id);
          }
        });
        // Add touch support for delete button
        deleteBtnEl.addEventListener('touchstart', (e) => {
          e.preventDefault();
          deleteBtnEl.click();
        });
      }

      adminRequestsTableBody.appendChild(tr);
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

  // Open Modal preconfigured for Rilis Berita (Exact format)
  const btnOpenAddRilisModal = document.getElementById('btnOpenAddRilisModal');
  if (btnOpenAddRilisModal) {
    btnOpenAddRilisModal.addEventListener('click', () => {
      adminForm.reset();
      adminForm.classList.remove('was-validated');
      fileInput.classList.remove('is-invalid');
      editRequestId.value = '';
      requestModalLabel.textContent = 'Buat Rilis Berita Baru';
      tipePermohonanSelect.value = 'Rilis Berita';
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
    tempatKegiatanInput.value = req.tempatKegiatan;
    
    permintaanInput.value = req.permintaan || '';
    siapaTerlibatInput.value = req.siapaTerlibat || '';
    deskripsiKegiatanInput.value = req.deskripsiKegiatan || '';
    
    hasilLinkDocInput.value = req.hasilLinkDoc || '';
    hasilLinkBeritaInput.value = req.hasilLinkBerita || '';
    petugasInput.value = req.petugas || '';
    alasanPendingInput.value = req.alasanPending || '';

    // Render existing photos
    currentPhotosList.innerHTML = '';
    if (req.fotoPaths && req.fotoPaths.length > 0) {
      req.fotoPaths.forEach((path) => {
        const img = document.createElement('img');
        img.src = path;
        img.className = 'img-thumbnail-preview m-1';
        img.addEventListener('click', () => {
          modalPreviewImage.src = path;
          imagePreviewModal.show();
        });
        currentPhotosList.appendChild(img);
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

      if (!response.ok) throw new Error('Gagal menyetujui data.');

      showToast('Berhasil', 'Permintaan kegiatan berhasil disetujui (ACC) & dipublikasikan.');
      await loadRequests();
    } catch (error) {
      console.error(error);
      showToast('Error', 'Gagal menyetujui data di server.', false);
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

      if (!response.ok) throw new Error('Gagal menghapus data.');

      showToast('Berhasil', 'Permintaan kegiatan berhasil dihapus.');
      await loadRequests();
    } catch (error) {
      console.error(error);
      showToast('Error', 'Gagal menghapus data dari server.', false);
    }
  }

  // Admin form submission (Add / Edit)
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isRilisBerita = (tipePermohonanSelect.value === 'Rilis Berita');
    const isEdit = !!editRequestId.value;

    // Admin has no validation constraints for file uploads

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
    formData.append('tempatKegiatan', tempatKegiatanInput.value.trim());
    
    if (isRilisBerita) {
      formData.append('siapaTerlibat', siapaTerlibatInput.value.trim());
      formData.append('deskripsiKegiatan', deskripsiKegiatanInput.value.trim());
      formData.append('keepExistingPhotos', keepExistingPhotosInput.checked ? 'true' : 'false');
    } else {
      formData.append('permintaan', permintaanInput.value.trim());
    }

    // Append admin outcomes & petugas & alasanPending
    formData.append('hasilLinkDoc', hasilLinkDocInput.value.trim());
    formData.append('hasilLinkBerita', hasilLinkBeritaInput.value.trim());
    formData.append('petugas', petugasInput.value.trim());
    formData.append('alasanPending', alasanPendingInput.value.trim());

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
    const currentSrc = document.getElementById(`bannerPreview${slot}`).src;
    bannerModalCurrentImg.src = currentSrc;
    bannerModalCurrentImg.onerror = () => { bannerModalCurrentImg.style.display = 'none'; };
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

  // Attach open modal buttons
  const btn1 = document.getElementById('btnChangeBanner1');
  const btn2 = document.getElementById('btnChangeBanner2');
  if (btn1) {
    btn1.addEventListener('click', () => openBannerModal(1));
    btn1.addEventListener('touchend', (e) => { e.preventDefault(); openBannerModal(1); });
  }
  if (btn2) {
    btn2.addEventListener('click', () => openBannerModal(2));
    btn2.addEventListener('touchend', (e) => { e.preventDefault(); openBannerModal(2); });
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
          headers: { 'admin-token': token },
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
});

