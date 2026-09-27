const db = require("../db");

// ======================
// Helper Status Barang
// ======================
// Helper: normalisasi tanggal parsial (bulan+tahun saja → hari terakhir bulan)
// Daftar nama bulan Indonesia untuk parsing
const BULAN_INDO = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4,
    "mei": 5, "juni": 6, "juli": 7, "agustus": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "ags": 8, "agu": 8, "aug": 8,
    "sep": 9, "okt": 10, "oct": 10, "nov": 11, "des": 12, "dec": 12
};

function normalizeTanggalDB(raw) {
    if (!raw || String(raw).trim() === "") return "";
    let val = String(raw).trim();

    // Sudah format YYYY-MM-DD lengkap → langsung return
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

    // Format DD-MM-YYYY atau DD/MM/YYYY (lengkap) → ubah ke YYYY-MM-DD
    let m = val.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
    if (m) {
        const dd = String(m[1]).padStart(2, "0");
        const mm = String(m[2]).padStart(2, "0");
        return `${m[3]}-${mm}-${dd}`;
    }

    // === PARTIAL: hanya bulan + tahun ===

    // Format YYYY-MM (tanpa hari)
    m = val.match(/^(\d{4})[\-\/](\d{1,2})$/);
    if (m) {
        const year = parseInt(m[1]);
        const month = parseInt(m[2]);
        return `${year}-${String(month).padStart(2, "0")}-01`;
    }

    // Format MM-YYYY atau MM/YYYY
    m = val.match(/^(\d{1,2})[\-\/](\d{4})$/);
    if (m) {
        const month = parseInt(m[1]);
        const year = parseInt(m[2]);
        return `${year}-${String(month).padStart(2, "0")}-01`;
    }

    // Format "Agustus 2026", "Agu 2026", "Aug 2026" (nama bulan + tahun)
    m = val.match(/^([a-zA-Z]+)\s+(\d{4})$/i);
    if (m) {
        const bulanKey = m[1].toLowerCase();
        const year = parseInt(m[2]);
        const month = BULAN_INDO[bulanKey];
        if (month) {
            return `${year}-${String(month).padStart(2, "0")}-01`;
        }
    }

    // Format "2026 Agustus" (tahun + nama bulan)
    m = val.match(/^(\d{4})\s+([a-zA-Z]+)$/i);
    if (m) {
        const year = parseInt(m[1]);
        const bulanKey = m[2].toLowerCase();
        const month = BULAN_INDO[bulanKey];
        if (month) {
            return `${year}-${String(month).padStart(2, "0")}-01`;
        }
    }

    // Format tahun saja "2026" → 01 Januari tahun itu
    m = val.match(/^(\d{4})$/);
    if (m) {
        return `${m[1]}-01-01`;
    }

    // Tidak dikenali → coba parse native JS Date sebagai fallback
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
        const dd = String(parsed.getDate()).padStart(2, "0");
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const yyyy = parsed.getFullYear();
        return `${yyyy}-${mm}-${dd}`;
    }

    // Fallback terakhir: kembalikan apa adanya
    return val;
}

function hitungStatus(item) {

    const today = new Date();
    const normalizedDate = normalizeTanggalDB(item.tanggal_expired);
    const expiredDate = new Date(normalizedDate);

    // Jika tanggal tidak valid, beri status khusus
    if (isNaN(expiredDate.getTime())) {
        return {
            ...item,
            sisa_hari: -9999,
            status: "Expired",
            warna: "gray"
        };
    }

    const selisihHari = Math.ceil(
        (expiredDate - today) / (1000 * 60 * 60 * 24)
    );

    let status = "";
    let warna = "";

    if (selisihHari < 0) {
        status = "Expired";
        warna = "gray";
    } else if (selisihHari <= 30) {
        status = "Segera Expired";
        warna = "red";
    } else if (selisihHari <= 60) {
        status = "Perlu Diperhatikan";
        warna = "yellow";
    } else {
        status = "Aman";
        warna = "green";
    }

    return {
        ...item,
        sisa_hari: selisihHari,
        status,
        warna
    };
}

// Helper: hitung sisa_stok per batch menggunakan FIFO pemakaian (tanpa merubah DB)
const attachStokSisaBatch = (rows) => {
    return new Promise((resolve) => {
        db.all("SELECT nama_produk, SUM(jumlah) AS total_pakai FROM pemakaian GROUP BY nama_produk", [], (err, pemakaianRows) => {
            if (err || !pemakaianRows) {
                return resolve(rows.map(r => hitungStatus({ ...r, stok_sisa: r.jumlah })));
            }

            const usageMap = {};
            pemakaianRows.forEach(p => {
                const key = (p.nama_produk || "").trim().toLowerCase();
                usageMap[key] = parseInt(p.total_pakai, 10) || 0;
            });

            const grouped = {};
            rows.forEach((r, idx) => {
                const key = (r.nama_produk || "").trim().toLowerCase();
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push({ ...r, _origIdx: idx });
            });

            const result = new Array(rows.length);

            Object.keys(grouped).forEach(key => {
                let usage = usageMap[key] || 0;
                const batches = grouped[key].sort((a, b) => {
                    const dateA = a.tanggal_expired || "9999-12-31";
                    const dateB = b.tanggal_expired || "9999-12-31";
                    if (dateA < dateB) return -1;
                    if (dateA > dateB) return 1;
                    return a.id - b.id;
                });

                batches.forEach(b => {
                    const batchQty = parseInt(b.jumlah, 10) || 0;
                    const deduct = Math.min(usage, batchQty);
                    const sisa = Math.max(0, batchQty - deduct);
                    usage -= deduct;

                    const itemWithStatus = hitungStatus({ ...b, stok_sisa: sisa });
                    delete itemWithStatus._origIdx;
                    result[b._origIdx] = itemWithStatus;
                });
            });

            resolve(result);
        });
    });
};

