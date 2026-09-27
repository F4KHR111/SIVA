const BULAN_SHORT = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
    "09": "Sept", "10": "Okt", "11": "Nov", "12": "Des"
};

export function formatKodeProduk(kode) {
    if (!kode) return "-";
    const cleaned = String(kode).replace(/(-b\d+|-20\d{4}.*)$/, '');
    return cleaned.toUpperCase();
}

export function formatBatchLabel(item) {
    if (!item) return "Batch 1";

    const kode = item.kode_produk || "";
    let batchNum = "1";

    const matchB = kode.match(/-b(\d+)$/);
    if (matchB) {
        batchNum = matchB[1];
    }

    const tglStr = item.tanggal_masuk || item.created_at || "";
    const matchTgl = tglStr.match(/^(\d{4})-(\d{2})/);

    if (matchTgl) {
        const yyyy = matchTgl[1];
        const mm = matchTgl[2];
        const namaBulan = BULAN_SHORT[mm] || mm;
        return `Batch ${batchNum} ${namaBulan} ${yyyy}`;
    }

    return `Batch ${batchNum}`;
}
