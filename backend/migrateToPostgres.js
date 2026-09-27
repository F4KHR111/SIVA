/**
 * migrateToPostgres.js
 * Migrasi data dari SQLite lokal ke PostgreSQL (Vercel/Neon/Supabase)
 * menggunakan Prisma Client.
 *
 * Cara pakai:
 *   1. Isi DATABASE_URL di file .env
 *   2. npx prisma migrate deploy   (atau prisma db push untuk dev)
 *   3. node migrateToPostgres.js
 */

const sqlite3 = require("sqlite3").verbose();
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const os = require("os");
const fs = require("fs");

const prisma = new PrismaClient();

// ─── helper: baca SQLite ─────────────────────────────────────────────────────
function readSqlite(sqliteDb, query) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function migrate() {
    console.log("=== MIGRASI SQLite → PostgreSQL (Prisma) ===\n");

    // 1. Temukan file SQLite
    const candidates = [
        path.join(os.homedir(), "Documents", "InventarisGedungAgung", "inventaris.db"),
        path.join(__dirname, "database", "inventaris.db"),
    ];

    const sqlitePath = candidates.find(fs.existsSync);

    if (!sqlitePath) {
        console.log(
            "File SQLite tidak ditemukan. " +
            "Skema sudah dibuat via 'prisma migrate deploy', tidak ada data lama yang perlu dipindahkan."
        );
        process.exit(0);
    }

    console.log(`SQLite ditemukan: ${sqlitePath}`);
    const sqliteDb = new sqlite3.Database(sqlitePath);

    try {
        // ── 2. kategori ────────────────────────────────────────────────────
        const kategoriRows = await readSqlite(sqliteDb, "SELECT * FROM kategori");
        console.log(`Migrasi ${kategoriRows.length} baris → kategori`);
        for (const r of kategoriRows) {
            await prisma.kategori.upsert({
                where: { nama_kategori: r.nama_kategori },
                update: {},
                create: { nama_kategori: r.nama_kategori },
            });
        }

        // ── 3. lokasi ──────────────────────────────────────────────────────
        const lokasiRows = await readSqlite(sqliteDb, "SELECT * FROM lokasi");
        console.log(`Migrasi ${lokasiRows.length} baris → lokasi`);
        for (const r of lokasiRows) {
            await prisma.lokasi.upsert({
                where: { nama_lokasi: r.nama_lokasi },
                update: {},
                create: { nama_lokasi: r.nama_lokasi },
            });
        }

        // ── 4. satuan ──────────────────────────────────────────────────────
        const satuanRows = await readSqlite(sqliteDb, "SELECT * FROM satuan");
        console.log(`Migrasi ${satuanRows.length} baris → satuan`);
        for (const r of satuanRows) {
            await prisma.satuan.upsert({
                where: { nama_satuan: r.nama_satuan },
                update: {},
                create: { nama_satuan: r.nama_satuan },
            });
        }

        // ── 5. sub_kategori ────────────────────────────────────────────────
        let subKatRows = [];
        try {
            subKatRows = await readSqlite(sqliteDb, "SELECT * FROM sub_kategori");
        } catch (_) { /* tabel mungkin belum ada di SQLite lama */ }
        console.log(`Migrasi ${subKatRows.length} baris → sub_kategori`);
        for (const r of subKatRows) {
            await prisma.sub_kategori.upsert({
                where: {
                    kategori_id_nama_sub_kategori: {
                        kategori_id: r.kategori_id,
                        nama_sub_kategori: r.nama_sub_kategori,
                    },
                },
                update: {},
                create: {
                    kategori_id: r.kategori_id,
                    nama_sub_kategori: r.nama_sub_kategori,
                },
            });
        }

        // ── 6. nama_barang ─────────────────────────────────────────────────
        let namaBarangRows = [];
        try {
            namaBarangRows = await readSqlite(sqliteDb, "SELECT * FROM nama_barang");
        } catch (_) { }
        console.log(`Migrasi ${namaBarangRows.length} baris → nama_barang`);
        for (const r of namaBarangRows) {
            await prisma.nama_barang.upsert({
                where: { nama: r.nama },
                update: {},
                create: {
                    kode: r.kode || "",
                    nama: r.nama,
                    kategori: r.kategori || "",
                    sub_kategori: r.sub_kategori || "",
                    satuan: r.satuan || "",
                    lokasi: r.lokasi || "",
                },
            });
        }

        // ── 7. barang ──────────────────────────────────────────────────────
        const barangRows = await readSqlite(sqliteDb, "SELECT * FROM barang");
        console.log(`Migrasi ${barangRows.length} baris → barang`);
        for (const r of barangRows) {
            await prisma.barang.upsert({
                where: { id: r.id },
                update: {
                    kode_produk: r.kode_produk,
                    nama_produk: r.nama_produk,
                    kategori: r.kategori || "",
                    sub_kategori: r.sub_kategori || "",
                    satuan: r.satuan || "",
                    jumlah: r.jumlah || 0,
                    tanggal_expired: r.tanggal_expired || "",
                    tanggal_masuk: r.tanggal_masuk || null,
                    lokasi: r.lokasi || "",
                    penerima: r.penerima || "",
                    no_penerimaan: r.no_penerimaan || "",
                    is_no_expired: r.is_no_expired || 0,
                    is_arsip: r.is_arsip || 0,
                },
                create: {
                    id: r.id,
                    kode_produk: r.kode_produk,
                    nama_produk: r.nama_produk,
                    kategori: r.kategori || "",
                    sub_kategori: r.sub_kategori || "",
                    satuan: r.satuan || "",
                    jumlah: r.jumlah || 0,
                    tanggal_expired: r.tanggal_expired || "",
                    tanggal_masuk: r.tanggal_masuk || null,
                    lokasi: r.lokasi || "",
                    penerima: r.penerima || "",
                    no_penerimaan: r.no_penerimaan || "",
                    is_no_expired: r.is_no_expired || 0,
                    is_arsip: r.is_arsip || 0,
                    created_at: r.created_at ? new Date(r.created_at) : new Date(),
                },
            });
        }

        // ── 8. pemakaian ───────────────────────────────────────────────────
        let pemakaianRows = [];
        try {
            pemakaianRows = await readSqlite(sqliteDb, "SELECT * FROM pemakaian");
        } catch (_) { }
        console.log(`Migrasi ${pemakaianRows.length} baris → pemakaian`);
        for (const r of pemakaianRows) {
            await prisma.pemakaian.upsert({
                where: { id: r.id },
                update: {},
                create: {
                    id: r.id,
                    no_order: r.no_order || "",
                    kode_produk: r.kode_produk,
                    nama_produk: r.nama_produk,
                    jumlah: r.jumlah,
                    tanggal_pemakaian: r.tanggal_pemakaian,
                    penerima: r.penerima || "",
                    keterangan: r.keterangan || "",
                    created_at: r.created_at ? new Date(r.created_at) : new Date(),
                },
            });
        }

        // ── 9. users ───────────────────────────────────────────────────────
        let userRows = [];
        try {
            userRows = await readSqlite(sqliteDb, "SELECT * FROM users");
        } catch (_) { }
        console.log(`Migrasi ${userRows.length} baris → users`);
        for (const r of userRows) {
            if (!r.username || !r.password) continue; // skip baris tidak valid
            await prisma.users.upsert({
                where: { username: r.username },
                update: {},
                create: {
                    username: r.username,
                    email: r.email || "",
                    password: r.password,
                    nama: r.nama || r.username,
                    role: r.role || "OPERATOR_INVENTARIS",
                    status: r.status || "active",
                    totp_secret: r.totp_secret || null,
                    is_2fa_enabled: r.is_2fa_enabled || 0,
                    created_at: r.created_at ? new Date(r.created_at) : new Date(),
                },
            });
        }

        // ── 10. pengaturan ─────────────────────────────────────────────────
        let pengaturanRows = [];
        try {
            pengaturanRows = await readSqlite(sqliteDb, "SELECT * FROM pengaturan");
        } catch (_) { }
        console.log(`Migrasi ${pengaturanRows.length} baris → pengaturan`);
        for (const r of pengaturanRows) {
            await prisma.pengaturan.upsert({
                where: { key_name: r.key_name },
                update: { value_text: r.value_text },
                create: { key_name: r.key_name, value_text: r.value_text },
            });
        }

        // ── 11. role_permissions ───────────────────────────────────────────
        let rolePermRows = [];
        try {
            rolePermRows = await readSqlite(sqliteDb, "SELECT * FROM role_permissions");
        } catch (_) { }
        console.log(`Migrasi ${rolePermRows.length} baris → role_permissions`);
        for (const r of rolePermRows) {
            await prisma.role_permissions.upsert({
                where: { role_menu_key: { role: r.role, menu_key: r.menu_key } },
                update: { is_visible: r.is_visible ?? 1 },
                create: { role: r.role, menu_key: r.menu_key, is_visible: r.is_visible ?? 1 },
            });
        }

        // ── 12. role_categories ────────────────────────────────────────────
        let roleCatRows = [];
        try {
            roleCatRows = await readSqlite(sqliteDb, "SELECT * FROM role_categories");
        } catch (_) { }
        console.log(`Migrasi ${roleCatRows.length} baris → role_categories`);
        for (const r of roleCatRows) {
            await prisma.role_categories.upsert({
                where: { role_nama_kategori: { role: r.role, nama_kategori: r.nama_kategori } },
                update: {},
                create: { role: r.role, nama_kategori: r.nama_kategori },
            });
        }

        console.log("\n=== MIGRASI SELESAI! Data berhasil dipindahkan ke PostgreSQL ===");

    } catch (err) {
        console.error("ERROR saat migrasi:", err);
        process.exitCode = 1;
    } finally {
        sqliteDb.close();
        await prisma.$disconnect();
    }
}

migrate();
