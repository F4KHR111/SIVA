const db = require("../db");

// Ambil semua kategori
const getKategori = (req, res) => {
    db.all("SELECT * FROM kategori ORDER BY nama_kategori ASC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
};

// Tambah kategori baru
const createKategori = (req, res) => {
    const { nama_kategori } = req.body;
    if (!nama_kategori || nama_kategori.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama kategori wajib diisi." });
    }

    db.run(
        "INSERT INTO kategori (nama_kategori) VALUES (?)",
        [nama_kategori.trim()],
        function (err) {
            if (err) {
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ success: false, message: "Kategori sudah terdaftar." });
                }
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: "Kategori berhasil ditambahkan.",
                data: { id: this.lastID, nama_kategori: nama_kategori.trim() }
            });
        }
    );
};

// Hapus kategori (sekaligus hapus sub kategori terkait)
const deleteKategori = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM sub_kategori WHERE kategori_id = ?", [id], () => {
        db.run("DELETE FROM kategori WHERE id = ?", [id], function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: "Kategori berhasil dihapus." });
        });
    });
};

// ======================
// Sub Kategori Handlers
// ======================
const getSubKategori = (req, res) => {
    const { kategori_id, kategori } = req.query;

    let sql = `
        SELECT sk.*, k.nama_kategori 
        FROM sub_kategori sk 
        JOIN kategori k ON sk.kategori_id = k.id 
    `;
    const params = [];

    if (kategori_id) {
        sql += ` WHERE sk.kategori_id = ?`;
        params.push(kategori_id);
    } else if (kategori) {
        sql += ` WHERE k.nama_kategori = ?`;
        params.push(kategori);
    }

    sql += ` ORDER BY k.nama_kategori ASC, sk.nama_sub_kategori ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
};

const createSubKategori = (req, res) => {
    const { kategori_id, nama_kategori, nama_sub_kategori } = req.body;

    if (!nama_sub_kategori || nama_sub_kategori.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama sub kategori wajib diisi." });
    }

    const processInsert = (katId) => {
        db.run(
            "INSERT INTO sub_kategori (kategori_id, nama_sub_kategori) VALUES (?, ?)",
            [katId, nama_sub_kategori.trim()],
            function (err) {
                if (err) {
                    if (err.message.includes("UNIQUE")) {
                        return res.status(400).json({ success: false, message: "Sub kategori ini sudah terdaftar." });
                    }
                    return res.status(500).json({ success: false, message: err.message });
                }
                res.json({
                    success: true,
                    message: "Sub kategori berhasil ditambahkan.",
                    data: { id: this.lastID, kategori_id: katId, nama_sub_kategori: nama_sub_kategori.trim() }
                });
            }
        );
    };

    if (kategori_id) {
        processInsert(kategori_id);
    } else if (nama_kategori && nama_kategori.trim() !== "") {
        db.get("SELECT id FROM kategori WHERE nama_kategori = ?", [nama_kategori.trim()], (err, row) => {
            if (row) {
                processInsert(row.id);
            } else {
                db.run("INSERT INTO kategori (nama_kategori) VALUES (?)", [nama_kategori.trim()], function (insErr) {
                    if (insErr) return res.status(500).json({ success: false, message: insErr.message });
                    processInsert(this.lastID);
                });
            }
        });
    } else {
        return res.status(400).json({ success: false, message: "Kategori utama wajib dipilih." });
    }
};

const deleteSubKategori = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM sub_kategori WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: "Sub kategori berhasil dihapus." });
    });
};

module.exports = {
    getKategori,
    createKategori,
    deleteKategori,
    getSubKategori,
    createSubKategori,
    deleteSubKategori
};
