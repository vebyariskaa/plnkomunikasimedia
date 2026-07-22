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

  // Toast elements
  const toastEl = document.getElementById('liveToast');
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');

  // Track selected files (since we allow adding/removing)
  let selectedFiles = [];

  // Hide loader
  function hideLoader() {
    if (loadingOverlay) {
      loadingOverlay.classList.add('fade-out');
    }
  }
  setTimeout(hideLoader, 500);

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

  // Upload Zone Click
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
      // Avoid duplicate file names
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

  // Submit Form
  rilisForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!rilisForm.checkValidity()) {
      e.stopPropagation();
      rilisForm.classList.add('was-validated');
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
    formData.append('tanggalKegiatan', document.getElementById('tanggalKegiatan').value);
    formData.append('tempatKegiatan', document.getElementById('tempatKegiatan').value.trim());
    formData.append('siapaTerlibat', document.getElementById('siapaTerlibat').value.trim());
    formData.append('deskripsiKegiatan', document.getElementById('deskripsiKegiatan').value.trim());
    
    // Append all selected files
    selectedFiles.forEach(file => {
      formData.append('fotoDokumentasi', file);
    });

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Gagal mengirim rilis berita.');

      showToast('Berhasil!', 'Rilis berita berhasil dikirim. Menunggu persetujuan admin.');
      rilisForm.reset();
      rilisForm.classList.remove('was-validated');
      selectedFiles = [];
      renderPreviews();
    } catch (error) {
      console.error(error);
      showToast('Error', 'Terjadi kesalahan saat mengirim rilis berita.', false);
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
});
