const db = require("../db");

// Daftar nama bulan Indonesia untuk parsing
const BULAN_INDO = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4,
    "mei": 5, "juni": 6, "juli": 7, "agustus": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "ags": 8, "agu": 8, "aug": 8,
    "sep": 9, "okt": 10, "oct": 10, "nov": 11, "des": 12, "dec": 12
};

// Helper: normalisasi tanggal parsial
function normalizeTanggal(raw) {
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

const getDashboard = (req, res) => {
    const dashboard = {
        total_barang: 0,
        expired: 0,
        warning: 0,
        aman: 0
    };

    db.all("SELECT id, nama_produk, jumlah, tanggal_expired, is_no_expired FROM barang WHERE is_arsip = 0", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        db.all("SELECT nama_produk, SUM(jumlah) AS total_pakai FROM pemakaian GROUP BY nama_produk", [], (pErr, pemakaianRows) => {
            const usageMap = {};
            (pemakaianRows || []).forEach(p => {
                const key = (p.nama_produk || "").trim().toLowerCase();
                usageMap[key] = parseInt(p.total_pakai, 10) || 0;
            });

            const grouped = {};
            rows.forEach((r, idx) => {
                const key = (r.nama_produk || "").trim().toLowerCase();
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push({ ...r, _origIdx: idx });
            });

            const activeBatches = [];

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

                    if (sisa > 0) {
                        activeBatches.push({ ...b, stok_sisa: sisa });
                    }
                });
            });

            dashboard.total_barang = activeBatches.length;
            const today = new Date();

            activeBatches.forEach((item) => {
                if (Number(item.is_no_expired) === 1) {
                    dashboard.aman++;
                    return;
                }

                const normalizedDate = normalizeTanggal(item.tanggal_expired);
                const expiredDate = new Date(normalizedDate);

                if (isNaN(expiredDate.getTime())) {
                    dashboard.expired++;
                    return;
                }

                const selisihHari = Math.ceil((expiredDate - today) / (1000 * 60 * 60 * 24));

                if (selisihHari < 0) {
                    dashboard.expired++;
                } else if (selisihHari <= 30) {
                    dashboard.warning++;
                } else {
                    dashboard.aman++;
                }
            });

            res.json({ success: true, data: dashboard });
        });
    });
};

module.exports = {
    getDashboard
};