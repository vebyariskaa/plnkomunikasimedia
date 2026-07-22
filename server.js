const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();

const PORT = process.env.PORT || 3000;

// Configure Multer storage for documentation photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Middleware for parsing JSON body
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'public', 'data', 'requests.json');

// Helper function to read requests
function readRequests() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      // Ensure directory exists
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading requests file:', error);
    return [];
  }
}

// Helper function to write requests
function writeRequests(requests) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));
  } catch (error) {
    console.error('Error writing requests file:', error);
  }
}

// Admin validation middleware
function requireAdmin(req, res, next) {
  const token = req.headers['authorization'] || req.headers['admin-token'];
  if (token === 'Bearer pln-admin-session-token-2026' || token === 'pln-admin-session-token-2026') {
    return next();
  }
  return res.status(401).json({ error: 'Akses ditolak. Silakan login sebagai admin.' });
}

// API Routes

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'PLNCOMUNICATION' && password === 'plncomunication2026') {
    res.json({ token: 'pln-admin-session-token-2026', success: true });
  } else {
    res.status(401).json({ success: false, error: 'Username atau Password salah.' });
  }
});

// Get Requests List
app.get('/api/requests', (req, res) => {
  const requests = readRequests();
  res.json(requests);
});

// Submit New Request (Public or Admin)
app.post('/api/requests', upload.array('fotoDokumentasi', 50), (req, res) => {
  const {
    tipePermohonan,
    namaPemohon,
    bidang,
    namaKegiatan,
    tanggalKegiatan,
    tempatKegiatan,
    permintaan,
    siapaTerlibat,
    deskripsiKegiatan,
    hasilLinkDoc,
    hasilLinkBerita,
    status,
    petugas,
    alasanPending
  } = req.body;

  if (!tipePermohonan || !namaPemohon || !bidang || !namaKegiatan || !tanggalKegiatan || !tempatKegiatan) {
    return res.status(400).json({ error: 'Field utama (Tipe, Pemohon, Bidang, Nama Kegiatan, Tanggal, Tempat) wajib diisi.' });
  }

  const requests = readRequests();
  const nextNo = requests.length > 0 ? Math.max(...requests.map(r => r.no || 0)) + 1 : 1;
  const id = Date.now().toString();

  // Process uploaded files
  let fotoPaths = [];
  if (req.files && req.files.length > 0) {
    fotoPaths = req.files.map(f => `/uploads/${f.filename}`);
  }

  // Determine status (Rilis Berita is directly published without ACC button)
  const token = req.headers['authorization'] || req.headers['admin-token'];
  const isAdmin = (token === 'Bearer pln-admin-session-token-2026' || token === 'pln-admin-session-token-2026');
  const finalStatus = (tipePermohonan === 'Rilis Berita') ? 'Disetujui' : (isAdmin ? (status || 'Disetujui') : 'Pending');

  const newRequest = {
    id,
    no: nextNo,
    tipePermohonan,
    namaPemohon,
    bidang,
    namaKegiatan,
    tanggalKegiatan,
    tempatKegiatan,
    permintaan: permintaan || '',
    siapaTerlibat: siapaTerlibat || '',
    deskripsiKegiatan: deskripsiKegiatan || '',
    fotoPaths,
    hasilLinkDoc: hasilLinkDoc || '',
    hasilLinkBerita: hasilLinkBerita || '',
    status: finalStatus,
    petugas: petugas || '',
    alasanPending: alasanPending || ''
  };

  requests.push(newRequest);
  writeRequests(requests);

  res.status(201).json(newRequest);
});

// Update Request (Admin only)
app.put('/api/requests/:id', requireAdmin, upload.array('fotoDokumentasi', 50), (req, res) => {
  const { id } = req.params;
  const {
    tipePermohonan,
    namaPemohon,
    bidang,
    namaKegiatan,
    tanggalKegiatan,
    tempatKegiatan,
    permintaan,
    siapaTerlibat,
    deskripsiKegiatan,
    hasilLinkDoc,
    hasilLinkBerita,
    status,
    petugas,
    alasanPending,
    keepExistingPhotos
  } = req.body;

  if (!tipePermohonan || !namaPemohon || !bidang || !namaKegiatan || !tanggalKegiatan || !tempatKegiatan) {
    return res.status(400).json({ error: 'Field utama wajib diisi.' });
  }

  const requests = readRequests();
  const idx = requests.findIndex(r => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  let fotoPaths = requests[idx].fotoPaths || [];

  // If there are new files uploaded
  if (req.files && req.files.length > 0) {
    // Delete old files if keepExistingPhotos is false/unset
    if (keepExistingPhotos !== 'true') {
      fotoPaths.forEach(p => {
        const oldPath = path.join(__dirname, 'public', p);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch(e) {}
        }
      });
      fotoPaths = [];
    }
    const newPaths = req.files.map(f => `/uploads/${f.filename}`);
    fotoPaths = fotoPaths.concat(newPaths);
  }

  requests[idx] = {
    ...requests[idx],
    tipePermohonan,
    namaPemohon,
    bidang,
    namaKegiatan,
    tanggalKegiatan,
    tempatKegiatan,
    permintaan: permintaan || '',
    siapaTerlibat: siapaTerlibat || '',
    deskripsiKegiatan: deskripsiKegiatan || '',
    fotoPaths,
    hasilLinkDoc: hasilLinkDoc || '',
    hasilLinkBerita: hasilLinkBerita || '',
    status: status || requests[idx].status || 'Disetujui',
    petugas: petugas || '',
    alasanPending: alasanPending || ''
  };

  writeRequests(requests);
  res.json(requests[idx]);
});

// Approve Request (Admin only)
app.post('/api/requests/:id/approve', requireAdmin, (req, res) => {
  const { id } = req.params;
  const requests = readRequests();
  const idx = requests.findIndex(r => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  requests[idx].status = 'Disetujui';
  writeRequests(requests);
  res.json(requests[idx]);
});

// Delete Request (Admin only)
app.delete('/api/requests/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  let requests = readRequests();
  
  const initialLength = requests.length;
  const targetReq = requests.find(r => r.id === id);
  
  requests = requests.filter(r => r.id !== id);

  if (requests.length === initialLength) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  // Delete all uploaded files for this request
  if (targetReq && targetReq.fotoPaths && targetReq.fotoPaths.length > 0) {
    targetReq.fotoPaths.forEach(p => {
      const oldPath = path.join(__dirname, 'public', p);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch(e) {}
      }
    });
  }

  // Re-index the sequence numbers (No. Urut) so they are sequential after deletion
  requests.forEach((reqItem, idx) => {
    reqItem.no = idx + 1;
  });

  writeRequests(requests);
  res.json({ message: 'Data berhasil dihapus.' });
});

// Fallback to index.html for single-page style app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Portal Informasi PLN berjalan di http://localhost:${PORT}`);
});

