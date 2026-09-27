# SIVA - Sistem Informasi Inventaris & Expired Barang

SIVA adalah aplikasi manajemen inventaris berbasis web yang dirancang untuk mengelola stok barang, melacak tanggal kedaluwarsa (expired), pencatatan pemakaian barang, serta menghasilkan laporan penerimaan, pemakaian, dan kartu stok secara akurat.

---

## 🚀 Fitur Utama

- **Dashboard Interaktif**: Statistik stok aktif, ringkasan barang mendekati kedaluwarsa, pemakaian bulan ini, dan peringatan kritis.
- **Manajemen Barang**: Pendataan barang masuk, batch nomor, tanggal expired, kategori, lokasi rak/ruangan, dan satuan.
- **Pemantauan Expired**: Status visual kedaluwarsa (Aman, Perhatian, Segera Expired, Kedaluwarsa) dan pengarsipan otomatis/manual.
- **Pencatatan Pemakaian**: Pengurangan stok sesuai peruntukan/keperluan dengan riwayat lengkap.
- **Laporan & Export**: Ekspor data ke format Excel untuk laporan penerimaan, kartu stok, pemakaian, dan arsip barang.
- **Multi-User & Hak Akses**: Manajemen pengguna dengan berbagai peran (Admin, Operator, dll.).
- **Dukungan Database Fleksibel**: Mendukung PostgreSQL (Supabase, Neon, RDS, atau Lokal) menggunakan Prisma ORM / PostgreSQL Client, serta kompatibilitas lokal.

---

## 📁 Struktur Direktori

```text
├── backend/                  # Server Node.js / Express API
│   ├── controllers/          # Logika bisnis dan handler route
│   ├── routes/               # Definisi endpoint REST API
│   ├── prisma/               # Skema Prisma & migrasi database
│   ├── uploads/              # Direktori upload (dikecualikan dari git)
│   ├── exports/              # Direktori ekspor berkas Excel
│   └── .env.example          # Template konfigurasi environment backend
│
├── frontend/                 # Client React / Vite SPA
│   ├── src/
│   │   ├── components/       # Komponen antarmuka (Modal, Sidebar, dll.)
│   │   ├── context/          # Context API (Auth, Settings)
│   │   └── pages/            # Halaman navigasi aplikasi
│   └── .env.example          # Template konfigurasi environment frontend
│
├── .gitignore                # Aturan pemisahan file privat/keamanan
└── README.md
```

---

## 🛠️ Panduan Memulai (Development Setup)

### 1. Clone Repository
```bash
git clone https://github.com/F4KHR111/SIVA.git
cd SIVA
```

### 2. Setup Backend
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Salin template `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   # Pada Windows PowerShell:
   # Copy-Item .env.example .env
   ```
3. Sesuaikan variabel koneksi database di `.env`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/inventaris_db?schema=public"
   DIRECT_URL="postgresql://username:password@localhost:5432/inventaris_db?schema=public"
   ```
4. Pasang dependensi dan jalankan server backend:
   ```bash
   npm install
   npm run dev
   # Atau jika menggunakan node:
   # node index.js
   ```

Backend akan berjalan di port `3000` (atau port yang ditentukan).

---

### 3. Setup Frontend
1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Salin template environment:
   ```bash
   cp .env.example .env
   # Pada Windows PowerShell:
   # Copy-Item .env.example .env
   ```
3. Pasang dependensi dan jalankan frontend development server:
   ```bash
   npm install
   npm run dev
   ```
4. Buka tautan lokal yang ditampilkan (biasanya `http://localhost:5173`).

---

## 🔒 Kebijakan Keamanan & Data Sensitif

Repository ini telah dikonfigurasi menggunakan `.gitignore` untuk melindungi data pribadi dan kredensial sistem:
- ❌ **Kredensial & Secrets** (`.env`, `.env.*`) tidak dipublikasikan ke repository.
- ❌ **Data Riil & Database** (`*.db`, SQLite files) tidak diunggah.
- ❌ **Berkas Pengguna & Transaksi** (`backend/uploads/*`, file export `*.xlsx`) diproteksi.
- ❌ **Dependensi & Binari** (`node_modules/`, `bin/`, `*.exe`) dikecualikan untuk menjaga ukuran repositori tetap bersih dan ringan.

Template konfigurasi variabel sistem dapat dilihat pada `.env.example` di masing-masing direktori.
