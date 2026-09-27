const db = require("../db");

// Ambil semua nama barang beserta total_stok real-time
const getNamaBarang = (req, res) => {
    const sql = `
        SELECT
            nb.id,
            nb.kode,
            nb.nama,
            nb.kategori,
            nb.sub_kategori,
            nb.satuan,
            nb.lokasi,
            GREATEST(
                0,
                COALESCE((SELECT SUM(b.jumlah) FROM barang b WHERE b.nama_produk = nb.nama AND b.is_arsip = 0), 0)
                -
                COALESCE((SELECT SUM(p.jumlah) FROM pemakaian p WHERE p.nama_produk = nb.nama), 0)
            ) AS total_stok
        FROM nama_barang nb
        ORDER BY nb.nama ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
};

// Helper sync master data kategori, sub_kategori, satuan, lokasi
const syncMasterDataHelper = (kategori, sub_kategori, satuan, lokasi) => {
    if (kategori && kategori.trim() !== "") {
        db.run("INSERT IGNORE INTO kategori (nama_kategori) VALUES (?)", [kategori.trim()], function() {
            if (sub_kategori && sub_kategori.trim() !== "") {
                db.get("SELECT id FROM kategori WHERE nama_kategori = ?", [kategori.trim()], (err, katRow) => {
                    if (katRow) {
                        db.run("INSERT IGNORE INTO sub_kategori (kategori_id, nama_sub_kategori) VALUES (?, ?)", [katRow.id, sub_kategori.trim()]);
                    }
                });
            }
        });
    }
    if (satuan && satuan.trim() !== "") {
        db.run("INSERT IGNORE INTO satuan (nama_satuan) VALUES (?)", [satuan.trim()]);
    }
    if (lokasi && lokasi.trim() !== "") {
        db.run("INSERT IGNORE INTO lokasi (nama_lokasi) VALUES (?)", [lokasi.trim()]);
    }
};

// Tambah nama barang (dengan kode, kategori, sub_kategori, satuan, lokasi + sync ke tabel master)
const createNamaBarang = (req, res) => {
    const { kode, nama, kategori, sub_kategori, satuan, lokasi } = req.body;
    if (!nama || nama.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama barang wajib diisi." });
    }
    db.run(
        "INSERT INTO nama_barang (kode, nama, kategori, sub_kategori, satuan, lokasi) VALUES (?, ?, ?, ?, ?, ?)",
        [
            kode?.trim() || "",
            nama.trim(),
            kategori?.trim() || "",
            sub_kategori?.trim() || "",
            satuan?.trim() || "",
            lokasi?.trim() || ""
        ],
        function (err) {
            if (err) {
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ success: false, message: "Nama barang sudah terdaftar." });
                }
                return res.status(500).json({ success: false, message: err.message });
            }

            syncMasterDataHelper(kategori, sub_kategori, satuan, lokasi);

            res.json({
                success: true,
                message: "Data barang berhasil ditambahkan.",
                data: {
                    id: this.lastID,
                    kode: kode?.trim() || "",
                    nama: nama.trim(),
                    kategori: kategori?.trim() || "",
                    sub_kategori: sub_kategori?.trim() || "",
                    satuan: satuan?.trim() || "",
                    lokasi: lokasi?.trim() || ""
                }
            });
        }
    );
};

// Update nama barang (kode, nama, kategori, sub_kategori, satuan, lokasi + penyesuaian manual total_stok dengan Double Verification)
const updateNamaBarang = (req, res) => {
    const { id } = req.params;
    const { kode, nama, kategori, sub_kategori, satuan, lokasi, manual_total_stok } = req.body;

    if (!nama || nama.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama barang wajib diisi." });
    }

    const cleanNama = nama.trim();
    const cleanKode = kode ? kode.trim() : "";
    const cleanKat = kategori ? kategori.trim() : "";
    const cleanSub = sub_kategori ? sub_kategori.trim() : "";
    const cleanSat = satuan ? satuan.trim() : "";
    const cleanLok = lokasi ? lokasi.trim() : "";

    // 1. Ambil data master lama sebelum di-UPDATE untuk mendeteksi perubahan nama (rename)
    db.get("SELECT * FROM nama_barang WHERE id = ?", [id], (findErr, oldMaster) => {
        if (findErr) {
            return res.status(500).json({ success: false, message: findErr.message });
        }
        if (!oldMaster) {
            return res.status(404).json({ success: false, message: "Data barang tidak ditemukan." });
        }

        const oldNama = oldMaster.nama || "";
        const oldKode = oldMaster.kode || "";

        // 2. Update master data di tabel nama_barang
        db.run(
            "UPDATE nama_barang SET kode = ?, nama = ?, kategori = ?, sub_kategori = ?, satuan = ?, lokasi = ? WHERE id = ?",
            [cleanKode, cleanNama, cleanKat, cleanSub, cleanSat, cleanLok, id],
            function (err) {
                if (err) {
                    if (err.message.includes("UNIQUE")) {
                        return res.status(400).json({ success: false, message: "Nama barang sudah terdaftar." });
                    }
                    return res.status(500).json({ success: false, message: err.message });
                }

                // 3. Sinkronkan kode_produk, nama_produk & master fields di tabel barang (Penerimaan) dan pemakaian (Pemakaian)
                db.run(
                    `UPDATE barang 
                     SET kode_produk = ?, nama_produk = ?, kategori = ?, sub_kategori = ?, satuan = ?, lokasi = ? 
                     WHERE (nama_produk = ? AND nama_produk != '') 
                        OR (kode_produk = ? AND kode_produk != '') 
                        OR (nama_produk = ? AND nama_produk != '')`,
                    [cleanKode, cleanNama, cleanKat, cleanSub, cleanSat, cleanLok, oldNama, oldKode, cleanNama]
                );

                db.run(
                    `UPDATE pemakaian 
                     SET kode_produk = ?, nama_produk = ? 
                     WHERE (nama_produk = ? AND nama_produk != '') 
                        OR (kode_produk = ? AND kode_produk != '') 
                        OR (nama_produk = ? AND nama_produk != '')`,
                    [cleanKode, cleanNama, oldNama, oldKode, cleanNama]
                );

                // 4. Jika ada penyesuaian stok manual (Double Verification)
                if (manual_total_stok !== undefined && manual_total_stok !== null && manual_total_stok !== "") {
                    const targetStok = parseInt(manual_total_stok, 10) || 0;

                    db.get("SELECT * FROM barang WHERE nama_produk = ? AND is_arsip = 0 LIMIT 1", [cleanNama], (bErr, batch) => {
                        if (batch) {
                            db.run("UPDATE barang SET jumlah = ?, updated_at = CURRENT_TIMESTAMP WHERE kode_produk = ?", [targetStok, batch.kode_produk]);
                        } else {
                            const newKodeBatch = cleanKode ? `${cleanKode}-b1` : `PRD-${Date.now()}`;
                            db.run(
                                "INSERT INTO barang (kode_produk, nama_produk, kategori, sub_kategori, satuan, jumlah, tanggal_expired, tanggal_masuk, lokasi) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)",
                                [newKodeBatch, cleanNama, cleanKat, cleanSub, cleanSat, targetStok, '2099-12-31', cleanLok]
                            );
                        }
                    });
                }

                syncMasterDataHelper(cleanKat, cleanSub, cleanSat, cleanLok);

                res.json({ success: true, message: "Data barang berhasil diperbarui dan riwayat stok telah disinkronkan." });
            }
        );
    });
};

// Hapus nama barang
const deleteNamaBarang = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM nama_barang WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, message: "Data barang tidak ditemukan." });
        res.json({ success: true, message: "Data barang berhasil dihapus." });
    });
};

module.exports = { getNamaBarang, createNamaBarang, updateNamaBarang, deleteNamaBarang };
