const db = require("../db");

// Ambil semua satuan
const getSatuan = (req, res) => {
    db.all("SELECT * FROM satuan ORDER BY nama_satuan ASC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
};

// Tambah satuan baru
const createSatuan = (req, res) => {
    const { nama_satuan } = req.body;
    if (!nama_satuan || nama_satuan.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama satuan wajib diisi." });
    }

    db.run(
        "INSERT INTO satuan (nama_satuan) VALUES (?)",
        [nama_satuan.trim()],
        function (err) {
            if (err) {
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ success: false, message: "Satuan sudah terdaftar." });
                }
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: "Satuan berhasil ditambahkan.",
                data: { id: this.lastID, nama_satuan: nama_satuan.trim() }
            });
        }
    );
};

// Hapus satuan
const deleteSatuan = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM satuan WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: "Satuan berhasil dihapus." });
    });
};

module.exports = {
    getSatuan,
    createSatuan,
    deleteSatuan
};
