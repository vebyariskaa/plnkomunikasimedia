const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const app = express();

const PORT = process.env.PORT || 3000;

// Supabase Setup
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Configure Multer storage for documentation photos (in-memory for Supabase, disk for fallback)
const storage = supabase ? multer.memoryStorage() : multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'public', 'uploads');
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

const isVercel = process.env.VERCEL || process.env.AWS_REGION;
const DATA_FILE = isVercel 
  ? path.join('/tmp', 'requests.json') 
  : path.join(__dirname, 'public', 'data', 'requests.json');

// Helper function to read requests
function readRequests() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const publicDataFile = path.join(__dirname, 'public', 'data', 'requests.json');
      if (fs.existsSync(publicDataFile)) {
        const initialData = fs.readFileSync(publicDataFile, 'utf8');
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, initialData);
        return JSON.parse(initialData);
      }
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

// Multer for banners (single file, in-memory always for flexibility)
const uploadBanner = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// API Routes

// ── Banner Management (Up to 10 slots) ─────────────────────────────────────────
const BANNERS_FILE = isVercel 
  ? path.join('/tmp', 'banners.json') 
  : path.join(__dirname, 'public', 'data', 'banners.json');

function readBannersStore() {
  try {
    if (fs.existsSync(BANNERS_FILE)) {
      return JSON.parse(fs.readFileSync(BANNERS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function writeBannersStore(bannersObj) {
  try {
    fs.mkdirSync(path.dirname(BANNERS_FILE), { recursive: true });
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(bannersObj, null, 2));
  } catch (e) {
    console.error('Error writing banners file:', e);
  }
}

// GET /api/banners — return current banner URLs (slot 1 s/d 10)
app.get('/api/banners', async (req, res) => {
  const store = readBannersStore();
  const banners = [];

  for (let i = 1; i <= 10; i++) {
    let url = null;
    const key = `banner${i}`;

    if (store[key]) {
      url = store[key];
    } else if (supabase) {
      const { data } = supabase.storage.from('banners').getPublicUrl(`${key}.jpg`);
      url = data ? (data.publicUrl + '?t=' + Date.now()) : null;
    } else {
      const localPath = path.join(__dirname, 'public', 'img', `${key}.jpg`);
      if (fs.existsSync(localPath)) {
        url = `/img/${key}.jpg?t=${Date.now()}`;
      }
    }

    // Default fallbacks for slots 1 and 2 if empty
    if (!url && i === 1) url = '/img/banner1.jpg';
    if (!url && i === 2) url = '/img/banner2.jpg';

    banners.push({ slot: i, url });
  }

  res.json(banners);
});

// POST /api/banners/:slot — upload a new banner image (admin only, up to 10 slots)
app.post('/api/banners/:slot', requireAdmin, uploadBanner.single('banner'), async (req, res) => {
  const slot = parseInt(req.params.slot);
  if (isNaN(slot) || slot < 1 || slot > 10) {
    return res.status(400).json({ error: 'Slot banner harus bernilai antara 1 sampai 10.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'File gambar banner wajib diupload.' });
  }

  const fileName = `banner${slot}.jpg`;
  let bannerUrl = null;

  // Try Supabase Storage first if available
  if (supabase) {
    try {
      const { error } = await supabase.storage
        .from('banners')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (!error) {
        const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName);
        if (urlData && urlData.publicUrl) {
          bannerUrl = urlData.publicUrl + '?t=' + Date.now();
        }
      }
    } catch (err) {
      console.error('Supabase banner upload error:', err);
    }
  }

  // If Supabase not used or failed, convert buffer to Base64 Data URI (100% reliable everywhere)
  if (!bannerUrl) {
    const mime = req.file.mimetype || 'image/jpeg';
    const base64Data = req.file.buffer.toString('base64');
    bannerUrl = `data:${mime};base64,${base64Data}`;
  }

  // Save to persistent banners store
  const store = readBannersStore();
  store[`banner${slot}`] = bannerUrl;
  writeBannersStore(store);

  return res.json({ success: true, url: bannerUrl, slot });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'PLNCOMUNICATION' && password === 'plncomunication2026') {
    res.json({ token: 'pln-admin-session-token-2026', success: true });
  } else {
    res.status(401).json({ success: false, error: 'Username atau Password salah.' });
  }
});

// Helper function to upload files to Supabase Storage bucket 'photos'
async function uploadFilesToSupabase(files) {
  if (!supabase || !files || files.length === 0) return [];
  const uploadedUrls = [];
  for (const file of files) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    if (publicUrlData && publicUrlData.publicUrl) {
      uploadedUrls.push(publicUrlData.publicUrl);
    }
  }
  return uploadedUrls;
}

// Get Requests List
app.get('/api/requests', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('no', { ascending: true });

      if (error) throw error;
      return res.json(data || []);
    } catch (error) {
      console.error('Error reading from Supabase:', error);
      // Fallback to local
    }
  }
  const requests = readRequests();
  res.json(requests);
});