// ======================
// Tambah Barang (Auto-Merge Stok Jika Tgl Masuk & Expired Sama)
// ======================
const tambahBarang = (req, res) => {

    const {
        kode_produk,
        nama_produk,
        kategori,
        sub_kategori,
        satuan,
        jumlah,
        tanggal_expired,
        tanggal_masuk,
        lokasi,
        penerima,
        no_penerimaan
    } = req.body;

    if (
        !kode_produk ||
        !nama_produk ||
        jumlah == null ||
        !tanggal_expired
    ) {
        return res.status(400).json({
            success: false,
            message: "Nama produk, jumlah, dan tanggal expired wajib diisi."
        });
    }

    const tglMasuk = tanggal_masuk
        ? normalizeTanggalDB(tanggal_masuk)
        : new Date().toISOString().slice(0, 10);
    const tglExp = Number(req.body.is_no_expired) === 1 ? "2099-12-31" : normalizeTanggalDB(tanggal_expired);
    const qtyInt = parseInt(jumlah, 10) || 0;
    const cleanNoPenerimaan = (no_penerimaan && String(no_penerimaan).trim() !== "")
        ? String(no_penerimaan).trim()
        : `IN-${tglMasuk.replace(/-/g, "")}-001`;

    // Helper untuk auto-registrasi master data
    const syncMasterData = () => {
        if (kategori && kategori.trim() !== "") {
            db.run("INSERT IGNORE INTO kategori (nama_kategori) VALUES (?)", [kategori.trim()], function () {
                if (sub_kategori && sub_kategori.trim() !== "") {
                    db.get("SELECT id FROM kategori WHERE nama_kategori = ?", [kategori.trim()], (err, katRow) => {
                        if (katRow) {
                            db.run("INSERT IGNORE INTO sub_kategori (kategori_id, nama_sub_kategori) VALUES (?, ?)", [katRow.id, sub_kategori.trim()]);
                        }
                    });
                }
            });
        }
        if (lokasi && lokasi.trim() !== "") {
            db.run("INSERT IGNORE INTO lokasi (nama_lokasi) VALUES (?)", [lokasi.trim()]);
        }
        if (satuan && satuan.trim() !== "") {
            db.run("INSERT IGNORE INTO satuan (nama_satuan) VALUES (?)", [satuan.trim()]);
        }
        if (nama_produk && nama_produk.trim() !== "") {
            const baseKode = kode_produk ? kode_produk.replace(/-b\d+$/, '') : '';
            db.run(
                "INSERT IGNORE INTO nama_barang (kode, nama, kategori, sub_kategori, satuan, lokasi) VALUES (?, ?, ?, ?, ?, ?)",
                [baseKode, nama_produk.trim(), kategori?.trim() || '', sub_kategori?.trim() || '', satuan?.trim() || '', lokasi?.trim() || '']
            );
        }
    };

    const cleanKode = (kode_produk || "").trim();

    // Setiap input transaksi penerimaan disimpan sebagai baris penerimaan mandiri (per no_penerimaan)
    db.run(
        `
        INSERT INTO barang
        (no_penerimaan, kode_produk, nama_produk, kategori, sub_kategori, satuan, jumlah, tanggal_expired, tanggal_masuk, lokasi, penerima, is_no_expired)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [cleanNoPenerimaan, cleanKode, nama_produk.trim(), kategori || '', sub_kategori || '', satuan || 'Pcs', qtyInt, tglExp, tglMasuk, lokasi || '', penerima || '', req.body.is_no_expired ? 1 : 0],
        function (insErr) {
            if (insErr) {
                return res.status(500).json({ success: false, message: insErr.message });
            }

            syncMasterData();
            return res.status(201).json({
                success: true,
                merged: false,
                message: `Penerimaan barang baru berhasil disimpan (No. Masuk: ${cleanNoPenerimaan}).`
            });
        }
    );
};

// ======================
// Semua Barang
// ======================
// Helper untuk membangun klausa WHERE filter tanggal & pencarian
function applyBarangFilters(baseSql, params, query) {
    const { tgl_dari, tgl_sampai, bulan, kategori, q } = query;
    let sql = baseSql;

    if (tgl_dari && tgl_dari.trim() !== "") {
        sql += ` AND DATE(COALESCE(tanggal_masuk, created_at)) >= ?`;
        params.push(tgl_dari.trim());
    }

    if (tgl_sampai && tgl_sampai.trim() !== "") {
        sql += ` AND DATE(COALESCE(tanggal_masuk, created_at)) <= ?`;
        params.push(tgl_sampai.trim());
    }

    if (bulan && bulan.match(/^\d{4}-\d{2}$/)) {
        sql += ` AND DATE_FORMAT(COALESCE(tanggal_masuk, created_at), '%Y-%m') = ?`;
        params.push(bulan);
    }

    if (kategori && kategori.trim() !== "") {
        sql += ` AND LOWER(kategori) = LOWER(?)`;
        params.push(kategori.trim());
    }

    if (q && q.trim() !== "") {
        const term = `%${q.trim()}%`;
        sql += ` AND (
            kode_produk LIKE ? OR
            nama_produk LIKE ? OR
            kategori LIKE ? OR
            sub_kategori LIKE ? OR
            lokasi LIKE ? OR
            no_penerimaan LIKE ? OR
            penerima LIKE ?
        )`;
        params.push(term, term, term, term, term, term, term);
    }

    return sql;
}

// ======================
// Semua Barang
// ======================
const getSemuaBarang = (req, res) => {
    let sql = `SELECT * FROM barang WHERE is_arsip=0`;
    const params = [];

    sql = applyBarangFilters(sql, params, req.query);
    sql += ` ORDER BY COALESCE(tanggal_masuk, created_at) DESC, tanggal_expired ASC`;

    db.all(sql, params, async (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        const hasil = await attachStokSisaBatch(rows);
        res.json({ success: true, total: hasil.length, data: hasil });
    });
};

// ======================
// Barang Expired
// ======================
const getBarangExpired = (req, res) => {
    let sql = `SELECT * FROM barang WHERE is_arsip=0 AND is_no_expired=0 AND DATE(tanggal_expired) <= DATE(NOW())`;
    const params = [];

    const { tgl_dari_exp, tgl_sampai_exp } = req.query;
    if (tgl_dari_exp && tgl_dari_exp.trim() !== "") {
        sql += ` AND DATE(tanggal_expired) >= ?`;
        params.push(tgl_dari_exp.trim());
    }
    if (tgl_sampai_exp && tgl_sampai_exp.trim() !== "") {
        sql += ` AND DATE(tanggal_expired) <= ?`;
        params.push(tgl_sampai_exp.trim());
    }

    sql = applyBarangFilters(sql, params, req.query);
    sql += ` ORDER BY tanggal_expired ASC`;

    db.all(sql, params, async (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        const hasil = await attachStokSisaBatch(rows);
        res.json({ success: true, total: hasil.length, data: hasil });
    });
};

// ======================
// Data Arsip
// ======================
const getArsip = (req, res) => {
    let sql = `SELECT * FROM barang WHERE is_arsip=1`;
    const params = [];

    sql = applyBarangFilters(sql, params, req.query);
    sql += ` ORDER BY COALESCE(tanggal_masuk, created_at) DESC, updated_at DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        const hasil = rows.map(hitungStatus);
        res.json({ success: true, total: hasil.length, data: hasil });
    });
};

