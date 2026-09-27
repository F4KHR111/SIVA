const sqlite3 = require("sqlite3").verbose();
const mysql = require("mysql2/promise");
const path = require("path");
const os = require("os");
const fs = require("fs");

async function migrateData() {
    console.log("=== MEMULAI MIGRASI DATA DARI SQLITE KE MYSQL ===");

    // 1. Temukan file SQLite
    const documentsDir = path.join(os.homedir(), "Documents", "InventarisGedungAgung");
    const sqlitePathInDocs = path.join(documentsDir, "inventaris.db");
    const sqlitePathInBackend = path.join(__dirname, "database", "inventaris.db");

    let sqlitePath = null;
    if (fs.existsSync(sqlitePathInDocs)) {
        sqlitePath = sqlitePathInDocs;
    } else if (fs.existsSync(sqlitePathInBackend)) {
        sqlitePath = sqlitePathInBackend;
    }

    if (!sqlitePath) {
        console.log("Tidak ditemukan file SQLite inventaris.db. Migrasi dibatalkan (database MySQL akan diinisialisasi baru).");
        process.exit(0);
    }

    console.log(`File SQLite ditemukan di: ${sqlitePath}`);

    // 2. Hubungkan ke SQLite
    const sqliteDb = new sqlite3.Database(sqlitePath);

    // Helper untuk membaca dari SQLite dengan Promise
    const readSqliteAll = (query) => {
        return new Promise((resolve, reject) => {
            sqliteDb.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    };

    // 3. Hubungkan ke MySQL
    const mysqlConn = await mysql.createConnection({
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: "Keluarga123"
    });

    await mysqlConn.query("CREATE DATABASE IF NOT EXISTS `inventaris_db`");
    await mysqlConn.query("USE `inventaris_db`");

    console.log("Terhubung ke MySQL database inventaris_db.");

    // Pastikan tabel di MySQL sudah dibuat
    require("./initDatabase");
    // Beri jeda kecil agar initDatabase selesai membuat tabel
    await new Promise((r) => setTimeout(r, 1000));

    try {
        // --- Migrasi Tabel barang ---
        const barangRows = await readSqliteAll("SELECT * FROM barang");
        console.log(`Migrasi ${barangRows.length} data ke tabel barang...`);
        for (const row of barangRows) {
            await mysqlConn.query(
                `INSERT INTO barang 
                (kode_produk, nama_produk, kategori, satuan, jumlah, tanggal_expired, tanggal_masuk, lokasi, penerima, is_arsip, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                nama_produk=VALUES(nama_produk), kategori=VALUES(kategori), satuan=VALUES(satuan), 
                jumlah=VALUES(jumlah), tanggal_expired=VALUES(tanggal_expired), tanggal_masuk=VALUES(tanggal_masuk), 
                lokasi=VALUES(lokasi), penerima=VALUES(penerima), is_arsip=VALUES(is_arsip)`,
                [
                    row.kode_produk,
                    row.nama_produk,
                    row.kategori || "",
                    row.satuan || "",
                    row.jumlah || 0,
                    row.tanggal_expired,
                    row.tanggal_masuk || null,
                    row.lokasi || "",
                    row.penerima || "",
                    row.is_arsip || 0,
                    row.created_at || new Date(),
                    row.updated_at || new Date()
                ]
            );
        }

        // --- Migrasi Tabel kategori ---
        const kategoriRows = await readSqliteAll("SELECT * FROM kategori");
        console.log(`Migrasi ${kategoriRows.length} data ke tabel kategori...`);
        for (const row of kategoriRows) {
            await mysqlConn.query(
                `INSERT IGNORE INTO kategori (id, nama_kategori) VALUES (?, ?)`,
                [row.id, row.nama_kategori]
            );
        }

        // --- Migrasi Tabel lokasi ---
        const lokasiRows = await readSqliteAll("SELECT * FROM lokasi");
        console.log(`Migrasi ${lokasiRows.length} data ke tabel lokasi...`);
        for (const row of lokasiRows) {
            await mysqlConn.query(
                `INSERT IGNORE INTO lokasi (id, nama_lokasi) VALUES (?, ?)`,
                [row.id, row.nama_lokasi]
            );
        }

        // --- Migrasi Tabel satuan ---
        const satuanRows = await readSqliteAll("SELECT * FROM satuan");
        console.log(`Migrasi ${satuanRows.length} data ke tabel satuan...`);
        for (const row of satuanRows) {
            await mysqlConn.query(
                `INSERT IGNORE INTO satuan (id, nama_satuan) VALUES (?, ?)`,
                [row.id, row.nama_satuan]
            );
        }

        // --- Migrasi Tabel users ---
        const userRows = await readSqliteAll("SELECT * FROM users");
        console.log(`Migrasi ${userRows.length} data ke tabel users...`);
        for (const row of userRows) {
            await mysqlConn.query(
                `INSERT IGNORE INTO users (id, nama, role, created_at) VALUES (?, ?, ?, ?)`,
                [row.id, row.nama, row.role || 'pemakai', row.created_at || new Date()]
            );
        }

        // --- Migrasi Tabel nama_barang ---
        const namaBarangRows = await readSqliteAll("SELECT * FROM nama_barang");
        console.log(`Migrasi ${namaBarangRows.length} data ke tabel nama_barang...`);
        for (const row of namaBarangRows) {
            await mysqlConn.query(
                `INSERT IGNORE INTO nama_barang (id, kode, nama, kategori, satuan, lokasi) VALUES (?, ?, ?, ?, ?, ?)`,
                [row.id, row.kode || '', row.nama, row.kategori || '', row.satuan || '', row.lokasi || '']
            );
        }

        // --- Migrasi Tabel pemakaian ---
        const pemakaianRows = await readSqliteAll("SELECT * FROM pemakaian");
        console.log(`Migrasi ${pemakaianRows.length} data ke tabel pemakaian...`);
        for (const row of pemakaianRows) {
            await mysqlConn.query(
                `INSERT IGNORE INTO pemakaian (id, no_order, kode_produk, nama_produk, jumlah, tanggal_pemakaian, penerima, keterangan, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [row.id, row.no_order || '', row.kode_produk, row.nama_produk, row.jumlah, row.tanggal_pemakaian, row.penerima || '', row.keterangan || '', row.created_at || new Date()]
            );
        }

        console.log("=== MIGRASI DARI SQLITE KE MYSQL BERHASIL TOTAL! ===");

    } catch (err) {
        console.error("Gagal melakukan migrasi data:", err.message);
    } finally {
        sqliteDb.close();
        await mysqlConn.end();
    }
}

migrateData();
