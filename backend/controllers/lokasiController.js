const db = require("../db");

// Ambil semua lokasi
const getLokasi = (req, res) => {
    db.all("SELECT * FROM lokasi ORDER BY nama_lokasi ASC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
};

// Tambah lokasi baru
const createLokasi = (req, res) => {
    const { nama_lokasi } = req.body;
    if (!nama_lokasi || nama_lokasi.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama lokasi wajib diisi." });
    }

    db.run(
        "INSERT INTO lokasi (nama_lokasi) VALUES (?)",
        [nama_lokasi.trim()],
        function (err) {
            if (err) {
                if (err.message.includes("UNIQUE")) {
                    return res.status(400).json({ success: false, message: "Lokasi sudah terdaftar." });
                }
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: "Lokasi berhasil ditambahkan.",
                data: { id: this.lastID, nama_lokasi: nama_lokasi.trim() }
            });
        }
    );
};

// Hapus lokasi
const deleteLokasi = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM lokasi WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, message: "Lokasi berhasil dihapus." });
    });
};

module.exports = {
    getLokasi,
    createLokasi,
    deleteLokasi
};
