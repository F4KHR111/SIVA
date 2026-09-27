const db = require("../db");

// Helper normalisasi tanggal
const normalizeTanggalDB = (tgl) => {
    if (!tgl) return new Date().toISOString().slice(0, 10);
    if (tgl.includes("T")) return tgl.split("T")[0];
    return tgl.trim();
};

// Helper generate No Order otomatis: OUT-YYYYMMDD-001
const generateNoOrderHelper = (tglPemakaian) => {
    const cleanDate = (tglPemakaian || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
    const prefix = `OUT-${cleanDate}-`;

    return new Promise((resolve, reject) => {
        db.all(
            `SELECT DISTINCT no_order FROM pemakaian WHERE no_order LIKE ?`,
            [`${prefix}%`],
            (err, rows) => {
                if (err) return reject(err);
                const count = rows ? rows.length : 0;
                const nextSeq = String(count + 1).padStart(3, "0");
                resolve(`${prefix}${nextSeq}`);
            }
        );
    });
};

// Endpoint API untuk mendapatkan No. Order Otomatis berikutnya
const getNextNoOrder = async (req, res) => {
    try {
        const tgl = req.query.tanggal || new Date().toISOString().slice(0, 10);
        const nextNoOrder = await generateNoOrderHelper(tgl);
        res.json({ success: true, no_order: nextNoOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Ambil semua data pemakaian barang
const getPemakaian = (req, res) => {
    const { bulan, tgl_dari, tgl_sampai, q, kode_produk, kategori, sort } = req.query;
    let sql = `
        SELECT 
            p.id,
            p.no_order,
            p.kode_produk,
            p.nama_produk,
            p.jumlah,
            p.tanggal_pemakaian,
            p.penerima,
            p.keterangan,
            p.created_at,
            COALESCE(b.kategori, nb.kategori, 'Umum') AS kategori,
            COALESCE(b.sub_kategori, nb.sub_kategori, '') AS sub_kategori,
            COALESCE(b.satuan, nb.satuan, 'Unit') AS satuan
        FROM pemakaian p
        LEFT JOIN (
            SELECT nama_produk, MAX(kategori) AS kategori, MAX(sub_kategori) AS sub_kategori, MAX(satuan) AS satuan 
            FROM barang 
            GROUP BY nama_produk
        ) b ON p.nama_produk = b.nama_produk
        LEFT JOIN nama_barang nb ON (p.kode_produk = nb.kode OR p.nama_produk = nb.nama)
        WHERE 1=1
    `;
    const params = [];

    if (tgl_dari && tgl_dari.trim() !== "") {
        sql += ` AND DATE(COALESCE(p.tanggal_pemakaian, p.created_at)) >= ?`;
        params.push(tgl_dari.trim());
    }

    if (tgl_sampai && tgl_sampai.trim() !== "") {
        sql += ` AND DATE(COALESCE(p.tanggal_pemakaian, p.created_at)) <= ?`;
        params.push(tgl_sampai.trim());
    }

    if (bulan && bulan.match(/^\d{4}-\d{2}$/)) {
        sql += ` AND DATE_FORMAT(COALESCE(p.tanggal_pemakaian, p.created_at), '%Y-%m') = ?`;
        params.push(bulan);
    }

    if (kode_produk && kode_produk.trim() !== "") {
        sql += ` AND p.kode_produk = ?`;
        params.push(kode_produk.trim());
    }

    if (kategori && kategori.trim() !== "") {
        sql += ` AND (b.kategori = ? OR nb.kategori = ?)`;
        params.push(kategori.trim(), kategori.trim());
    }

    if (q && q.trim() !== "") {
        const term = `%${q.trim()}%`;
        sql += ` AND (
            p.no_order LIKE ? OR
            p.kode_produk LIKE ? OR
            p.nama_produk LIKE ? OR
            p.penerima LIKE ? OR
            p.keterangan LIKE ? OR
            b.kategori LIKE ? OR
            nb.kategori LIKE ?
        )`;
        params.push(term, term, term, term, term, term, term);
    }

    const sortDir = (sort === "terlama") ? "ASC" : "DESC";
    sql += ` ORDER BY COALESCE(p.tanggal_pemakaian, p.created_at) ${sortDir}, p.id ${sortDir}`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, total: rows.length, data: rows });
    });
};

// Tambah/Update Batch Transaksi Pemakaian Barang
const tambahPemakaian = async (req, res) => {
    const { items, no_order, is_edit, kode_produk, nama_produk, jumlah, tanggal_pemakaian, penerima, keterangan } = req.body;

    const list = (Array.isArray(items) && items.length > 0)
        ? items
        : [{ kode_produk, nama_produk, jumlah, keterangan }];

    if (!penerima || penerima.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama penerima / pemakai wajib dipilih." });
    }

    const tglPemakaian = normalizeTanggalDB(tanggal_pemakaian);

    let targetNoOrder = no_order;
    if (!targetNoOrder || targetNoOrder.trim() === "") {
        targetNoOrder = await generateNoOrderHelper(tglPemakaian);
    } else {
        targetNoOrder = targetNoOrder.trim();
    }

    try {
        if (is_edit && targetNoOrder) {
            await new Promise((resolve) => {
                db.run("DELETE FROM pemakaian WHERE no_order = ?", [targetNoOrder], () => resolve());
            });
        }

        let processCount = 0;

        for (const item of list) {
            const qtyKeluar = parseInt(item.jumlah, 10) || 0;
            if (!item.nama_produk || qtyKeluar <= 0) continue;

            // Hitung Total Masuk vs Total Dipakai saat ini
            const totalMasukRow = await new Promise((resolve, reject) => {
                db.get(
                    "SELECT COALESCE(SUM(jumlah), 0) AS total FROM barang WHERE nama_produk = ? AND is_arsip = 0",
                    [item.nama_produk],
                    (err, r) => err ? reject(err) : resolve(r)
                );
            });

            const totalDipakaiRow = await new Promise((resolve, reject) => {
                db.get(
                    "SELECT COALESCE(SUM(jumlah), 0) AS total FROM pemakaian WHERE nama_produk = ?",
                    [item.nama_produk],
                    (err, r) => err ? reject(err) : resolve(r)
                );
            });

            const totalMasuk = totalMasukRow ? totalMasukRow.total : 0;
            const totalDipakai = totalDipakaiRow ? totalDipakaiRow.total : 0;
            const stokTersedia = Math.max(0, totalMasuk - totalDipakai);

            if (stokTersedia < qtyKeluar) {
                return res.status(400).json({
                    success: false,
                    message: `Stok produk "${item.nama_produk}" tidak mencukupi (${stokTersedia} unit tersedia).`
                });
            }

            // Ambil kode produk utama
            const mainKodeRow = await new Promise((resolve, reject) => {
                db.get(
                    "SELECT kode_produk FROM barang WHERE nama_produk = ? AND is_arsip = 0 LIMIT 1",
                    [item.nama_produk],
                    (err, r) => err ? reject(err) : resolve(r)
                );
            });

            const mainKode = item.kode_produk || (mainKodeRow ? mainKodeRow.kode_produk : "");

            // Insert catatan pemakaian barang (Penerimaan Barang TETAP UTUH sebagai bukti penerimaan)
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO pemakaian (no_order, kode_produk, nama_produk, jumlah, tanggal_pemakaian, penerima, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [targetNoOrder, mainKode, item.nama_produk, qtyKeluar, tglPemakaian, penerima.trim(), item.keterangan || keterangan || ''],
                    (err) => err ? reject(err) : resolve()
                );
            });

            processCount++;
        }

        res.json({
            success: true,
            no_order: targetNoOrder,
            message: `Berhasil menyimpan pemakaian ${processCount} produk (${targetNoOrder}) untuk penerima "${penerima}".`
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update single transaksi pemakaian barang
const updatePemakaian = async (req, res) => {
    const { id } = req.params;
    const { kode_produk, nama_produk, jumlah, penerima, tanggal_pemakaian, keterangan } = req.body;

    db.get("SELECT * FROM pemakaian WHERE id = ?", [id], async (err, oldRow) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!oldRow) return res.status(404).json({ success: false, message: "Data pemakaian tidak ditemukan." });

        const targetNamaBarang = (nama_produk || oldRow.nama_produk).trim();
        const newJumlah = parseInt(jumlah, 10);
        const newPenerima = (penerima || oldRow.penerima).trim();
        const newTanggal = normalizeTanggalDB(tanggal_pemakaian || oldRow.tanggal_pemakaian);
        const newKeterangan = (keterangan !== undefined) ? keterangan : oldRow.keterangan;

        if (isNaN(newJumlah) || newJumlah <= 0) {
            return res.status(400).json({ success: false, message: "Jumlah pemakaian harus lebih dari 0." });
        }

        // Cek stok untuk target produk baru / produk lama
        const totalMasukRow = await new Promise(res => db.get("SELECT COALESCE(SUM(jumlah), 0) AS total FROM barang WHERE nama_produk = ? AND is_arsip = 0", [targetNamaBarang], (e, r) => res(r)));
        const totalDipakaiRow = await new Promise(res => db.get("SELECT COALESCE(SUM(jumlah), 0) AS total FROM pemakaian WHERE nama_produk = ?", [targetNamaBarang], (e, r) => res(r)));

        const totalMasuk = totalMasukRow ? totalMasukRow.total : 0;
        let totalDipakai = totalDipakaiRow ? totalDipakaiRow.total : 0;

        if (targetNamaBarang === oldRow.nama_produk) {
            totalDipakai -= oldRow.jumlah;
        }

        const stokTersedia = Math.max(0, totalMasuk - totalDipakai);

        if (stokTersedia < newJumlah) {
            return res.status(400).json({
                success: false,
                message: `Stok produk "${targetNamaBarang}" tidak mencukupi untuk ${newJumlah} unit (${stokTersedia} unit tersedia).`
            });
        }

        let targetKode = kode_produk || oldRow.kode_produk;
        if (!targetKode || targetNamaBarang !== oldRow.nama_produk) {
            const bRow = await new Promise(res => db.get("SELECT kode_produk FROM barang WHERE nama_produk = ? LIMIT 1", [targetNamaBarang], (e, r) => res(r)));
            if (bRow && bRow.kode_produk) targetKode = bRow.kode_produk;
        }

        db.run(
            `UPDATE pemakaian SET kode_produk = ?, nama_produk = ?, jumlah = ?, penerima = ?, tanggal_pemakaian = ?, keterangan = ? WHERE id = ?`,
            [targetKode, targetNamaBarang, newJumlah, newPenerima, newTanggal, newKeterangan, id],
            function (uErr) {
                if (uErr) return res.status(500).json({ success: false, message: uErr.message });
                res.json({ success: true, message: "Data pemakaian berhasil diperbarui." });
            }
        );
    });
};

// Hapus/Batal transaksi pemakaian
const hapusPemakaian = (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM pemakaian WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!row) return res.status(404).json({ success: false, message: "Data pemakaian tidak ditemukan." });

        db.run("DELETE FROM pemakaian WHERE id = ?", [id], function (dErr) {
            if (dErr) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: "Transaksi pemakaian berhasil dibatalkan." });
        });
    });
};

module.exports = { getPemakaian, getNextNoOrder, tambahPemakaian, updatePemakaian, hapusPemakaian };