// ======================
// Cari Barang
// ======================
const cariBarang = (req, res) => {
    const q = req.query.q || "";
    let sql = `SELECT * FROM barang WHERE is_arsip=0`;
    const params = [];

    sql = applyBarangFilters(sql, params, req.query);
    sql += ` ORDER BY COALESCE(tanggal_masuk, created_at) DESC, tanggal_expired ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        const hasil = rows.map(hitungStatus);
        res.json({ success: true, total: hasil.length, data: hasil });
    });
};

// ======================
// Ambil Barang Berdasarkan Kode
// ======================
const getBarangByKode = (req, res) => {

    const { kode_produk } = req.params;

    db.get(
        `
        SELECT *
        FROM barang
        WHERE kode_produk = ?
        `,
        [kode_produk],
        (err, row) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: "Barang tidak ditemukan."
                });
            }

            res.json({
                success: true,
                data: hitungStatus(row)
            });

        }
    );

};

// ======================
// Update Barang
// ======================
// ======================
// Update Barang (Single Row ID if targetId is present)
// ======================
const updateBarang = (req, res) => {
    const { kode_produk } = req.params;
    const targetId = req.body.id || (!isNaN(kode_produk) ? parseInt(kode_produk, 10) : null);

    const {
        nama_produk,
        kategori,
        sub_kategori,
        satuan,
        jumlah,
        tanggal_expired,
        tanggal_masuk,
        lokasi,
        penerima
    } = req.body;

    const tglExp = Number(req.body.is_no_expired) === 1 ? "2099-12-31" : normalizeTanggalDB(tanggal_expired);
    const tglMasuk = tanggal_masuk ? normalizeTanggalDB(tanggal_masuk) : null;

    let sql = "";
    let params = [];

    if (targetId) {
        sql = `
            UPDATE barang
            SET
                nama_produk = ?,
                kategori = ?,
                sub_kategori = ?,
                satuan = ?,
                jumlah = ?,
                tanggal_expired = ?,
                tanggal_masuk = COALESCE(?, tanggal_masuk),
                lokasi = ?,
                penerima = ?,
                is_no_expired = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        params = [
            nama_produk,
            kategori,
            sub_kategori || '',
            satuan,
            jumlah,
            tglExp,
            tglMasuk,
            lokasi,
            penerima || '',
            req.body.is_no_expired ? 1 : 0,
            targetId
        ];
    } else {
        sql = `
            UPDATE barang
            SET
                nama_produk = ?,
                kategori = ?,
                sub_kategori = ?,
                satuan = ?,
                jumlah = ?,
                tanggal_expired = ?,
                tanggal_masuk = COALESCE(?, tanggal_masuk),
                lokasi = ?,
                penerima = ?,
                is_no_expired = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE kode_produk = ?
        `;
        params = [
            nama_produk,
            kategori,
            sub_kategori || '',
            satuan,
            jumlah,
            tglExp,
            tglMasuk,
            lokasi,
            penerima || '',
            req.body.is_no_expired ? 1 : 0,
            kode_produk
        ];
    }

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "Barang tidak ditemukan."
            });
        }

        // Registrasi kategori, sub_kategori, lokasi & satuan baru jika belum terdaftar
        if (kategori && kategori.trim() !== "") {
            db.run("INSERT IGNORE INTO kategori (nama_kategori) VALUES (?)", [kategori.trim()], function () {
                if (sub_kategori && sub_kategori.trim() !== "") {
                    db.get("SELECT id FROM kategori WHERE nama_kategori = ?", [kategori.trim()], (err, katRow) => {
                        if (katRow) {
                            db.run("INSERT IGNORE INTO sub_kategori (kategori_id, nama_sub_kategori) VALUES (?, ?)", [katRow.id, sub_kategori.trim()]);
                        }
                    });
                }
            });
        }
        if (lokasi && lokasi.trim() !== "") db.run("INSERT IGNORE INTO lokasi (nama_lokasi) VALUES (?)", [lokasi.trim()]);
        if (satuan && satuan.trim() !== "") db.run("INSERT IGNORE INTO satuan (nama_satuan) VALUES (?)", [satuan.trim()]);
        if (nama_produk && nama_produk.trim() !== "") db.run("INSERT IGNORE INTO nama_barang (nama) VALUES (?)", [nama_produk.trim()]);

        res.json({
            success: true,
            message: "Barang berhasil diperbarui."
        });
    });
};

