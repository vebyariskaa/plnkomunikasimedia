document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  const rilisForm = document.getElementById('rilisForm');
  const fileInput = document.getElementById('fotoDokumentasi');
  const uploadZone = document.getElementById('uploadZone');
  const previewGrid = document.getElementById('previewGrid');
  const fileCountInfo = document.getElementById('fileCountInfo');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  // Status table elements
  const rilisTableBody = document.getElementById('rilisTableBody');
  const rilisCounter = document.getElementById('rilisCounter');

  // Toast elements
  const toastEl = document.getElementById('liveToast');
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');

  // Track selected files (since we allow adding/removing)
  let selectedFiles = [];
  let lastStatusMap = {};
  let rilisData = [];

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

  // ── Load Rilis Berita Data (with live polling) ──
  async function loadRilisData(isSilent = false) {
    try {
      const response = await fetch('/api/requests');
      if (!response.ok) throw new Error('Gagal mengambil data.');

      const allData = await response.json();
      const filtered = allData.filter(r => r.tipePermohonan === 'Rilis Berita');

      // Check for status changes → show toast
      if (isSilent && Object.keys(lastStatusMap).length > 0) {
        filtered.forEach(req => {
          const oldStatus = lastStatusMap[req.id];
          if (oldStatus && oldStatus !== req.status && req.status === 'Disetujui') {
            showToast('✅ Status Berubah!', `Rilis Berita "${req.namaKegiatan}" telah DISETUJUI (ACC) oleh Admin!`);
          }
        });
      }

      // Update status map
      lastStatusMap = {};
      filtered.forEach(req => { lastStatusMap[req.id] = req.status; });

      rilisData = filtered;
      renderRilisTable();
    } catch (error) {
      console.error(error);
      if (!isSilent) {
        rilisTableBody.innerHTML = `
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

  // ── Render Rilis Table ──
  function renderRilisTable() {
    rilisTableBody.innerHTML = '';
    rilisCounter.textContent = `${rilisData.length} Data`;

    if (rilisData.length === 0) {
      rilisTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-secondary">
            <i class="bi bi-inbox me-2"></i> Belum ada data permintaan rilis berita.
          </td>
        </tr>
      `;
      return;
    }

    rilisData.forEach((req) => {
      const tr = document.createElement('tr');

      // Link Berita column
      let linkBeritaHtml = '';
      if (req.hasilLinkBerita) {
        linkBeritaHtml = `
          <a href="${escapeHtml(req.hasilLinkBerita)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-success px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 shadow-sm fw-semibold" style="font-size: 11px;">
            <i class="bi bi-link-45deg"></i> Buka Link
          </a>
        `;
      } else {
        linkBeritaHtml = '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle small px-2 py-1">Belum Ada</span>';
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
          <div class="fw-semibold text-truncate" style="max-width: 120px;">${escapeHtml(req.bidang)}</div>
        </td>
        <td>
          <div class="fw-bold text-primary text-wrap" style="max-width: 180px;">${escapeHtml(req.namaKegiatan)}</div>
          <div class="small text-secondary"><i class="bi bi-calendar-event me-1"></i>${formatDate(req.tanggalKegiatan)}${req.tanggalSelesai ? ' - ' + formatDate(req.tanggalSelesai) : ''}</div>
        </td>
        <td>
          <div class="text-wrap" style="max-width: 160px;">${escapeHtml(req.siapaTerlibat)}</div>
        </td>
        <td>
          <div class="text-wrap small" style="max-width: 200px;">${escapeHtml(req.deskripsiKegiatan ? (req.deskripsiKegiatan.length > 80 ? req.deskripsiKegiatan.substring(0, 80) + '...' : req.deskripsiKegiatan) : '-')}</div>
        </td>
        <td>${linkBeritaHtml}</td>
        <td>${statusBadge}</td>
      `;

      rilisTableBody.appendChild(tr);
    });
  }

  // ── Upload Zone Click ──
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag & Drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(files);
  });

  // File input change
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    addFiles(files);
    // Reset file input so user can select same files again if needed
    fileInput.value = '';
  });

  // Add files to the selected list
  function addFiles(newFiles) {
    newFiles.forEach(file => {
      const alreadyExists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (!alreadyExists) {
        selectedFiles.push(file);
      }
    });
    renderPreviews();
  }

  // Remove file from selected list
  function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderPreviews();
  }

  // Render preview thumbnails
  function renderPreviews() {
    previewGrid.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}">
          <button type="button" class="remove-btn" title="Hapus foto ini">
            <i class="bi bi-x"></i>
          </button>
        `;
        div.querySelector('.remove-btn').addEventListener('click', () => removeFile(index));
        previewGrid.appendChild(div);
      };
      reader.readAsDataURL(file);
    });

    // Update count info
    if (selectedFiles.length > 0) {
      fileCountInfo.textContent = `${selectedFiles.length} foto dipilih`;
      fileCountInfo.style.display = 'block';
    } else {
      fileCountInfo.textContent = '';
      fileCountInfo.style.display = 'none';
    }
  }

  // ── Submit Form ──
  rilisForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!rilisForm.checkValidity()) {
      e.stopPropagation();
      rilisForm.classList.add('was-validated');
      showToast('Peringatan', 'Mohon lengkapi semua kolom yang ditandai bintang merah (*).', false);
      
      // Scroll to the first invalid element
      const firstInvalid = rilisForm.querySelector(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const btnSubmit = document.getElementById('btnSubmit');
    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...`;

    // Create FormData payload
    const formData = new FormData();
    formData.append('tipePermohonan', 'Rilis Berita');
    formData.append('namaPemohon', document.getElementById('namaPemohon').value.trim());
    formData.append('bidang', document.getElementById('bidang').value.trim());
    formData.append('namaKegiatan', document.getElementById('namaKegiatan').value.trim());
    formData.append('tempatKegiatan', document.getElementById('tempatKegiatan').value.trim());
    formData.append('tanggalKegiatan', document.getElementById('tanggalKegiatan').value);
    if (document.getElementById('tanggalSelesai') && document.getElementById('tanggalSelesai').value) {
      formData.append('tanggalSelesai', document.getElementById('tanggalSelesai').value);
    }
    formData.append('siapaTerlibat', document.getElementById('siapaTerlibat').value.trim());
    formData.append('deskripsiKegiatan', document.getElementById('deskripsiKegiatan').value.trim());
    
    // Validate Photos
    if (selectedFiles.length < 4) {
      showToast('Peringatan', 'Harap unggah minimal 4 foto dokumentasi.', false);
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
      return;
    }

    // Process and compress all selected files concurrently
    const compressionPromises = selectedFiles.map(async (file) => {
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImage(file, 1200, 1200, 0.7);
          return { blob: compressed.blob, name: compressed.name };
        } catch (err) {
          console.error("Compression failed for", file.name, err);
          return { blob: file, name: file.name }; // fallback
        }
      } else {
        return { blob: file, name: file.name };
      }
    });

    const processedFiles = await Promise.all(compressionPromises);
    
    for (const processed of processedFiles) {
      formData.append('fotoDokumentasi', processed.blob, processed.name);
    }

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (localStorage.getItem('adminToken') || '')
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal mengirim rilis berita.');
      }

      showToast('Berhasil!', 'Rilis berita berhasil diterbitkan.');
      rilisForm.reset();
      rilisForm.classList.remove('was-validated');
      selectedFiles = [];
      renderPreviews();
      
      // Reload table immediately
      await loadRilisData();
    } catch (error) {
      console.error(error);
      showToast('Error', error.message || 'Terjadi kesalahan saat mengirim rilis berita. Pastikan koneksi stabil dan ukuran foto tidak terlalu besar.', false);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
    }
  });

  // Client-side image compression utility (100% Mobile Compatible via toDataURL)
  function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          try {
            // toDataURL is universally supported on all mobile devices
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Convert base64 to Blob
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            
            while(n--){
              u8arr[n] = bstr.charCodeAt(n);
            }
            
            const blob = new Blob([u8arr], {type: mime});
            resolve({ blob: blob, name: file.name });
          } catch (e) {
            reject(new Error('Canvas toDataURL failed: ' + e.message));
          }
        };
        img.onerror = function() {
          reject(new Error('Failed to load image'));
        };
      };
      reader.onerror = function() {
        reject(new Error('Failed to read file'));
      };
    });
  }

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

  // ── Run initialization ──
  loadRilisData();

  // Interactive Live Connection: poll every 3.5 seconds silently
  setInterval(() => {
    loadRilisData(true);
  }, 3500);
});
