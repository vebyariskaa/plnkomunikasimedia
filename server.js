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

// Configure Multer storage for documentation photos (in-memory always for flexibility and Vercel compatibility)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Middleware for parsing JSON body
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const isVercel = process.env.VERCEL || process.env.AWS_REGION;
const DATA_FILE = isVercel 
  ? path.join('/tmp', 'requests.json') 
  : path.join(__dirname, 'public', 'data', 'requests.json');

const KV_ROW_ID = '9999999999999'; // Special ID for JSON blob storage fallback

// Helper function to read requests (async)
async function readRequests() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
    
    // Sync from Supabase DB if local doesn't exist
    if (supabase) {
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('requests')
          .select('deskripsiKegiatan')
          .eq('id', KV_ROW_ID)
          .single();
          
        if (!dbError && dbData && dbData.deskripsiKegiatan) {
          const parsed = JSON.parse(dbData.deskripsiKegiatan);
          fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
          fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2));
          return parsed;
        }
      } catch (e) {
        console.error('Supabase DB download error:', e);
      }
    }

    const publicDataFile = path.join(__dirname, 'public', 'data', 'requests.json');
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    if (fs.existsSync(publicDataFile)) {
      const initialData = fs.readFileSync(publicDataFile, 'utf8');
      const parsed = JSON.parse(initialData);
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2));
      return parsed;
    }

    fs.writeFileSync(DATA_FILE, '[]');
    return [];
  } catch (error) {
    console.error('Error reading requests file:', error);
    return [];
  }
}

// Helper function to write requests (async)
async function writeRequests(requests) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));
    
    // Also sync to Supabase Database for absolute permanence
    if (supabase) {
      try {
        const jsonStr = JSON.stringify(requests, null, 2);
        await supabase.from('requests').upsert({
          id: KV_ROW_ID,
          namaPemohon: 'SYSTEM_JSON_STORE',
          bidang: 'SYSTEM',
          namaKegiatan: 'SYSTEM',
          tanggalKegiatan: '2099-12-31',
          tempatKegiatan: 'SYSTEM',
          deskripsiKegiatan: jsonStr
        });
      } catch (e) {
        console.error('Supabase DB upload error:', e);
      }
    }
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
const BANNERS_KV_ROW_ID = '8888888888888';

async function readBannersStore() {
  try {
    if (fs.existsSync(BANNERS_FILE)) {
      return JSON.parse(fs.readFileSync(BANNERS_FILE, 'utf8'));
    }
    // Sync from Supabase DB if local doesn't exist
    if (supabase) {
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('requests')
          .select('deskripsiKegiatan')
          .eq('id', BANNERS_KV_ROW_ID)
          .single();
          
        if (!dbError && dbData && dbData.deskripsiKegiatan) {
          const parsed = JSON.parse(dbData.deskripsiKegiatan);
          fs.mkdirSync(path.dirname(BANNERS_FILE), { recursive: true });
          fs.writeFileSync(BANNERS_FILE, JSON.stringify(parsed, null, 2));
          return parsed;
        }
      } catch (e) {
        console.error('Supabase DB banners download error:', e);
      }
    }
    return {};
  } catch (error) {
    console.error('Error reading banners file:', error);
    return {};
  }
}