// ======================
// Hapus Barang (Single Row ID if targetId is present)
// ======================
const hapusBarang = (req, res) => {
    const { kode_produk } = req.params;
    const targetId = !isNaN(kode_produk) ? parseInt(kode_produk, 10) : (req.body && req.body.id);

    const sql = targetId ? `DELETE FROM barang WHERE id = ?` : `DELETE FROM barang WHERE kode_produk = ?`;
    const param = targetId || kode_produk;

    db.run(sql, [param], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Barang tidak ditemukan." });
        }
        res.json({ success: true, message: "Barang berhasil dihapus." });
    });
};

// ======================
// Arsipkan Barang (Single Row ID if targetId is present)
// ======================
const arsipkanBarang = (req, res) => {
    const { kode_produk } = req.params;
    const targetId = !isNaN(kode_produk) ? parseInt(kode_produk, 10) : (req.body && req.body.id);

    const sql = targetId ? `UPDATE barang SET is_arsip = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?` : `UPDATE barang SET is_arsip = 1, updated_at = CURRENT_TIMESTAMP WHERE kode_produk = ?`;
    const param = targetId || kode_produk;

    db.run(sql, [param], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Barang tidak ditemukan." });
        }
        res.json({ success: true, message: "Barang berhasil diarsipkan." });
    });
};

// ======================
// Pulihkan Barang (Single Row ID if targetId is present)
// ======================
const pulihkanBarang = (req, res) => {
    const { kode_produk } = req.params;
    const targetId = !isNaN(kode_produk) ? parseInt(kode_produk, 10) : (req.body && req.body.id);

    const sql = targetId ? `UPDATE barang SET is_arsip = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?` : `UPDATE barang SET is_arsip = 0, updated_at = CURRENT_TIMESTAMP WHERE kode_produk = ?`;
    const param = targetId || kode_produk;

    db.run(sql, [param], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: "Barang tidak ditemukan." });
        }
        res.json({ success: true, message: "Barang berhasil dipulihkan." });
    });
};

// ======================
// Arsipkan Batch Penerimaan (per No. Penerimaan)
// ======================
const arsipkanBatchPenerimaan = (req, res) => {
    const { no_penerimaan } = req.params;
    if (!no_penerimaan) {
        return res.status(400).json({ success: false, message: "No. Penerimaan tidak valid." });
    }

    db.run(
        `UPDATE barang SET is_arsip = 1, updated_at = CURRENT_TIMESTAMP WHERE no_penerimaan = ?`,
        [no_penerimaan],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: `Seluruh transaksi penerimaan "${no_penerimaan}" (${this.changes} item) berhasil diarsipkan.`
            });
        }
    );
};

// ======================
// Pulihkan Batch Penerimaan (per No. Penerimaan)
// ======================
const pulihkanBatchPenerimaan = (req, res) => {
    const { no_penerimaan } = req.params;
    if (!no_penerimaan) {
        return res.status(400).json({ success: false, message: "No. Penerimaan tidak valid." });
    }

    db.run(
        `UPDATE barang SET is_arsip = 0, updated_at = CURRENT_TIMESTAMP WHERE no_penerimaan = ?`,
        [no_penerimaan],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: `Seluruh transaksi penerimaan "${no_penerimaan}" (${this.changes} item) berhasil dipulihkan.`
            });
        }
    );
};

