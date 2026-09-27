const db = require("../db");

// Default Fallback Settings
const DEFAULT_SETTINGS = {
    // Expired Thresholds
    threshold_kritis: "30",
    threshold_diperhatikan: "60",

    // Expired Labels
    label_expired: "Expired",
    label_kritis: "Segera Expired",
    label_diperhatikan: "Diperhatikan",
    label_aman: "Aman",
    label_non_expired: "Non-Expired (5 Thn)",

    // Expired Colors (HEX)
    color_expired: "#dc3545",
    color_kritis: "#ffc107",
    color_diperhatikan: "#fd7e14",
    color_aman: "#198754",
    color_non_expired: "#0dcaf0",

    // Kontrol Cetak / Print Pemakaian Barang
    print_kop_1: "SEKRETARIAT PRESIDEN",
    print_kop_2: "ISTANA KEPRESIDENAN YOGYAKARTA",
    print_judul_dokumen: "BON BARANG",
    print_font_size: "12px",
    print_space_signature: "50px",
    print_label_ttd_kiri: "Penerima",
    print_label_ttd_kanan: "Petugas Persediaan",
    print_nama_petugas: "",
    print_nip_petugas: "",
    print_show_line: "1",
    print_catatan_kaki: "",

    // Instansi & Laporan
    nama_instansi: "Gedung Agung",
    sub_instansi: "Istana Kepresidenan Yogyakarta",
    alamat_instansi: "Jl. Ahmad Yani No. 3, Ngupasan, Gondomanan, Kota Yogyakarta",
    nama_penanggung_jawab: "Budi Santoso, S.STP",
    nip_penanggung_jawab: "19850315 200801 1 002",
    jabatan_penanggung_jawab: "Kepala Subbagian Rumah Tangga & Perlengkapan",
    prefix_no_penerimaan: "MASUK"
};

// GET /api/settings
exports.getSettings = (req, res) => {
    db.all("SELECT key_name, value_text FROM pengaturan", [], (err, rows) => {
        if (err) {
            console.error("Gagal mengambil pengaturan:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }

        const settings = { ...DEFAULT_SETTINGS };
        if (rows && rows.length > 0) {
            rows.forEach(r => {
                settings[r.key_name] = r.value_text;
            });
        }

        return res.json({ success: true, data: settings });
    });
};

// POST /api/settings
exports.updateSettings = (req, res) => {
    const payload = req.body || {};
    const entries = Object.entries(payload);

    if (entries.length === 0) {
        return res.status(400).json({ success: false, message: "Payload tidak boleh kosong." });
    }

    let completed = 0;
    let hasError = false;

    entries.forEach(([key, val]) => {
        const valStr = String(val !== undefined && val !== null ? val : "");
        const sql = `
            INSERT INTO pengaturan (key_name, value_text)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)
        `;
        db.run(sql, [key, valStr], (err) => {
            if (err) {
                console.error(`Gagal menyimpan key ${key}:`, err.message);
                hasError = true;
            }
            completed++;
            if (completed === entries.length) {
                if (hasError) {
                    return res.status(500).json({ success: false, message: "Gagal menyimpan sebagian konfigurasi." });
                }
                return res.json({ success: true, message: "Konfigurasi berhasil disimpan." });
            }
        });
    });
};
