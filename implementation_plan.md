# Rencana Implementasi Penambahan Produk Duplikat (Batch Berbeda) Tanpa Mengubah Backend

Dokumen ini menjelaskan rancangan untuk memungkinkan penambahan produk dengan kode produk (`kode_produk`) yang sama namun memiliki tanggal kedaluwarsa yang berbeda. Karena backend menggunakan `kode_produk` sebagai `PRIMARY KEY` (unik) di database SQLite dan tidak boleh diubah, kita akan mengatasinya di sisi frontend secara cerdas.

## Skenario & Alur Fitur
1. **Pemeriksaan Duplikat**: Saat pengguna menambahkan barang baru melalui `ModalBarang.jsx` dengan kode produk yang sudah ada (misal: `KD-001`):
   - Frontend akan mendeteksi bahwa kode tersebut sudah ada.
   - Muncul pop-up konfirmasi: *"Produk dengan kode KD-001 sudah terdaftar. Apakah Anda ingin menyimpannya sebagai Batch Baru (Kedaluwarsa Berbeda)?"*
2. **Generasi Suffix Otomatis**: Jika pengguna menyetujui ("Ya"), frontend akan mendeteksi batch yang tersedia berikutnya secara berurutan:
   - Jika `KD-001` sudah ada, kode produk baru diubah menjadi `KD-001-b2` (Batch 2).
   - Jika `KD-001-b2` sudah ada, diubah menjadi `KD-001-b3` (Batch 3), dan seterusnya.
3. **Penyimpanan di Backend**: Kode produk hasil modifikasi (`KD-001-b2`) dikirim ke backend. Karena nilainya unik bagi SQLite, penyimpanan akan berhasil tanpa merusak batasan `PRIMARY KEY`.
4. **Tampilan Bersih & Rapi**: Di semua tabel halaman (Dashboard, Semua Barang, Barang Expired, Arsip Barang), kode produk dengan suffix `-bX` akan diformat ulang secara visual agar rapi, misalnya:
   - `KD-001-b2` ditampilkan sebagai `KD-001 (Batch 2)`.
   - Kode asli tetap disimpan di balik layar untuk proses pencarian, penyaringan, pengeditan, pengarsipan, dan penghapusan agar tombol aksi tetap berfungsi dengan tepat.

---

## Modifikasi File & Rencana Kode

### 1. Helper Format Kode Produk [NEW]
- Membuat helper function untuk mendeteksi dan memformat tampilan kode produk:
  ```javascript
  export function formatKodeProduk(kode) {
      if (!kode) return "-";
      const match = kode.match(/(.+)-b(\d+)$/);
      if (match) {
          return `${match[1]} (Batch ${match[2]})`;
      }
      return kode;
  }
  ```

### 2. Modifikasi Form Tambah Barang [MODIFY] [ModalBarang.jsx](file:///c:/InventarisEXPIRED/frontend/components/ModalBarang.jsx)
- Sebelum mengirim request `POST` untuk produk baru:
  1. Ambil data produk yang ada dari backend `GET /api/barang` dan `GET /api/barang/arsip`.
  2. Cari apakah ada kecocokan kode produk.
  3. Jika ada kecocokan, tampilkan modal konfirmasi kustom atau konfirmasi dialog browser.
  4. Hitung suffix `-bX` berikutnya secara otomatis.
  5. Kirim data yang sudah di-suffix ke backend.

### 3. Modifikasi Tampilan Tabel [MODIFY]
Terapkan helper `formatKodeProduk` pada rendering tabel di file-file berikut:
- **[Dashboard.jsx](file:///c:/InventarisEXPIRED/frontend/src/pages/Dashboard.jsx)**
- **[SemuaBarang.jsx](file:///c:/InventarisEXPIRED/frontend/src/pages/SemuaBarang.jsx)**
- **[BarangExpired.jsx](file:///c:/InventarisEXPIRED/frontend/src/pages/BarangExpired.jsx)**
- **[ArsipBarang.jsx](file:///c:/InventarisEXPIRED/frontend/src/pages/ArsipBarang.jsx)**

---

## Rencana Verifikasi

### Pengujian Manual
1. Tambahkan barang baru dengan kode `KD-001` (yang sudah ada), masukkan tanggal expired berbeda.
2. Pastikan muncul pop-up konfirmasi tentang duplikasi produk.
3. Klik "Ya/OK" dan verifikasi produk berhasil disimpan.
4. Periksa apakah produk baru tampil di tabel dengan format `KD-001 (Batch 2)`.
5. Coba lakukan aksi Edit, Hapus, dan Arsipkan pada produk batch baru tersebut untuk memastikan tombol-tombol tetap berfungsi dengan benar menggunakan ID batch (`KD-001-b2`).