// ======================
// Next No. Penerimaan Otomatis (e.g. IN-20260902-001)
// ======================
const getNextNoPenerimaan = (req, res) => {
    let tgl = req.query.tanggal;
    if (!tgl || !/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        tgl = `${yyyy}-${mm}-${dd}`;
    }

    const cleanDate = tgl.replace(/-/g, ""); // e.g. "20260902"
    const prefix = `IN-${cleanDate}`;

    db.all(
        `SELECT no_penerimaan FROM barang WHERE no_penerimaan LIKE ? ORDER BY no_penerimaan DESC`,
        [`${prefix}-%`],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            let nextNum = 1;
            if (rows && rows.length > 0) {
                const numbers = rows.map(r => {
                    const parts = (r.no_penerimaan || "").split("-");
                    const lastPart = parts[parts.length - 1];
                    return parseInt(lastPart, 10) || 0;
                });
                const maxNum = Math.max(...numbers, 0);
                nextNum = maxNum + 1;
            }

            const noPenerimaan = `${prefix}-${String(nextNum).padStart(3, "0")}`;
            res.json({ success: true, no_penerimaan: noPenerimaan });
        }
    );
};

// ======================
// Batch Penerimaan Barang (Keranjang)
// ======================
// ======================
// Batch Penerimaan Barang (Keranjang)
// ======================
const createBatchPenerimaan = async (req, res) => {
    const { no_penerimaan, penerima, tanggal_masuk, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Keranjang penerimaan kosong." });
    }

    const tglMasuk = normalizeTanggalDB(tanggal_masuk || new Date().toISOString().slice(0, 10));
    const noPenerimaan = no_penerimaan || `IN-${tglMasuk.replace(/-/g, "")}-001`;

    try {
        // 1. Gabungkan item di memori jika ada input barang dengan nama & expired yang sama dalam keranjang
        const mergedMap = new Map();
        for (const rawItem of items) {
            const qtyInt = parseInt(rawItem.jumlah, 10);
            if (!rawItem.nama_produk || isNaN(qtyInt) || qtyInt <= 0) continue;

            const tglExp = Number(rawItem.is_no_expired) === 1 ? "2099-12-31" : normalizeTanggalDB(rawItem.tanggal_expired);
            const key = `${rawItem.nama_produk.trim().toLowerCase()}_${tglExp}`;

            if (mergedMap.has(key)) {
                const existing = mergedMap.get(key);
                existing.jumlah = (parseInt(existing.jumlah, 10) || 0) + qtyInt;
            } else {
                mergedMap.set(key, { ...rawItem, jumlah: qtyInt, tglExp });
            }
        }

        const processedItems = Array.from(mergedMap.values());
        let processedCount = 0;

        for (const item of processedItems) {
            const {
                kode_produk, nama_produk, kategori, sub_kategori,
                satuan, jumlah, lokasi, is_no_expired, tglExp
            } = item;

            const qtyInt = parseInt(jumlah, 10);

            // Setiap produk dalam transaksi penerimaan ini dibuat sebagai baris penerimaan mandiri
            let cleanKode = (kode_produk || "").trim().toUpperCase();
            if (!cleanKode) {
                const initials = nama_produk
                    .split(/\s+/)
                    .map(w => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 4);
                cleanKode = `${initials || "BRG"}-001`;
            }

            // Sync ke master nama_barang
            await new Promise((resolve) => {
                db.run(
                    `INSERT IGNORE INTO nama_barang (kode, nama, kategori, sub_kategori, satuan, lokasi) VALUES (?, ?, ?, ?, ?, ?)`,
                    [cleanKode, nama_produk.trim(), kategori || "", sub_kategori || "", satuan || "Pcs", lokasi || ""],
                    () => resolve()
                );
            });

            // Insert ke tabel barang
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO barang (no_penerimaan, kode_produk, nama_produk, kategori, sub_kategori, satuan, jumlah, tanggal_expired, tanggal_masuk, lokasi, penerima, is_no_expired)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        noPenerimaan, cleanKode, nama_produk.trim(),
                        kategori || "", sub_kategori || "", satuan || "Pcs",
                        qtyInt, tglExp, tglMasuk, lokasi || "",
                        penerima || "", Number(is_no_expired) === 1 ? 1 : 0
                    ],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            // Sync Master Categories/Units/Locations
            if (kategori && kategori.trim() !== "") {
                db.run("INSERT IGNORE INTO kategori (nama_kategori) VALUES (?)", [kategori.trim()], function () {
                    if (sub_kategori && sub_kategori.trim() !== "") {
                        db.get("SELECT id FROM kategori WHERE nama_kategori = ?", [kategori.trim()], (err, katRow) => {
                            if (katRow) {
                                db.run("INSERT IGNORE INTO sub_kategori (kategori_id, nama_sub_kategori) VALUES (?, ?)", [katRow.id, sub_kategori.trim()]);
                            }
                        });
                    }
                });
            }
            if (lokasi && lokasi.trim() !== "") {
                db.run("INSERT IGNORE INTO lokasi (nama_lokasi) VALUES (?)", [lokasi.trim()]);
            }
            if (satuan && satuan.trim() !== "") {
                db.run("INSERT IGNORE INTO satuan (nama_satuan) VALUES (?)", [satuan.trim()]);
            }

            processedCount++;
        }

        res.status(201).json({
            success: true,
            message: `Berhasil menyimpan penerimaan barang (${processedCount} produk, No. Masuk: ${noPenerimaan}).`,
            no_penerimaan: noPenerimaan
        });
    } catch (err) {
        console.error("Gagal simpan batch penerimaan:", err);
        res.status(500).json({ success: false, message: err.message || "Gagal menyimpan penerimaan barang." });
    }
};