// Submit New Request (Public or Admin)
app.post('/api/requests', upload.array('fotoDokumentasi', 50), async (req, res) => {
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

  const token = req.headers['authorization'] || req.headers['admin-token'];
  const isAdmin = (token === 'Bearer pln-admin-session-token-2026' || token === 'pln-admin-session-token-2026');

  // Enforce rule: Rilis Berita CAN ONLY BE CREATED AND EDITED BY ADMIN
  if (tipePermohonan === 'Rilis Berita' && !isAdmin) {
    return res.status(403).json({ error: 'Akses ditolak. Pembuatan Rilis Berita hanya dapat dilakukan oleh Admin.' });
  }

  const finalStatus = (tipePermohonan === 'Rilis Berita' || isAdmin) ? (status || 'Disetujui') : 'Pending';

  const allowedFiles = req.files;
  const finalDeskripsi = deskripsiKegiatan || '';


  if (supabase) {
    try {
      // Get highest sequence number
      const { data: existingData } = await supabase.from('requests').select('no').order('no', { ascending: false }).limit(1);
      const nextNo = existingData && existingData.length > 0 ? (existingData[0].no || 0) + 1 : 1;
      const id = Date.now().toString();

      let fotoPaths = [];
      if (allowedFiles && allowedFiles.length > 0) {
        fotoPaths = await uploadFilesToSupabase(allowedFiles);
      }

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
        deskripsiKegiatan: finalDeskripsi,
        fotoPaths,
        hasilLinkDoc: hasilLinkDoc || '',
        hasilLinkBerita: hasilLinkBerita || '',
        status: finalStatus,
        petugas: petugas || '',
        alasanPending: alasanPending || ''
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('requests')
        .insert([newRequest])
        .select()
        .single();

      if (insertError) throw insertError;
      return res.status(201).json(insertedData || newRequest);
    } catch (error) {
      console.error('Error inserting to Supabase:', error);
      // Fallback to local write
    }
  }

  const requests = readRequests();
  const nextNo = requests.length > 0 ? Math.max(...requests.map(r => r.no || 0)) + 1 : 1;
  const id = Date.now().toString();

  let fotoPaths = [];
  if (allowedFiles && allowedFiles.length > 0) {
    fotoPaths = allowedFiles.map(f => `/uploads/${f.filename}`);
  }

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
    deskripsiKegiatan: finalDeskripsi,
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
app.put('/api/requests/:id', requireAdmin, upload.array('fotoDokumentasi', 50), async (req, res) => {
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

  if (supabase) {
    try {
      const { data: targetReq } = await supabase.from('requests').select('*').eq('id', id).single();
      if (!targetReq) return res.status(404).json({ error: 'Data tidak ditemukan.' });

      let fotoPaths = targetReq.fotoPaths || [];

      if (req.files && req.files.length > 0) {
        if (keepExistingPhotos !== 'true') {
          fotoPaths = [];
        }
        const newUploadedUrls = await uploadFilesToSupabase(req.files);
        fotoPaths = fotoPaths.concat(newUploadedUrls);
      }

      const updateData = {
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
        status: status || targetReq.status || 'Disetujui',
        petugas: petugas || '',
        alasanPending: alasanPending || ''
      };

      const { data: updatedRecord, error: updateError } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.json(updatedRecord);
    } catch (error) {
      console.error('Error updating in Supabase:', error);
    }
  }

  const requests = readRequests();
  const idx = requests.findIndex(r => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  let fotoPaths = requests[idx].fotoPaths || [];

  if (req.files && req.files.length > 0) {
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
app.post('/api/requests/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .update({ status: 'Disetujui' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } catch (error) {
      console.error('Error approving in Supabase:', error);
    }
  }

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
app.delete('/api/requests/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.json({ message: 'Data berhasil dihapus dari Supabase.' });
    } catch (error) {
      console.error('Error deleting from Supabase:', error);
    }
  }

  let requests = readRequests();
  const initialLength = requests.length;
  const targetReq = requests.find(r => r.id === id);
  
  requests = requests.filter(r => r.id !== id);

  if (requests.length === initialLength) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  if (targetReq && targetReq.fotoPaths && targetReq.fotoPaths.length > 0) {
    targetReq.fotoPaths.forEach(p => {
      const oldPath = path.join(__dirname, 'public', p);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch(e) {}
      }
    });
  }

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