// Debug route to check Supabase status
app.get('/api/debug-supabase', async (req, res) => {
  if (!supabase) return res.json({ status: 'No Supabase credentials configured' });
  try {
    // 1. Check if we can query 'requests' table
    let dbStatus = 'Unknown';
    const { error: dbError } = await supabase.from('requests').select('id').limit(1);
    dbStatus = dbError ? `Error: ${dbError.message}` : 'OK';

    // 2. Check if 'banners' bucket exists and is accessible
    let bucketStatus = 'Unknown';
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      bucketStatus = `Error: ${bucketError.message}`;
    } else {
      const bannersBucket = buckets.find(b => b.name === 'banners');
      bucketStatus = bannersBucket ? (bannersBucket.public ? 'Found and Public' : 'Found but Private') : 'Not Found';
    }

    // 3. Test absolute permanence sync (Upsert & Read KV_ROW_ID)
    let syncStatus = 'Unknown';
    let syncError = null;
    const testJson = JSON.stringify([{test: 'OK', time: Date.now()}]);
    
    const { error: upsertErr } = await supabase.from('requests').upsert({
      id: '9999999999998', // Test ID
      namaPemohon: 'SYSTEM_TEST',
      bidang: 'SYSTEM',
      namaKegiatan: 'SYSTEM',
      tanggalKegiatan: '2099-12-31',
      tempatKegiatan: 'SYSTEM',
      deskripsiKegiatan: testJson
    });
    
    if (upsertErr) {
      syncStatus = 'Upsert Failed';
      syncError = upsertErr;
    } else {
      const { data: readData, error: readErr } = await supabase
        .from('requests')
        .select('deskripsiKegiatan')
        .eq('id', '9999999999998')
        .single();
        
      if (readErr) {
        syncStatus = 'Read Failed';
        syncError = readErr;
      } else {
        syncStatus = readData.deskripsiKegiatan === testJson ? 'Success' : 'Mismatch';
      }
    }

    res.json({
      supabaseUrl: SUPABASE_URL ? 'Configured' : 'Missing',
      dbStatus,
      bucketStatus,
      syncStatus,
      syncError,
      buckets: buckets ? buckets.map(b => b.name) : []
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

async function writeBannersStore(bannersObj) {
  try {
    fs.mkdirSync(path.dirname(BANNERS_FILE), { recursive: true });
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(bannersObj, null, 2));
    
    // Sync to Supabase Database for absolute permanence
    if (supabase) {
      try {
        const jsonStr = JSON.stringify(bannersObj, null, 2);
        await supabase.from('requests').upsert({
          id: BANNERS_KV_ROW_ID,
          namaPemohon: 'SYSTEM_JSON_STORE',
          bidang: 'SYSTEM',
          namaKegiatan: 'SYSTEM',
          tanggalKegiatan: '2099-12-31',
          tempatKegiatan: 'SYSTEM',
          deskripsiKegiatan: jsonStr
        });
      } catch (e) {
        console.error('Supabase DB banners upload error:', e);
      }
    }
  } catch (e) {
    console.error('Error writing banners file:', e);
  }
}

// GET /api/banners — return current banner URLs (slot 1 s/d 10)
app.get('/api/banners', async (req, res) => {
  const store = await readBannersStore();
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
  const store = await readBannersStore();
  store[`banner${slot}`] = bannerUrl;
  await writeBannersStore(store);

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
  
  const uploadPromises = files.map(async (file) => {
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
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    return publicUrlData && publicUrlData.publicUrl ? publicUrlData.publicUrl : null;
  });

  const results = await Promise.all(uploadPromises);
  return results.filter(url => url !== null);
}

// Get Requests List
app.get('/api/requests', async (req, res) => {
  const requests = await readRequests();
  res.json(requests);
});

// Submit New Request (Public or Admin)
app.post('/api/requests', upload.array('fotoDokumentasi', 50), async (req, res) => {
  try {
    const {
      tipePermohonan,
      namaPemohon,
      bidang,
      namaKegiatan,
      tanggalKegiatan,
      tanggalSelesai,
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

    const finalNamaPemohon = (namaPemohon && namaPemohon.trim()) ? namaPemohon.trim() : (bidang || 'Pemohon');
    const finalBidang = (bidang && bidang.trim()) ? bidang.trim() : 'Keuangan / Umum';
    const finalTempat = (tempatKegiatan && tempatKegiatan.trim()) ? tempatKegiatan.trim() : '-';
    const finalTipe = tipePermohonan || 'Dokumentasi Kegiatan';

    if (!namaKegiatan || !tanggalKegiatan) {
      return res.status(400).json({ error: 'Nama Kegiatan dan Tanggal Kegiatan wajib diisi.' });
    }

    const token = req.headers['authorization'] || req.headers['admin-token'];
    const isAdmin = (token === 'Bearer pln-admin-session-token-2026' || token === 'pln-admin-session-token-2026');

    const finalStatus = isAdmin ? (status || 'Disetujui') : 'Pending';

    const allowedFiles = req.files;
    const finalDeskripsi = deskripsiKegiatan || '';

    let fotoPaths = [];
    if (supabase && allowedFiles && allowedFiles.length > 0) {
      try {
        fotoPaths = await uploadFilesToSupabase(allowedFiles);
      } catch (e) {
        console.error('Error uploading files to Supabase:', e);
      }
    }

    const requests = await readRequests();
    const nextNo = requests.length > 0 ? Math.max(...requests.map(r => r.no || 0)) + 1 : 1;
    const id = Date.now().toString();

    if (fotoPaths.length === 0 && allowedFiles && allowedFiles.length > 0) {
      fotoPaths = allowedFiles.map(f => {
        const mime = f.mimetype || 'image/jpeg';
        const base64Data = f.buffer ? f.buffer.toString('base64') : '';
        return `data:${mime};base64,${base64Data}`;
      });
    }

    const newRequest = {
      id,
      no: nextNo,
      tipePermohonan: finalTipe,
      namaPemohon: finalNamaPemohon,
      bidang: finalBidang,
      namaKegiatan,
      tanggalKegiatan,
      tanggalSelesai: tanggalSelesai || '',
      tempatKegiatan: finalTempat,
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
    await writeRequests(requests);

    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Fatal error in POST /api/requests:', err);
    res.status(500).json({ error: 'Terjadi kesalahan sistem saat memproses permintaan.' });
  }
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
    tanggalSelesai,
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

  let newSupabaseUrls = [];
  if (supabase && req.files && req.files.length > 0) {
    try {
      newSupabaseUrls = await uploadFilesToSupabase(req.files);
    } catch (e) {
      console.error('Error uploading files to Supabase:', e);
    }
  }

  const requests = await readRequests();
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
    if (newSupabaseUrls.length > 0) {
      fotoPaths = fotoPaths.concat(newSupabaseUrls);
    } else {
      const newPaths = req.files.map(f => {
        const mime = f.mimetype || 'image/jpeg';
        const base64Data = f.buffer.toString('base64');
        return `data:${mime};base64,${base64Data}`;
      });
      fotoPaths = fotoPaths.concat(newPaths);
    }
  }

  requests[idx] = {
    ...requests[idx],
    tipePermohonan,
    namaPemohon,
    bidang,
    namaKegiatan,
    tanggalKegiatan,
    tanggalSelesai: tanggalSelesai || '',
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

  await writeRequests(requests);
  res.json(requests[idx]);
});

// Approve Request (Admin only)
app.post('/api/requests/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const requests = await readRequests();
  const idx = requests.findIndex(r => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  requests[idx].status = 'Disetujui';
  await writeRequests(requests);
  res.json(requests[idx]);
});

// Delete Request (Admin only)
app.delete('/api/requests/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  let requests = await readRequests();
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

  await writeRequests(requests);
  res.json({ message: 'Data berhasil dihapus.' });
});

// Clear all requests (Admin only)
app.delete('/api/requests/clear-all', requireAdmin, async (req, res) => {
  await writeRequests([]);
  return res.json({ message: 'Seluruh data permohonan & rilis berita telah berhasil dikosongkan.' });
});

// Fallback to index.html for single-page style app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Portal Informasi PLN berjalan di http://localhost:${PORT}`);
});