// ======================
// Get Barang by No. Penerimaan
// ======================
const getBarangByNoPenerimaan = (req, res) => {
    const { no_penerimaan } = req.params;
    if (!no_penerimaan) {
        return res.status(400).json({ success: false, message: "No. Penerimaan tidak valid." });
    }

    db.all(
        `SELECT * FROM barang WHERE no_penerimaan = ? AND is_arsip = 0 ORDER BY created_at ASC`,
        [no_penerimaan],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            const hasil = (rows || []).map(hitungStatus);
            res.json({ success: true, data: hasil });
        }
    );
};

// ======================
// Update Batch Penerimaan Barang (Edit Sesi Penerimaan)
// ======================
const updateBatchPenerimaan = async (req, res) => {
    const { no_penerimaan } = req.params;
    const { penerima, tanggal_masuk, items, deletedItems } = req.body;

    if (!items || !Array.isArray(items)) {
        return res.status(400).json({ success: false, message: "Data items penerimaan tidak valid." });
    }

    const tglMasuk = normalizeTanggalDB(tanggal_masuk || new Date().toISOString().slice(0, 10));

    try {
        // 1. Hapus item yang dibuang dari keranjang saat edit (spesifik per id atau per no_penerimaan + kode_produk)
        if (deletedItems && Array.isArray(deletedItems) && deletedItems.length > 0) {
            for (const itemToDelete of deletedItems) {
                const targetId = itemToDelete?.id;
                const kode = typeof itemToDelete === 'string' ? itemToDelete : itemToDelete.kode_produk;

                if (targetId) {
                    await new Promise((resolve, reject) => {
                        db.run(`DELETE FROM barang WHERE id = ? AND no_penerimaan = ?`, [targetId, no_penerimaan], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                } else if (kode) {
                    await new Promise((resolve, reject) => {
                        db.run(`DELETE FROM barang WHERE kode_produk = ? AND no_penerimaan = ?`, [kode, no_penerimaan], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            }
        }

        // 2. Loop setiap item: update jika item lama (isExisting / id), insert jika item baru
        for (const item of items) {
            const {
                id, kode_produk, nama_produk, kategori, sub_kategori,
                satuan, jumlah, tanggal_expired, lokasi, is_no_expired, isExisting
            } = item;

            const qtyInt = parseInt(jumlah, 10);
            if (!nama_produk || isNaN(qtyInt) || qtyInt <= 0) continue;

            const tglExp = Number(is_no_expired) === 1 ? "2099-12-31" : normalizeTanggalDB(tanggal_expired);

            if ((isExisting || id) && (id || kode_produk)) {
                // Update HANYA baris spesifik ini (by id jika ada, atau by no_penerimaan & kode_produk)
                let updateSql = id
                    ? `UPDATE barang SET nama_produk = ?, kategori = ?, sub_kategori = ?, satuan = ?, jumlah = ?, tanggal_expired = ?, tanggal_masuk = ?, lokasi = ?, penerima = ?, is_no_expired = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
                    : `UPDATE barang SET nama_produk = ?, kategori = ?, sub_kategori = ?, satuan = ?, jumlah = ?, tanggal_expired = ?, tanggal_masuk = ?, lokasi = ?, penerima = ?, is_no_expired = ?, updated_at = CURRENT_TIMESTAMP WHERE no_penerimaan = ? AND kode_produk = ?`;
                let updateParams = id
                    ? [nama_produk.trim(), kategori || "", sub_kategori || "", satuan || "Pcs", qtyInt, tglExp, tglMasuk, lokasi || "", penerima || "", Number(is_no_expired) === 1 ? 1 : 0, id]
                    : [nama_produk.trim(), kategori || "", sub_kategori || "", satuan || "Pcs", qtyInt, tglExp, tglMasuk, lokasi || "", penerima || "", Number(is_no_expired) === 1 ? 1 : 0, no_penerimaan, kode_produk];

                await new Promise((resolve, reject) => {
                    db.run(updateSql, updateParams, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            } else {
                let cleanKode = (kode_produk || "").trim().toUpperCase();
                if (!cleanKode) {
                    const initials = nama_produk
                        .split(/\s+/)
                        .map(w => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 4);
                    cleanKode = `${initials || "BRG"}-001`;
                }

                // Sync ke master nama_barang
                await new Promise((resolve) => {
                    db.run(
                        `INSERT IGNORE INTO nama_barang (kode, nama, kategori, sub_kategori, satuan, lokasi) VALUES (?, ?, ?, ?, ?, ?)`,
                        [cleanKode, nama_produk.trim(), kategori || "", sub_kategori || "", satuan || "Pcs", lokasi || ""],
                        () => resolve()
                    );
                });

                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO barang (no_penerimaan, kode_produk, nama_produk, kategori, sub_kategori, satuan, jumlah, tanggal_expired, tanggal_masuk, lokasi, penerima, is_no_expired)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            no_penerimaan, cleanKode, nama_produk.trim(),
                            kategori || "", sub_kategori || "", satuan || "Pcs",
                            qtyInt, tglExp, tglMasuk, lokasi || "",
                            penerima || "", Number(is_no_expired) === 1 ? 1 : 0
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }

            // Sync master data
            if (kategori && kategori.trim() !== "") {
                db.run("INSERT IGNORE INTO kategori (nama_kategori) VALUES (?)", [kategori.trim()], function () {
                    if (sub_kategori && sub_kategori.trim() !== "") {
                        db.get("SELECT id FROM kategori WHERE nama_kategori = ?", [kategori.trim()], (err, katRow) => {
                            if (katRow) {
                                db.run("INSERT IGNORE INTO sub_kategori (kategori_id, nama_sub_kategori) VALUES (?, ?)", [katRow.id, sub_kategori.trim()]);
                            }
                        });
                    }
                });
            }
            if (lokasi && lokasi.trim() !== "") {
                db.run("INSERT IGNORE INTO lokasi (nama_lokasi) VALUES (?)", [lokasi.trim()]);
            }
            if (satuan && satuan.trim() !== "") {
                db.run("INSERT IGNORE INTO satuan (nama_satuan) VALUES (?)", [satuan.trim()]);
            }
        }

        res.json({
            success: true,
            message: `Berhasil memperbarui transaksi penerimaan (No. Masuk: ${no_penerimaan}).`
        });
    } catch (err) {
        console.error("Gagal update batch penerimaan:", err);
        res.status(500).json({ success: false, message: err.message || "Gagal memperbarui penerimaan barang." });
    }
};

// ======================
// Get Kartu Stok (Mutasi Inbound & Outbound Kronologis)
// ======================
const getKartuStok = async (req, res) => {
    const { kode_produk, tgl_dari, tgl_sampai, kategori, q } = req.query;

    try {
        const saldoAwalByKode = {};
        let totalSaldoAwal = 0;

        // 1. Hitung Saldo Awal per kode_produk jika ada filter tgl_dari
        if (tgl_dari && tgl_dari.trim() !== "") {
            let sqlPrevInbound = `
                SELECT kode_produk, COALESCE(SUM(jumlah), 0) AS total_in 
                FROM barang 
                WHERE is_arsip = 0 AND COALESCE(tanggal_masuk, DATE(created_at)) < ?
            `;
            const paramsPrevIn = [tgl_dari.trim()];

            let sqlPrevOutbound = `
                SELECT kode_produk, COALESCE(SUM(jumlah), 0) AS total_out 
                FROM pemakaian 
                WHERE tanggal_pemakaian < ?
            `;
            const paramsPrevOut = [tgl_dari.trim()];

            if (kode_produk && kode_produk.trim() !== "") {
                sqlPrevInbound += ` AND kode_produk = ?`;
                paramsPrevIn.push(kode_produk.trim());

                sqlPrevOutbound += ` AND kode_produk = ?`;
                paramsPrevOut.push(kode_produk.trim());
            }

            if (kategori && kategori.trim() !== "" && kategori !== "Semua") {
                sqlPrevInbound += ` AND LOWER(kategori) = LOWER(?)`;
                paramsPrevIn.push(kategori.trim());

                sqlPrevOutbound += ` AND LOWER(kategori) = LOWER(?)`;
                paramsPrevOut.push(kategori.trim());
            }

            sqlPrevInbound += ` GROUP BY kode_produk`;
            sqlPrevOutbound += ` GROUP BY kode_produk`;

            const prevInRows = await new Promise(resolve => db.all(sqlPrevInbound, paramsPrevIn, (e, r) => resolve(r || [])));
            const prevOutRows = await new Promise(resolve => db.all(sqlPrevOutbound, paramsPrevOut, (e, r) => resolve(r || [])));

            prevInRows.forEach(r => {
                const k = r.kode_produk || 'GENERAL';
                saldoAwalByKode[k] = (saldoAwalByKode[k] || 0) + (Number(r.total_in) || 0);
            });

            prevOutRows.forEach(r => {
                const k = r.kode_produk || 'GENERAL';
                saldoAwalByKode[k] = (saldoAwalByKode[k] || 0) - (Number(r.total_out) || 0);
            });

            Object.keys(saldoAwalByKode).forEach(k => {
                saldoAwalByKode[k] = Math.max(0, saldoAwalByKode[k]);
                totalSaldoAwal += saldoAwalByKode[k];
            });
        }

        // 2. Query transaksi mutasi dalam rentang tanggal
        let sqlInbound = `
            SELECT 
                id, 
                'MASUK' AS jenis, 
                no_penerimaan AS no_ref, 
                kode_produk, 
                nama_produk, 
                kategori, 
                sub_kategori, 
                satuan, 
                jumlah AS qty_masuk, 
                0 AS qty_keluar, 
                COALESCE(tanggal_masuk, DATE(created_at)) AS tanggal, 
                lokasi, 
                COALESCE(penerima, 'Penerimaan Barang') AS keterangan, 
                created_at
            FROM barang
            WHERE is_arsip = 0
        `;

        let sqlOutbound = `
            SELECT 
                id, 
                'KELUAR' AS jenis, 
                COALESCE(no_order, '-') AS no_ref, 
                kode_produk, 
                nama_produk, 
                '' AS kategori, 
                '' AS sub_kategori, 
                'Pcs' AS satuan, 
                0 AS qty_masuk, 
                jumlah AS qty_keluar, 
                tanggal_pemakaian AS tanggal, 
                '' AS lokasi, 
                CONCAT(COALESCE(penerima, ''), ' - ', COALESCE(keterangan, '')) AS keterangan, 
                created_at
            FROM pemakaian
            WHERE 1=1
        `;

        const paramsInbound = [];
        const paramsOutbound = [];

        if (kode_produk && kode_produk.trim() !== "") {
            sqlInbound += ` AND kode_produk = ?`;
            paramsInbound.push(kode_produk.trim());

            sqlOutbound += ` AND kode_produk = ?`;
            paramsOutbound.push(kode_produk.trim());
        }

        if (kategori && kategori.trim() !== "" && kategori !== "Semua") {
            sqlInbound += ` AND LOWER(kategori) = LOWER(?)`;
            paramsInbound.push(kategori.trim());

            sqlOutbound += ` AND LOWER(kategori) = LOWER(?)`;
            paramsOutbound.push(kategori.trim());
        }

        if (q && q.trim() !== "") {
            const term = `%${q.trim()}%`;
            sqlInbound += ` AND (kode_produk LIKE ? OR nama_produk LIKE ? OR lokasi LIKE ?)`;
            paramsInbound.push(term, term, term);

            sqlOutbound += ` AND (kode_produk LIKE ? OR nama_produk LIKE ? OR lokasi_pemakaian LIKE ?)`;
            paramsOutbound.push(term, term, term);
        }

        if (tgl_dari && tgl_dari.trim() !== "") {
            sqlInbound += ` AND COALESCE(tanggal_masuk, DATE(created_at)) >= ?`;
            paramsInbound.push(tgl_dari.trim());

            sqlOutbound += ` AND tanggal_pemakaian >= ?`;
            paramsOutbound.push(tgl_dari.trim());
        }

        if (tgl_sampai && tgl_sampai.trim() !== "") {
            sqlInbound += ` AND COALESCE(tanggal_masuk, DATE(created_at)) <= ?`;
            paramsInbound.push(tgl_sampai.trim());

            sqlOutbound += ` AND tanggal_pemakaian <= ?`;
            paramsOutbound.push(tgl_sampai.trim());
        }

        const fullSql = `
            SELECT * FROM (
                ${sqlInbound}
                UNION ALL
                ${sqlOutbound}
            ) AS mutasi
            ORDER BY tanggal ASC, created_at ASC, id ASC
        `;

        const allParams = [...paramsInbound, ...paramsOutbound];

        db.all(fullSql, allParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            const runningBalances = { ...saldoAwalByKode };
            let totalMasuk = 0;
            let totalKeluar = 0;

            const resultList = [];

            // Sisipkan baris Saldo Awal jika ada filter tanggal atau totalSaldoAwal > 0
            if (tgl_dari && tgl_dari.trim() !== "") {
                resultList.push({
                    id: 0,
                    jenis: "SALDO_AWAL",
                    no_ref: "SALDO-AWAL",
                    kode_produk: kode_produk || "-",
                    nama_produk: "🏁 SALDO AWAL (Stok Bawaan Sebelum Periode)",
                    kategori: kategori || "-",
                    sub_kategori: "",
                    satuan: "Unit",
                    qty_masuk: 0,
                    qty_keluar: 0,
                    tanggal: tgl_dari,
                    lokasi: "Gudang Utama",
                    keterangan: `Sisa stok komulatif sebelum tanggal ${tgl_dari}`,
                    saldo_sisa: totalSaldoAwal
                });
            }

            (rows || []).forEach((item) => {
                const k = item.kode_produk || 'GENERAL';
                if (runningBalances[k] === undefined) {
                    runningBalances[k] = 0;
                }
                const prevBal = runningBalances[k];
                const inQty = Number(item.qty_masuk) || 0;
                const outQty = Number(item.qty_keluar) || 0;

                totalMasuk += inQty;
                totalKeluar += outQty;
                runningBalances[k] = (runningBalances[k] || 0) + inQty - outQty;

                resultList.push({
                    ...item,
                    qty_masuk: inQty,
                    qty_keluar: outQty,
                    saldo_sisa: Math.max(0, runningBalances[k])
                });
            });

            const totalSaldoAkhir = Object.values(runningBalances).reduce((a, b) => a + Math.max(0, b), 0);

            res.json({
                success: true,
                summary: {
                    saldo_awal: totalSaldoAwal,
                    total_masuk: totalMasuk,
                    total_keluar: totalKeluar,
                    saldo_akhir: totalSaldoAkhir,
                    total_transaksi: resultList.length
                },
                data: resultList
            });
        });
    } catch (error) {
        console.error("Gagal mendapatkan kartu stok:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ======================
// Export
// ======================
module.exports = {
    tambahBarang,
    getSemuaBarang,
    getBarangExpired,
    getArsip,
    cariBarang,
    getBarangByKode,
    updateBarang,
    hapusBarang,
    arsipkanBarang,
    pulihkanBarang,
    getNextNoPenerimaan,
    createBatchPenerimaan,
    getBarangByNoPenerimaan,
    updateBatchPenerimaan,
    arsipkanBatchPenerimaan,
    pulihkanBatchPenerimaan,
    getKartuStok
};