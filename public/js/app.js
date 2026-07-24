document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  const cardsContainer = document.getElementById('cards-container');
  const newsCounter = document.getElementById('news-counter');
  const searchInput = document.getElementById('search-input');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  // Welcome Screen Elements
  const welcomeScreen = document.getElementById('welcome-screen');
  const mainPortalContent = document.getElementById('main-portal-content');
  const btnPortalUser = document.getElementById('btn-portal-user');
  const btnPortalAdmin = document.getElementById('btn-portal-admin');
  const welcomeOptions = document.getElementById('welcome-options');
  const welcomeLogin = document.getElementById('welcome-login');
  const landingLoginForm = document.getElementById('landingLoginForm');
  const landingUsername = document.getElementById('landingUsername');
  const landingPassword = document.getElementById('landingPassword');
  const landingTogglePassword = document.getElementById('landingTogglePassword');
  const btnLandingLogin = document.getElementById('btn-landing-login') || document.getElementById('btnLandingLogin');
  const landingErrorAlert = document.getElementById('landingErrorAlert');
  const btnBackToOptions = document.getElementById('btnBackToOptions');

  // ── Load Dynamic Banners from API (Up to 10 Banners) ─────────────────────────
  async function loadBanners() {
    try {
      const res = await fetch('/api/banners');
      if (!res.ok) return;
      const banners = await res.json();
      
      const activeBanners = banners.filter(b => b.url);
      if (activeBanners.length === 0) return;

      const indicatorsContainer = document.querySelector('#promoCarousel .carousel-indicators');
      const innerContainer = document.querySelector('#promoCarousel .carousel-inner');

      if (indicatorsContainer && innerContainer) {
        indicatorsContainer.innerHTML = '';
        innerContainer.innerHTML = '';

        activeBanners.forEach((b, index) => {
          // Indicator
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.bsTarget = '#promoCarousel';
          btn.dataset.bsSlideTo = index;
          btn.setAttribute('aria-label', `Slide ${index + 1}`);
          if (index === 0) btn.className = 'active';
          indicatorsContainer.appendChild(btn);

          // Item
          const item = document.createElement('div');
          item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
          item.dataset.bsInterval = '5000';

          const fallbackSrc = `https://picsum.photos/seed/pln${b.slot}/1200/420`;
          
          item.innerHTML = `
            <img id="heroBannerImg${b.slot}" src="${b.url}" alt="Banner ${b.slot} PLN UP3 Kotamobagu"
              loading="${index === 0 ? 'eager' : 'lazy'}"
              onerror="this.onerror=null; this.src='${fallbackSrc}'; this.style.opacity='0.6'">
            <div class="hero-caption">
              <div class="hero-badge"><i class="bi bi-lightning-charge-fill"></i> Resmi PLN UP3 Kotamobagu</div>
              <h2 class="hero-title">Komunikasi PLN UP3 KOTAMOBAGU</h2>
              <p class="hero-desc">Akses seluruh rilis berita, dokumentasi kegiatan dan layanan informasi resmi.</p>
            </div>
          `;
          innerContainer.appendChild(item);
        });
      }
    } catch (e) {
      console.error('Error loading banners:', e);
    }
  }
  loadBanners();

  // Screen routing check
  if (sessionStorage.getItem('enteredPortal') === 'true') {
    if (welcomeScreen) welcomeScreen.classList.add('d-none');
    if (mainPortalContent) mainPortalContent.classList.remove('d-none');
  } else {
    if (welcomeScreen) welcomeScreen.classList.remove('d-none');
    if (mainPortalContent) mainPortalContent.classList.add('d-none');
  }

  // Enter as User
  if (btnPortalUser) {
    btnPortalUser.addEventListener('click', () => {
      sessionStorage.setItem('enteredPortal', 'true');
      if (welcomeScreen) {
        welcomeScreen.style.opacity = '0';
        welcomeScreen.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
          welcomeScreen.classList.add('d-none');
          if (mainPortalContent) {
            mainPortalContent.classList.remove('d-none');
            mainPortalContent.style.opacity = '0';
            mainPortalContent.style.transition = 'opacity 0.4s ease';
            setTimeout(() => {
              mainPortalContent.style.opacity = '1';
            }, 50);
          }
        }, 400);
      } else {
        if (mainPortalContent) mainPortalContent.classList.remove('d-none');
      }
    });
  }

  // Exit portal back to welcome screen
  const btnKeluarPortal = document.getElementById('btn-keluar-portal');
  if (btnKeluarPortal) {
    btnKeluarPortal.addEventListener('click', () => {
      sessionStorage.removeItem('enteredPortal');
      window.location.href = 'index.html'; // Reload to show welcome screen
    });
  }

  // Choose Login Admin Option
  if (btnPortalAdmin) {
    btnPortalAdmin.addEventListener('click', () => {
      if (welcomeOptions) welcomeOptions.classList.add('d-none');
      if (welcomeLogin) welcomeLogin.classList.remove('d-none');
    });
  }

  // Back to Main Options
  if (btnBackToOptions) {
    btnBackToOptions.addEventListener('click', () => {
      if (welcomeLogin) welcomeLogin.classList.add('d-none');
      if (welcomeOptions) welcomeOptions.classList.remove('d-none');
      if (landingErrorAlert) landingErrorAlert.classList.add('d-none');
      if (landingLoginForm) landingLoginForm.reset();
    });
  }

  // Toggle landing page password visibility
  if (landingTogglePassword && landingPassword) {
    landingTogglePassword.addEventListener('click', () => {
      const type = landingPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      landingPassword.setAttribute('type', type);
      landingTogglePassword.querySelector('i').className = type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
    });
  }

  // Landing Admin Login Form Submission
  if (landingLoginForm) {
    landingLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btnLandingLogin) btnLandingLogin.disabled = true;
      if (landingErrorAlert) landingErrorAlert.classList.add('d-none');

      const username = landingUsername.value.trim();
      const password = landingPassword.value;

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          localStorage.setItem('adminToken', data.token);
          window.location.href = 'admin.html';
        } else {
          if (landingErrorAlert) {
            landingErrorAlert.textContent = data.error || 'Username atau password salah.';
            landingErrorAlert.classList.remove('d-none');
          }
        }
      } catch (err) {
        console.error(err);
        if (landingErrorAlert) {
          landingErrorAlert.textContent = 'Terjadi masalah jaringan ke server.';
          landingErrorAlert.classList.remove('d-none');
        }
      } finally {
        if (btnLandingLogin) btnLandingLogin.disabled = false;
      }
    });
  }

  // Modals
  const newsDetailModalEl = document.getElementById('newsDetailModal');
  const newsDetailModal = newsDetailModalEl ? new bootstrap.Modal(newsDetailModalEl) : null;
  const newsDetailModalBody = document.getElementById('newsDetailModalBody');

  const imagePreviewModalEl = document.getElementById('imagePreviewModal');
  const imagePreviewModal = imagePreviewModalEl ? new bootstrap.Modal(imagePreviewModalEl) : null;
  const modalPreviewImage = document.getElementById('modalPreviewImage');

  let allNews = [];
  let searchQuery = '';

  // Hide loading spinner
  function hideLoader() {
    if (loadingOverlay) {
      loadingOverlay.classList.add('fade-out');
    }
  }

  // Fetch all Rilis Berita from API
  async function fetchData() {
    try {
      const response = await fetch('/api/requests');
      if (!response.ok) {
        throw new Error(`Gagal memuat rilis berita (Status: ${response.status})`);
      }
      
      const rawData = await response.json();
      
      // Calculate Stats
      const rilisAcc = rawData.filter(item => item.tipePermohonan && item.tipePermohonan.toLowerCase().includes('rilis berita') && item.status === 'Disetujui').length;
      const dokAcc = rawData.filter(item => (!item.tipePermohonan || !item.tipePermohonan.toLowerCase().includes('rilis berita')) && item.status === 'Disetujui').length;
      const totalReq = rawData.length;

      const statRilisAcc = document.getElementById('stat-rilis-acc');
      const statDokAcc = document.getElementById('stat-dok-acc');
      const statTotalReq = document.getElementById('stat-total-req');
      
      if (statRilisAcc) statRilisAcc.textContent = rilisAcc;
      if (statDokAcc) statDokAcc.textContent = dokAcc;
      if (statTotalReq) statTotalReq.textContent = totalReq;

      // Filter only approved Rilis Berita to display on portal
      allNews = rawData.filter(item => item.tipePermohonan && item.tipePermohonan.toLowerCase().includes('rilis berita') && item.status === 'Disetujui');
      
      const reqDokumentasi = rawData.filter(item => !item.tipePermohonan || !item.tipePermohonan.toLowerCase().includes('rilis berita'));
      
      filterAndRenderCards();
      renderPublicRequests(reqDokumentasi);
    } catch (error) {
      console.error('Error fetching data:', error);
      cardsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-exclamation-triangle-fill text-danger fs-1"></i>
          <h5 class="mt-3">Gagal Memuat Rilis Berita</h5>
          <p class="text-secondary">Terjadi kesalahan koneksi server atau data bermasalah.</p>
        </div>
      `;
    } finally {
      setTimeout(hideLoader, 600);
    }
  }

  function renderPublicRequests(reqData) {
    const tableBody = document.getElementById('publicRequestsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (reqData.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-secondary">
            Belum ada permohonan dokumentasi yang diajukan.
          </td>
        </tr>
      `;
      return;
    }

    reqData.forEach((req) => {
      const tr = document.createElement('tr');
      
      // Interactive Status Badge
      const status = req.status || 'Pending';
      let statusBadge = '';
      if (status === 'Disetujui') {
        statusBadge = `<span class="badge badge-glass border border-primary-subtle text-primary px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-bold"><i class="bi bi-check-circle-fill"></i> Selesai</span>`;
      } else {
        statusBadge = `<span class="badge border border-warning-subtle text-warning px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-1.5 fw-bold" style="background: rgba(245, 158, 11, 0.1);"><span class="spinner-grow spinner-grow-sm me-0.5" style="width:0.45rem;height:0.45rem;" role="status"></span> Proses / Pending</span>`;
      }

      tr.innerHTML = `
        <td class="fw-bold">${req.no}</td>
        <td>
          <div class="fw-bold text-truncate text-secondary" style="max-width: 140px;"><i class="bi bi-person-circle me-1"></i>Pihak Internal</div>
          <div class="small text-secondary text-truncate" style="max-width: 140px;">PLN UP3 Kotamobagu</div>
        </td>
        <td>
          <div class="fw-semibold text-wrap" style="max-width: 180px; color: var(--text-primary);">${escapeHtml(req.namaKegiatan)}</div>
        </td>
        <td>
          <div class="small fw-medium"><i class="bi bi-calendar-event me-1 text-primary"></i>${formatDate(req.tanggalKegiatan)}</div>
          ${req.waktuKegiatan ? `<div class="small text-secondary mt-1"><i class="bi bi-clock me-1"></i>${escapeHtml(req.waktuKegiatan)}</div>` : ''}
        </td>
        <td>
          <div class="small text-secondary text-wrap" style="max-width: 120px;"><i class="bi bi-geo-alt me-1"></i>${escapeHtml(req.tempatKegiatan)}</div>
        </td>
        <td>${statusBadge}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Filter and render Rilis Berita cards
  function filterAndRenderCards() {
    const filtered = allNews.filter(req => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (req.namaKegiatan && req.namaKegiatan.toLowerCase().includes(searchLower)) || 
             (req.deskripsiKegiatan && req.deskripsiKegiatan.toLowerCase().includes(searchLower)) ||
             (req.siapaTerlibat && req.siapaTerlibat.toLowerCase().includes(searchLower)) ||
             (req.namaPemohon && req.namaPemohon.toLowerCase().includes(searchLower)) ||
             (req.bidang && req.bidang.toLowerCase().includes(searchLower)) ||
             (req.tempatKegiatan && req.tempatKegiatan.toLowerCase().includes(searchLower));
    });

    // Update counter
    if (newsCounter) {
      newsCounter.textContent = `${filtered.length} Rilis Berita`;
    }

    cardsContainer.innerHTML = '';

    if (filtered.length === 0) {
      cardsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-newspaper text-secondary fs-1"></i>
          <h5 class="mt-3 text-secondary">Belum ada rilis berita</h5>
          <p class="text-secondary small">Silakan ajukan rilis berita baru melalui menu Rilis Berita di atas.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(req => {
      const cardCol = document.createElement('div');
      cardCol.className = 'col-12 col-md-6 col-lg-4 col-xl-3';

      // Pick thumbnail image (first photo path or fallback)
      const thumbnail = (req.fotoPaths && req.fotoPaths.length > 0) ? req.fotoPaths[0] : '';
      const photoCount = (req.fotoPaths && req.fotoPaths.length > 0) ? req.fotoPaths.length : 0;
      
      // Description (Show Admin Text Snippet)
      const desc = req.isiRilisAdmin || 'Rilis berita resmi Komunikasi PLN UP3 Kotamobagu';

      // Clean Badge
      const statusBadgeHtml = '<span class="badge bg-primary-subtle text-primary border border-primary-subtle shadow-sm"><i class="bi bi-newspaper me-1"></i>Rilis Berita</span>';

      // Photo count badge
      const photoCountHtml = photoCount > 0
        ? `<span class="card-badge bg-dark"><i class="bi bi-images me-1"></i>${photoCount} Foto</span>`
        : '';

      // Card content
      cardCol.innerHTML = `
        <div class="card-link-item h-100 cursor-pointer" data-id="${req.id}">
          <div class="card-img-wrapper">
            ${thumbnail ? `<img src="${thumbnail}" alt="${escapeHtml(req.namaKegiatan)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
            <div class="fallback-thumb h-100 w-100 flex-column text-white justify-content-center" style="${thumbnail ? 'display:none;' : 'display:flex;'}">
              <i class="bi bi-newspaper fallback-thumb-icon"></i>
            </div>
            <div class="card-icon-badge">
              <i class="bi bi-newspaper"></i>
            </div>
            ${photoCountHtml}
          </div>
          <div class="card-body-custom d-flex flex-column">
            <div class="d-flex justify-content-end mb-2">
              ${statusBadgeHtml}
            </div>
            
            <h4 class="fw-bolder text-dark mb-2 text-truncate-2" style="font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.5px; line-height: 1.35;">
              ${escapeHtml(req.judulBeritaAdmin || 'Judul Rilis Berita (Draft Admin)')}
            </h4>
            
            <p class="card-text-custom text-truncate-3 text-secondary mb-3" style="font-size: 0.95rem; line-height: 1.6;">
              ${escapeHtml(desc)}
            </p>
            
            <div class="mt-auto pt-3 border-top border-light d-flex flex-column gap-2">
              <div class="small fw-semibold text-secondary d-flex align-items-center"><i class="bi bi-calendar3 me-2 text-primary fs-6"></i>${formatDate(req.tanggalKegiatan)}</div>
              <div class="small fw-semibold text-secondary d-flex align-items-center"><i class="bi bi-geo-alt me-2 text-primary fs-6"></i><span class="text-truncate">${escapeHtml(req.tempatKegiatan)}</span></div>
            </div>
            
            <button class="btn btn-primary btn-sm w-100 mt-3 rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm fw-bold" style="padding: 10px 0;">
              <i class="bi bi-book"></i> Baca Rilis Selengkapnya
            </button>
          </div>
        </div>
      `;

      // Click card to open full-screen detail view
      cardCol.querySelector('.card-link-item').addEventListener('click', () => {
        openNewsDetailModal(req);
      });

      cardsContainer.appendChild(cardCol);
    });
  }

  // Open Full-Screen Detail View for Users
  function openNewsDetailModal(req) {
    if (!newsDetailModalBody) return;

    const statusBadgeHtml = '<span class="badge bg-success fs-6 px-3 py-2 rounded-pill"><i class="bi bi-newspaper me-1"></i>Rilis Berita Resmi</span>';
    const photos = req.fotoPaths && req.fotoPaths.length > 0 ? req.fotoPaths : [];

    // ── Photo Carousel ───────────────────────────────────────────────────────
    let photosGalleryHtml = '';
    if (photos.length > 0) {
      const carouselId = 'docsCarousel';
      const slides = photos.map((p, i) => {
        const isVideo = p.toLowerCase().includes('.mp4') || p.toLowerCase().includes('.mov') || p.toLowerCase().includes('.webm');
        return `
        <div class="carousel-item${i === 0 ? ' active' : ''}">
          <div class="docs-carousel-slide">
            ${isVideo 
              ? `<video src="${p}" class="docs-carousel-img" controls controlsList="nodownload"></video>`
              : `<img src="${p}" class="docs-carousel-img" alt="Media ${i+1}" data-src="${p}">
                 <div class="docs-carousel-zoom" title="Perbesar"><i class="bi bi-zoom-in"></i></div>`
            }
            <div class="docs-carousel-counter">${i+1} / ${photos.length}</div>
          </div>
        </div>
        `;
      }).join('');

      const thumbs = photos.map((p, i) => {
        const isVideo = p.toLowerCase().includes('.mp4') || p.toLowerCase().includes('.mov') || p.toLowerCase().includes('.webm');
        return `
        <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${i}"
          class="docs-thumb${i === 0 ? ' active' : ''}" aria-label="Media ${i+1}">
          ${isVideo 
            ? `<div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;color:#fff"><i class="bi bi-play-circle fs-3"></i></div>`
            : `<img src="${p}" alt="Thumb ${i+1}">`
          }
        </button>
        `;
      }).join('');

      photosGalleryHtml = `
        <div id="${carouselId}" class="carousel slide docs-carousel" data-bs-ride="carousel" data-bs-interval="3500">
          <div class="carousel-inner rounded-4 overflow-hidden shadow">${slides}</div>
          <button class="carousel-control-prev docs-ctrl" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Sebelumnya</span>
          </button>
          <button class="carousel-control-next docs-ctrl" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Selanjutnya</span>
          </button>
        </div>
        <div class="docs-thumbs-strip" id="${carouselId}Thumbs">${thumbs}</div>
      `;
    } else {
      photosGalleryHtml = '<div class="alert alert-secondary py-3 text-center rounded-3"><i class="bi bi-info-circle me-1"></i> Belum ada foto dokumentasi terunggah.</div>';
    }

    // Links HTML
    let linksHtml = '';
    if (req.hasilLinkBerita) {
      linksHtml += `<a href="${req.hasilLinkBerita}" target="_blank" rel="noopener noreferrer" class="btn btn-success btn-lg d-inline-flex align-items-center gap-2 shadow-sm rounded-3 me-2 mb-2"><i class="bi bi-newspaper"></i> Baca Berita Wartawan <i class="bi bi-box-arrow-up-right"></i></a>`;
    }
    if (req.hasilLinkDoc) {
      linksHtml += `<a href="${req.hasilLinkDoc}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg d-inline-flex align-items-center gap-2 shadow-sm rounded-3 mb-2"><i class="bi bi-folder2-open"></i> Buka Drive Dokumentasi <i class="bi bi-box-arrow-up-right"></i></a>`;
    }
    if (!linksHtml) {
      linksHtml = '<p class="text-secondary mb-0">Belum ada tautan rilis berita/drive yang dilampirkan.</p>';
    }

    const mainCover = photos.length > 0 ? photos[0] : null;

    newsDetailModalBody.innerHTML = `
      <article class="news-fullscreen-article">
        ${mainCover ? `
        <div class="position-relative w-100 bg-dark text-white overflow-hidden news-hero-banner">
          <img src="${mainCover}" class="w-100 h-100 object-fit-cover" alt="${escapeHtml(req.judulBeritaAdmin || 'Rilis Berita')}" style="filter: brightness(0.55);">
          <div class="position-absolute bottom-0 start-0 end-0 p-4 p-md-5" style="background:linear-gradient(to top,rgba(0,0,0,.75),transparent);">
            <div class="container" style="max-width:960px">
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span class="badge bg-warning text-dark">Rilis Berita</span>
                ${statusBadgeHtml}
              </div>
              <h1 class="fw-bold text-white fs-2 mb-0">${escapeHtml(req.judulBeritaAdmin || 'Judul Rilis Berita (Draft Admin)')}</h1>
            </div>
          </div>
        </div>` : `
        <div class="bg-primary text-white py-5 px-4">
          <div class="container" style="max-width:960px">
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge bg-warning text-dark">Rilis Berita</span>
              ${statusBadgeHtml}
            </div>
            <h1 class="fw-bold text-white display-5 mb-0">${escapeHtml(req.judulBeritaAdmin || 'Judul Rilis Berita (Draft Admin)')}</h1>
          </div>
        </div>`}

        <div class="container py-4 py-md-5" style="max-width:960px">
          <div class="row g-3 mb-5 p-3 p-md-4 rounded-4 bg-light-subtle border shadow-sm align-items-center">
            <div class="col-sm-4 d-flex align-items-center gap-3">
              <div class="bg-primary-subtle text-primary rounded-circle p-3" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center"><i class="bi bi-calendar3 fs-5"></i></div>
              <div><div class="small text-secondary text-uppercase fw-semibold">Tanggal</div><div class="fw-bold">${formatDate(req.tanggalKegiatan)}</div></div>
            </div>
            <div class="col-sm-4 d-flex align-items-center gap-3">
              <div class="bg-primary-subtle text-primary rounded-circle p-3" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center"><i class="bi bi-geo-alt fs-5"></i></div>
              <div><div class="small text-secondary text-uppercase fw-semibold">Tempat</div><div class="fw-bold">${escapeHtml(req.tempatKegiatan)}</div></div>
            </div>
            <div class="col-sm-4 d-flex align-items-center gap-3">
              <div class="bg-primary-subtle text-primary rounded-circle p-3" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center"><i class="bi bi-building fs-5"></i></div>
              <div><div class="small text-secondary text-uppercase fw-semibold">Instansi</div><div class="fw-bold">PLN UP3 Kotamobagu</div></div>
            </div>
          </div>

          ${req.siapaTerlibat ? `<div class="p-3 mb-4 rounded-3 bg-warning-subtle border border-warning-subtle d-flex align-items-center gap-3"><i class="bi bi-people-fill text-warning fs-3"></i><div><div class="small text-uppercase fw-bold">Pihak yang Terlibat:</div><div class="fw-semibold">${escapeHtml(req.siapaTerlibat)}</div></div></div>` : ''}
          ${req.petugas ? `<div class="p-3 mb-4 rounded-3 bg-primary-subtle border border-primary-subtle d-flex align-items-center gap-3"><i class="bi bi-person-badge text-primary fs-3"></i><div><div class="small text-uppercase fw-bold text-primary">Petugas Pelaksana:</div><div class="fw-bold text-primary">${escapeHtml(req.petugas)}</div></div></div>` : ''}

          ${req.isiRilisAdmin ? `
          <div class="news-body-text mb-4 p-4 rounded-4 bg-white border shadow-sm">
            <h4 class="fw-bold border-bottom pb-2 mb-3 text-dark"><i class="bi bi-megaphone-fill text-success me-2"></i>Rilis Berita</h4>
            <p class="fs-5 lh-lg text-dark fw-medium" style="white-space:pre-line">${escapeHtml(req.isiRilisAdmin)}</p>
          </div>
          ` : ''}



          <div class="mb-5">
            <h4 class="fw-bold border-bottom pb-2 mb-4">
              <i class="bi bi-images text-primary me-2"></i>Lampiran Dokumentasi Visual
              <span class="badge bg-primary ms-2">${photos.length} Foto</span>
            </h4>
            ${photosGalleryHtml}
          </div>

          <div class="p-4 rounded-4 bg-light border shadow-sm mb-4">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-link-45deg me-2"></i>Tautan Terkait</h5>
            <div>${linksHtml}</div>
          </div>
        </div>
      </article>

      <!-- Inline Fullscreen Lightbox -->
      <div id="docsLightbox" class="docs-lightbox" role="dialog" aria-modal="true" tabindex="-1">
        <button class="docs-lightbox-close" id="docsLightboxClose" aria-label="Tutup">
          <i class="bi bi-x-lg"></i>
        </button>
        <button class="docs-lightbox-nav docs-lightbox-prev" id="docsLightboxPrev" aria-label="Sebelumnya">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="docs-lightbox-nav docs-lightbox-next" id="docsLightboxNext" aria-label="Selanjutnya">
          <i class="bi bi-chevron-right"></i>
        </button>
        <div class="docs-lightbox-img-wrap">
          <img id="docsLightboxImg" src="" alt="Foto Fullscreen">
        </div>
        <div class="docs-lightbox-counter" id="docsLightboxCounter">1 / 1</div>
      </div>
    `;

    // ── Init carousel & lightbox after DOM insert ─────────────────────────
    if (photos.length > 0) {
      // Bootstrap carousel
      const carouselEl = newsDetailModalBody.querySelector('#docsCarousel');
      if (carouselEl && typeof bootstrap !== 'undefined') {
        const bsCarousel = new bootstrap.Carousel(carouselEl, { interval: 3500, touch: true, ride: 'carousel' });

        // Sync thumbnails
        carouselEl.addEventListener('slid.bs.carousel', (e) => {
          const thumbsStrip = document.getElementById('docsCarouselThumbs');
          if (thumbsStrip) {
            thumbsStrip.querySelectorAll('.docs-thumb').forEach((t, i) => {
              t.classList.toggle('active', i === e.to);
            });
          }
        });

        // Thumbnail click
        const thumbsStrip = document.getElementById('docsCarouselThumbs');
        if (thumbsStrip) {
          thumbsStrip.querySelectorAll('.docs-thumb').forEach((t, i) => {
            t.addEventListener('click', () => bsCarousel.to(i));
          });
        }
      }

      // Lightbox
      let lbIndex = 0;
      const lightbox = newsDetailModalBody.querySelector('#docsLightbox');
      const lbImg = newsDetailModalBody.querySelector('#docsLightboxImg');
      const lbCounter = newsDetailModalBody.querySelector('#docsLightboxCounter');
      const lbClose = newsDetailModalBody.querySelector('#docsLightboxClose');
      const lbPrev = newsDetailModalBody.querySelector('#docsLightboxPrev');
      const lbNext = newsDetailModalBody.querySelector('#docsLightboxNext');

      function openLightbox(idx) {
        lbIndex = ((idx % photos.length) + photos.length) % photos.length;
        lbImg.src = photos[lbIndex];
        lbCounter.textContent = `${lbIndex + 1} / ${photos.length}`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
      function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }

      newsDetailModalBody.querySelectorAll('.docs-carousel-slide').forEach((slide, idx) => {
        slide.addEventListener('click', () => openLightbox(idx));
      });

      if (lbClose) lbClose.addEventListener('click', closeLightbox);
      if (lbPrev) lbPrev.addEventListener('click', () => openLightbox(lbIndex - 1));
      if (lbNext) lbNext.addEventListener('click', () => openLightbox(lbIndex + 1));
      if (lightbox) {
        lightbox.addEventListener('click', (e) => {
          if (e.target === lightbox) closeLightbox();
        });
      }

      // Keyboard navigation
      function handleLbKey(e) {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'ArrowRight') openLightbox(lbIndex + 1);
        if (e.key === 'ArrowLeft') openLightbox(lbIndex - 1);
        if (e.key === 'Escape') closeLightbox();
      }
      document.addEventListener('keydown', handleLbKey);

      // Clean up when modal closes
      if (newsDetailModalEl) {
        newsDetailModalEl.addEventListener('hidden.bs.modal', () => {
          closeLightbox();
          document.removeEventListener('keydown', handleLbKey);
        }, { once: true });
      }
    }

    if (newsDetailModal) {
      newsDetailModal.show();
    }
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

  // Search Functionality
  function handleSearch(e) {
    searchQuery = e.target.value;
    filterAndRenderCards();
  }

  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  // Dark / Light Mode Sync
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }

  function updateThemeIcon(theme) {
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }
  }

  // Scroll to Top
  if (scrollToTopBtn) {
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
  }

  // Run initialization
  fetchData();

  // Run auto-refresh every 15 seconds to make it real-time
  setInterval(() => {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
      fetchData();
    }
  }, 15000);
});
