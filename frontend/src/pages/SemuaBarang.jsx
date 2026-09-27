import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
    Container,
    Row,
    Col,
    Table,
    Button,
    Form,
    InputGroup,
    Spinner,
    Modal,
    Badge,
    Card,
    Alert,
    Pagination
} from "react-bootstrap";
import {
    Boxes,
    Search,
    PlusLg,
    PencilSquare,
    Trash,
    Download,
    CalendarEvent,
    PersonFill,
    EyeFill,
    Receipt,
    PencilFill,
    ExclamationTriangleFill,
    CheckCircleFill,
    GeoAltFill,
    ArchiveFill,
    FileEarmarkExcel,
    Upload
} from "react-bootstrap-icons";

import ModalBarang from "../../components/ModalBarang";
import { formatKodeProduk } from "../utils";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

function SemuaBarang() {
    const { isCategoryAllowed } = useAuth();
    const { settings, getExpiredInfo, getEffectiveSisaHari } = useSettings();
    const [barang, setBarang] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");

    // Modal Create / Edit Penerimaan State
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);

    // Modal Detail Penerimaan State
    const [selectedPenerimaan, setSelectedPenerimaan] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [categories, setCategories] = useState([]);

    // Modal Import Batch State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importNoPenerimaan, setImportNoPenerimaan] = useState("");
    const [importTanggalMasuk, setImportTanggalMasuk] = useState("");
    const [importPenerima, setImportPenerima] = useState("");
    const [usersList, setUsersList] = useState([]);
    const [importFile, setImportFile] = useState(null);
    const [previewRows, setPreviewRows] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const handleOpenImportModal = async () => {
        const today = new Date().toISOString().slice(0, 10);
        setImportTanggalMasuk(today);
        setPreviewRows([]);
        setImportFile(null);
        setImportResult(null);
        setShowImportModal(true);

        try {
            const [resNo, resUsers] = await Promise.all([
                axios.get(`http://localhost:3000/api/barang/next-no-penerimaan?tanggal=${today}`),
                axios.get("http://localhost:3000/api/users")
            ]);

            if (resNo.data && resNo.data.success) {
                setImportNoPenerimaan(resNo.data.no_penerimaan || `IN-${today.replace(/-/g, "")}-001`);
            } else {
                setImportNoPenerimaan(`IN-${today.replace(/-/g, "")}-001`);
            }

            if (resUsers.data && resUsers.data.success) {
                const uList = resUsers.data.data || [];
                setUsersList(uList);
                if (uList.length > 0) {
                    setImportPenerima(uList[0].nama || uList[0].username || "Petugas Persediaan");
                } else {
                    setImportPenerima("Petugas Persediaan");
                }
            } else {
                setImportPenerima("Petugas Persediaan");
            }
        } catch (err) {
            console.error("Gagal memuat info batch import:", err);
            setImportNoPenerimaan(`IN-${today.replace(/-/g, "")}-001`);
            setImportPenerima("Petugas Persediaan");
        }
    };

    const handleDownloadTemplate = () => {
        window.open("http://localhost:3000/api/data/export/template-import", "_blank");
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        setPreviewRows([]);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const ws = wb.Sheets[wb.SheetNames[0]];

                // Detect header row: must have ≥4 separate non-empty cells AND contain "nama"
                // This prevents the merged instruction row (PETUNJUK) from being matched
                const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
                let headerRowIndex = 2;
                for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                    const rowArr = rawRows[i] || [];
                    const nonEmpty = rowArr.filter(c => String(c).trim() !== "");
                    if (nonEmpty.length >= 4) {
                        const rowStr = nonEmpty.map(c => String(c).toLowerCase()).join(" ");
                        if (rowStr.includes("nama") && (rowStr.includes("jumlah") || rowStr.includes("satuan") || rowStr.includes("kode"))) {
                            headerRowIndex = i;
                            break;
                        }
                    }
                }

                // NO defval — so truly empty rows are excluded automatically by SheetJS
                const parsedData = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

                const validRows = [];
                parsedData.forEach(r => {
                    if (!r || typeof r !== "object") return;
                    const keys = Object.keys(r);
                    if (keys.length === 0) return;

                    // Helper: find first key matching any keyword (exact toLowerCase match), return its value
                    const getVal = (...keywords) => {
                        for (const k of keys) {
                            const kl = String(k).toLowerCase().trim();
                            for (const kw of keywords) {
                                if (kl.includes(kw)) {
                                    const v = String(r[k] !== null && r[k] !== undefined ? r[k] : "").trim();
                                    if (v) return v;
                                }
                            }
                        }
                        return "";
                    };

                    // Find Nama Barang — key must include "nama" but NOT be just kode/no/sub
                    let valNama = "";
                    for (const k of keys) {
                        const kl = String(k).toLowerCase().trim();
                        if (
                            (kl.includes("nama") || kl.includes("produk") || kl.includes("barang")) &&
                            !kl.startsWith("kode") && !kl.startsWith("sub") && !kl.startsWith("no")
                        ) {
                            const v = String(r[k] !== null && r[k] !== undefined ? r[k] : "").trim();
                            if (v && isNaN(v)) { valNama = v; break; }
                        }
                    }

                    if (!valNama) return;

                    // Reject example/template rows
                    const nUp = valNama.toUpperCase();
                    if (
                        nUp.includes("CONTOH") || nUp.includes("HAPUS") || nUp.includes("TIMPA") ||
                        nUp.includes("TEMPLATE") || nUp.includes("PETUNJUK") ||
                        nUp.startsWith("NAMA BARANG")
                    ) return;

                    const valKode = getVal("kode");
                    const valJumlah = getVal("jumlah", "qty", "banyak");
                    const valExp = getVal("expired", "exp", "kadaluarsa");
                    const valSatuan = getVal("satuan", "unit");
                    const valLokasi = getVal("lokasi", "gudang");

                    // Kategori: must include "kategori" but NOT "sub"
                    let valKategori = "";
                    for (const k of keys) {
                        const kl = String(k).toLowerCase().trim();
                        if (kl.includes("kategori") && !kl.includes("sub")) {
                            const v = String(r[k] !== null && r[k] !== undefined ? r[k] : "").trim();
                            if (v) { valKategori = v; break; }
                        }
                    }

                    const valSubKat = getVal("sub");

                    validRows.push({
                        kode_produk: valKode || "",
                        nama_produk: valNama,
                        jumlah: parseInt(valJumlah, 10) || 1,
                        tanggal_expired: valExp || "",
                        satuan: valSatuan || "Pcs",
                        lokasi: valLokasi || "Gudang Utama",
                        kategori: valKategori || "Umum",
                        sub_kategori: valSubKat || ""
                    });
                });

                console.log("Import rows parsed:", validRows);
                setPreviewRows(validRows);
            } catch (err) {
                console.error("Gagal membaca file Excel:", err);
                alert("Gagal membaca file Excel. Pastikan format file sesuai.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleProcessImport = async () => {
        if (!importFile) {
            alert("Silakan pilih file Excel terlebih dahulu.");
            return;
        }

        if (!previewRows || previewRows.length === 0) {
            alert("Tidak ada data barang yang valid terbaca dari file ini. Pastikan Anda mengisikan 'Nama Barang' di dalam file Excel.");
            return;
        }

        try {
            setImporting(true);
            setImportResult(null);
            const res = await axios.post("http://localhost:3000/api/data/import/penerimaan", {
                no_penerimaan: importNoPenerimaan,
                tanggal_masuk: importTanggalMasuk,
                penerima: importPenerima,
                rows: previewRows
            });
            if (res.data && res.data.success) {
                setImportResult({ type: "success", message: res.data.message });
                await loadData();
                await loadCategories();
                setTimeout(() => {
                    setShowImportModal(false);
                    setPreviewRows([]);
                    setImportFile(null);
                    setImportResult(null);
                }, 2000);
            } else {
                setImportResult({ type: "danger", message: res.data.message || "Gagal memproses impor." });
            }
        } catch (err) {
            console.error("Gagal mengimpor data:", err);
            setImportResult({ type: "danger", message: err.response?.data?.message || "Terjadi kesalahan sistem saat memproses impor." });
        } finally {
            setImporting(false);
        }
    };

    // Filter Tanggal Masuk (Range), Kategori & Status Expired
    const [tglDari, setTglDari] = useState("");
    const [tglSampai, setTglSampai] = useState("");
    const [bulanFilter, setBulanFilter] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [statusExpiredFilter, setStatusExpiredFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("terbaru"); // "terbaru" | "terlama"

    const API_BARANG = "http://localhost:3000/api/barang";
    const API_KATEGORI = "http://localhost:3000/api/kategori";

    const loadCategories = async () => {
        try {
            const res = await axios.get(API_KATEGORI);
            if (res.data && res.data.success) {
                setCategories(res.data.data || []);
            }
        } catch (err) {
            console.error("Gagal memuat kategori:", err);
        }
    };

    // Load Barang Data
    const loadData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (keyword.trim()) params.set("q", keyword.trim());
            if (tglDari) params.set("tgl_dari", tglDari);
            if (tglSampai) params.set("tgl_sampai", tglSampai);
            if (kategoriFilter) params.set("kategori", kategoriFilter);
            if (bulanFilter) params.set("bulan", bulanFilter);

            const qs = params.toString();
            const url = qs ? `${API_BARANG}?${qs}` : API_BARANG;

            const res = await axios.get(url);
            if (res.data && res.data.success) {
                setBarang(res.data.data || []);
            }
        } catch (err) {
            console.error("Gagal memuat data penerimaan barang:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        loadCategories();
    }, [keyword, tglDari, tglSampai, kategoriFilter, bulanFilter]);

    // Grouping Penerimaan berdasarkan No. Masuk (no_penerimaan)
    const groupedPenerimaan = useMemo(() => {
        const map = new Map();

        barang.forEach(item => {
            // Filter pembatasan hak akses kategori per role
            if (!isCategoryAllowed(item.kategori)) return;

            // Filter rentang tanggal masuk
            const itemTgl = item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "");
            if (tglDari && itemTgl && itemTgl < tglDari) return;
            if (tglSampai && itemTgl && itemTgl > tglSampai) return;

            // Filter kategori & status expired per item terlebih dahulu
            if (kategoriFilter && item.kategori !== kategoriFilter) return;
            if (statusExpiredFilter) {
                const sisa = item.sisa_hari !== undefined ? item.sisa_hari : 999;
                const isNoExp = Number(item.is_no_expired) === 1;
                if (statusExpiredFilter === "EXPIRED" && (isNoExp || sisa >= 0)) return;
                if (statusExpiredFilter === "KRITIS" && (isNoExp || sisa < 0 || sisa > 30)) return;
                if (statusExpiredFilter === "DIPERHATIKAN" && (isNoExp || sisa <= 30 || sisa > 60)) return;
                if (statusExpiredFilter === "AMAN" && (isNoExp || sisa <= 60)) return;
                if (statusExpiredFilter === "NON_EXPIRED" && !isNoExp) return;
            }

            const key = (item.no_penerimaan && item.no_penerimaan.trim() !== "")
                ? item.no_penerimaan.trim()
                : `TANPA-NO-${item.kode_produk}`;

            if (!map.has(key)) {
                map.set(key, {
                    no_penerimaan: item.no_penerimaan || key,
                    tanggal_masuk: item.tanggal_masuk || (item.created_at ? item.created_at.slice(0, 10) : "-"),
                    penerima: item.penerima || "-",
                    created_at: item.created_at || "",
                    items: [],
                    total_unit: 0,
                    kategori_set: new Set(),
                    lokasi_set: new Set()
                });
            }

            const group = map.get(key);
            group.items.push(item);
            group.total_unit += parseInt(item.jumlah, 10) || 0;
            if (item.kategori) group.kategori_set.add(item.kategori);
            if (item.lokasi) group.lokasi_set.add(item.lokasi);
        });

        let result = Array.from(map.values()).map(g => ({
            ...g,
            kategori_list: Array.from(g.kategori_set).join(", "),
            lokasi_list: Array.from(g.lokasi_set).join(", ")
        }));

        // Filter keyword pencarian pada data kelompok
        if (keyword.trim() !== "") {
            const term = keyword.toLowerCase();
            result = result.filter(g =>
                (g.no_penerimaan && g.no_penerimaan.toLowerCase().includes(term)) ||
                (g.penerima && g.penerima.toLowerCase().includes(term)) ||
                (g.kategori_list && g.kategori_list.toLowerCase().includes(term)) ||
                (g.lokasi_list && g.lokasi_list.toLowerCase().includes(term)) ||
                g.items.some(it =>
                    (it.nama_produk && it.nama_produk.toLowerCase().includes(term)) ||
                    (it.kode_produk && it.kode_produk.toLowerCase().includes(term))
                )
            );
        }

        // Urutan Sorting Berdasarkan No. Orderan / No. Masuk Penerimaan (no_penerimaan)
        const parseSortDate = (dateStr) => {
            if (!dateStr || dateStr === "-") return 0;
            const str = String(dateStr).trim();
            const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
            if (dmyMatch) {
                const [, day, month, year] = dmyMatch;
                return new Date(`${year}-${month}-${day}T00:00:00`).getTime() || 0;
            }
            const parsed = new Date(str).getTime();
            return isNaN(parsed) ? 0 : parsed;
        };

        result.sort((a, b) => {
            const noA = (a.no_penerimaan || "").trim();
            const noB = (b.no_penerimaan || "").trim();

            // Urutkan berdasarkan No. Penerimaan / Orderan secara numeric
            const comp = noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
            
            if (comp !== 0) {
                return sortOrder === "terbaru" ? -comp : comp;
            }

            // Fallback sekunder: tanggal masuk
            const dateA = parseSortDate(a.tanggal_masuk) || parseSortDate(a.created_at);
            const dateB = parseSortDate(b.tanggal_masuk) || parseSortDate(b.created_at);
            return sortOrder === "terbaru" ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [barang, keyword, tglDari, tglSampai, kategoriFilter, statusExpiredFilter, sortOrder]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [keyword, tglDari, tglSampai, kategoriFilter, statusExpiredFilter, sortOrder]);

    const totalPages = Math.ceil(groupedPenerimaan.length / itemsPerPage);

    const paginatedGroupedPenerimaan = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return groupedPenerimaan.slice(start, start + itemsPerPage);
    }, [groupedPenerimaan, currentPage]);

    const handleTambah = () => {
        setEditData(null);
        setShowModal(true);
    };

    const handleEditGroup = (group) => {
        setEditData(group.items[0] || group);
        setShowModal(true);
        setShowDetailModal(false);
    };

    const handleDetailGroup = (group) => {
        setSelectedPenerimaan(group);
        setShowDetailModal(true);
    };

    const handleArsipGroup = async (group) => {
        if (window.confirm(`Arsipkan seluruh transaksi penerimaan "${group.no_penerimaan}" (${group.items.length} jenis barang, total ${group.total_unit} unit)?\n\nData akan dipindahkan ke halaman Arsip dan dapat dipulihkan kapan saja.`)) {
            try {
                await axios.put(`${API_BARANG}/arsip-penerimaan/${encodeURIComponent(group.no_penerimaan)}`);
                alert(`Transaksi penerimaan "${group.no_penerimaan}" berhasil diarsipkan.`);
                loadData();
                setShowDetailModal(false);
            } catch (err) {
                console.error(err);
                alert("Gagal mengarsipkan transaksi penerimaan.");
            }
        }
    };

    const handleHapusGroup = async (group) => {
        if (window.confirm(`Hapus PERMANEN seluruh transaksi penerimaan "${group.no_penerimaan}" (${group.items.length} jenis barang, total ${group.total_unit} unit)?\n\nPERHATIAN: Tindakan ini tidak dapat dibatalkan!`)) {
            try {
                for (const item of group.items) {
                    await axios.delete(`${API_BARANG}/${item.id || item.kode_produk}`);
                }
                alert(`Seluruh transaksi penerimaan "${group.no_penerimaan}" berhasil dihapus secara permanen.`);
                loadData();
                setShowDetailModal(false);
            } catch (err) {
                alert("Gagal menghapus transaksi penerimaan.");
            }
        }
    };

    const handleArsipSingleItem = async (item) => {
        if (window.confirm(`Arsipkan produk "${item.nama_produk}" (${item.jumlah} ${item.satuan || 'Pcs'})?\n\nData akan dipindahkan ke halaman Data Terarsip.`)) {
            try {
                await axios.put(`${API_BARANG}/arsip/${encodeURIComponent(item.id || item.kode_produk)}`);
                alert(`Produk "${item.nama_produk}" berhasil diarsipkan.`);
                loadData();
                if (selectedPenerimaan) {
                    const remaining = selectedPenerimaan.items.filter(i => (i.id ? i.id !== item.id : i.kode_produk !== item.kode_produk));
                    if (remaining.length === 0) {
                        setShowDetailModal(false);
                    } else {
                        setSelectedPenerimaan(prev => ({ ...prev, items: remaining }));
                    }
                }
            } catch (err) {
                console.error(err);
                alert("Gagal mengarsipkan item barang.");
            }
        }
    };

    const handleHapusSingleItem = async (item) => {
        if (window.confirm(`Hapus PERMANEN produk "${item.nama_produk}" (${item.jumlah} ${item.satuan || 'Pcs'})?\n\nPERHATIAN: Tindakan ini tidak dapat dibatalkan!`)) {
            try {
                await axios.delete(`${API_BARANG}/${encodeURIComponent(item.id || item.kode_produk)}`);
                alert(`Produk "${item.nama_produk}" berhasil dihapus secara permanen.`);
                loadData();
                if (selectedPenerimaan) {
                    const remaining = selectedPenerimaan.items.filter(i => (i.id ? i.id !== item.id : i.kode_produk !== item.kode_produk));
                    if (remaining.length === 0) {
                        setShowDetailModal(false);
                    } else {
                        setSelectedPenerimaan(prev => ({ ...prev, items: remaining }));
                    }
                }
            } catch (err) {
                console.error(err);
                alert("Gagal menghapus item barang.");
            }
        }
    };

    // Helper Ringkasan Status Expired Terburuk dalam Group
    const getGroupStatusBadge = (items) => {
        let worstKey = "aman";
        let worstInfo = null;

        items.forEach(it => {
            const info = getExpiredInfo(it.sisa_hari, it.is_no_expired);
            if (info.key === "expired") {
                worstKey = "expired";
                worstInfo = info;
            } else if (info.key === "kritis" && worstKey !== "expired") {
                worstKey = "kritis";
                worstInfo = info;
            } else if (info.key === "diperhatikan" && worstKey !== "expired" && worstKey !== "kritis") {
                worstKey = "diperhatikan";
                worstInfo = info;
            } else if (!worstInfo) {
                worstInfo = info;
            }
        });

        if (!worstInfo) worstInfo = getExpiredInfo(999, 0);

        return (
            <span
                className="badge px-2.5 py-1 fs-6 fw-bold shadow-sm"
                style={{ backgroundColor: worstInfo.color, color: worstInfo.textColor }}
            >
                {worstInfo.label}
            </span>
        );
    };



    return (
        <Container fluid className="p-4">
            <div className="bg-white p-4 rounded-4 border shadow-sm">
                <Row className="mb-4 align-items-center">
                    <Col md={6}>
                        <h3 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
                            <Boxes size={28} />
                            Penerimaan Barang
                        </h3>
                        <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                            Daftar transaksi penerimaan barang masuk terkelompok.
                        </p>
                    </Col>

                    <Col md={6} className="text-md-end mt-3 mt-md-0">
                        <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                            <InputGroup style={{ maxWidth: "280px" }}>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <Search className="text-muted" size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    className="border-start-0 ps-0"
                                    placeholder="Cari transaksi / barang..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                            </InputGroup>

                            <Button variant="outline-success" className="d-flex align-items-center gap-1.5 fw-bold" size="sm" onClick={handleOpenImportModal}>
                                <FileEarmarkExcel size={14} /> Import Excel
                            </Button>

                            <Button variant="primary" className="d-flex align-items-center gap-2 fw-bold" onClick={handleTambah}>
                                <PlusLg size={14} /> Tambah Penerimaan
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Bar Filter Tanggal Masuk (Range), Kategori & Status Expired */}
                <div className="bg-light p-3 rounded-3 border mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.875rem" }}>
                                <CalendarEvent size={16} className="text-primary" /> Tanggal Masuk:
                            </span>
                            <div className="d-flex align-items-center gap-1.5 bg-white p-1 rounded border shadow-sm" style={{ width: "305px" }}>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={tglDari}
                                    onChange={(e) => setTglDari(e.target.value)}
                                    className="border-0 p-0 fw-semibold text-dark text-center"
                                    style={{ width: "130px", fontSize: "0.85rem" }}
                                    title="Dari Tanggal"
                                />
                                <span className="text-muted fw-bold small">s/d</span>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={tglSampai}
                                    onChange={(e) => setTglSampai(e.target.value)}
                                    className="border-0 p-0 fw-semibold text-dark text-center"
                                    style={{ width: "130px", fontSize: "0.85rem" }}
                                    title="Sampai Tanggal"
                                />
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.875rem" }}>
                                Kategori:
                            </span>
                            <Form.Select
                                size="sm"
                                value={kategoriFilter}
                                onChange={(e) => setKategoriFilter(e.target.value)}
                                style={{ maxWidth: "170px" }}
                                className="fw-semibold shadow-sm"
                            >
                                <option value="">Semua Kategori</option>
                                {categories.map((kat) => (
                                    <option key={kat.id} value={kat.nama_kategori}>
                                        {kat.nama_kategori}
                                    </option>
                                ))}
                            </Form.Select>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.875rem" }}>
                                Status Expired:
                            </span>
                            <Form.Select
                                size="sm"
                                value={statusExpiredFilter}
                                onChange={(e) => setStatusExpiredFilter(e.target.value)}
                                style={{ maxWidth: "190px" }}
                                className="fw-semibold shadow-sm"
                            >
                                <option value="">Semua Status Expired</option>
                                <option value="EXPIRED">Expired (&lt; 0 hari)</option>
                                <option value="KRITIS">Kritis / Segera (&lt;= 30 hari)</option>
                                <option value="DIPERHATIKAN">Diperhatikan (31 - 60 hari)</option>
                                <option value="AMAN">Aman (61 - 365 hari)</option>
                                <option value="NON_EXPIRED">Non-Expired / 5 Thn (&gt; 1 thn)</option>
                            </Form.Select>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.875rem" }}>
                                Urutan:
                            </span>
                            <Form.Select
                                size="sm"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                style={{ maxWidth: "170px" }}
                                className="fw-semibold shadow-sm"
                            >
                                <option value="terbaru">Terbaru (Barang Masuk Terakhir)</option>
                                <option value="terlama">Terlama (Barang Masuk Pertama)</option>
                            </Form.Select>
                        </div>

                        {(tglDari || tglSampai || bulanFilter || kategoriFilter || statusExpiredFilter) && (
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => {
                                    setTglDari("");
                                    setTglSampai("");
                                    setBulanFilter("");
                                    setKategoriFilter("");
                                    setStatusExpiredFilter("");
                                }}
                                style={{ fontSize: "0.8rem" }}
                            >
                                Reset Filter
                            </Button>
                        )}
                    </div>
                    {(tglDari || tglSampai || bulanFilter || kategoriFilter || statusExpiredFilter) && (
                        <span className="badge bg-primary-subtle text-primary px-3 py-2 border border-primary-subtle rounded-pill" style={{ fontSize: "0.8rem" }}>
                            Menampilkan: <strong>{groupedPenerimaan.length}</strong> transaksi penerimaan
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : (
                    <Table responsive hover className="custom-table align-middle border rounded-3 overflow-hidden shadow-sm mt-2">
                        <thead>
                            <tr>
                                <th className="py-3 px-3 text-center" style={{ width: "50px" }}>No.</th>
                                <th className="py-3 px-3 text-nowrap-cell" style={{ width: "160px" }}>No. Penerimaan</th>
                                <th className="py-3 px-3 text-nowrap-cell" style={{ width: "110px" }}>Tanggal</th>
                                <th className="py-3 px-3 text-nowrap-cell" style={{ width: "130px" }}>Penerima</th>
                                <th className="py-3 px-3">Barang Diterima</th>
                                <th className="py-3 px-3 text-nowrap-cell text-center" style={{ width: "140px" }}>Jumlah Masuk</th>
                                <th className="py-3 px-3" style={{ width: "170px" }}>Kategori &amp; Lokasi</th>
                                <th className="py-3 px-3 text-center" style={{ width: "200px" }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedPenerimaan.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted py-5 fs-6">
                                        <div className="mb-2"><Boxes size={40} className="text-muted opacity-50" /></div>
                                        Belum ada transaksi penerimaan barang.
                                    </td>
                                </tr>
                            ) : (
                                paginatedGroupedPenerimaan.map((group, idx) => (
                                    <tr key={group.no_penerimaan}>
                                        <td className="fw-semibold text-muted text-center px-3">{((currentPage - 1) * 10) + idx + 1}</td>
                                        <td className="px-3 text-nowrap-cell">
                                            <span className="badge-code-in">
                                                {group.no_penerimaan}
                                            </span>
                                        </td>
                                        <td className="px-3 text-nowrap-cell">
                                            <div className="cell-bold">
                                                {group.tanggal_masuk}
                                            </div>
                                        </td>
                                        <td className="px-3 text-nowrap-cell">
                                            <div className="fw-semibold text-dark">
                                                {group.penerima && group.penerima !== "-" ? group.penerima : "-"}
                                            </div>
                                        </td>
                                        <td className="px-3">
                                            {group.items.length === 1 ? (
                                                <div className="fw-bold text-dark">
                                                    {group.items[0].nama_produk}
                                                    {group.items[0].kode_produk && (
                                                        <span className="ms-1.5 text-muted fw-normal small">({group.items[0].kode_produk})</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="fw-bold text-dark text-truncate" style={{ maxWidth: "360px" }} title={group.items.map(it => it.nama_produk).join(", ")}>
                                                    {group.items.map(it => it.nama_produk).join(", ")}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 text-center text-nowrap-cell">
                                            {group.items.length === 1 ? (
                                                <span className="badge-unit-in">
                                                    {group.items[0].jumlah} {group.items[0].satuan || "Pcs"}
                                                </span>
                                            ) : (
                                                <span className="badge-unit-in">
                                                    {group.items.length} Jenis ({group.total_unit} Unit)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3">
                                            <div className="fw-bold text-dark">{group.kategori_list || "-"}</div>
                                            {group.lokasi_list && (
                                                <div className="small text-muted" style={{ fontSize: "0.8rem" }}>
                                                    Lokasi: {group.lokasi_list}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center px-3 text-nowrap-cell">
                                            <div className="d-flex gap-1.5 justify-content-center align-items-center">
                                                {group.items.length > 1 && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline-info"
                                                        onClick={() => handleDetailGroup(group)}
                                                        className="fw-semibold px-2 py-1 btn-sm d-flex align-items-center gap-1"
                                                        title="Lihat Rincian Item"
                                                    >
                                                        <EyeFill size={13} /> Rincian
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    onClick={() => handleEditGroup(group)}
                                                    className="fw-semibold px-2 py-1 btn-sm d-flex align-items-center gap-1"
                                                    title="Edit / Tambah Barang"
                                                >
                                                    <PencilFill size={12} /> Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-warning"
                                                    onClick={() => handleArsipGroup(group)}
                                                    className="fw-semibold px-2 py-1 btn-sm text-dark d-flex align-items-center gap-1"
                                                    title="Arsipkan Transaksi Ini"
                                                >
                                                    <ArchiveFill size={12} /> Arsip
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => handleHapusGroup(group)}
                                                    className="fw-semibold px-2 py-1 btn-sm d-flex align-items-center gap-1"
                                                    title="Hapus Permanen Transaksi Ini"
                                                >
                                                    <Trash size={12} /> Hapus
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top no-print">
                        <div className="small text-muted fw-semibold">
                            Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span> - <span className="text-dark fw-bold">{Math.min(currentPage * 10, groupedPenerimaan.length)}</span> dari <span className="text-dark fw-bold">{groupedPenerimaan.length}</span> transaksi (Halaman {currentPage} dari {totalPages})
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <Button
                                variant="outline-primary"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1 fw-bold"
                            >
                                &laquo; Prev
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                .map((p, i, arr) => (
                                    <span key={p} className="d-flex align-items-center">
                                        {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-muted">...</span>}
                                        <Button
                                            variant={p === currentPage ? "primary" : "outline-secondary"}
                                            size="sm"
                                            onClick={() => setCurrentPage(p)}
                                            className="px-2.5 py-1 fw-bold"
                                            style={{ minWidth: "32px" }}
                                        >
                                            {p}
                                        </Button>
                                    </span>
                                ))
                            }
                            <Button
                                variant="outline-primary"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1 fw-bold"
                            >
                                Next &raquo;
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Form Tambah / Edit Batch Penerimaan Barang */}
            <ModalBarang
                show={showModal}
                handleClose={() => setShowModal(false)}
                editData={editData}
                refreshData={loadData}
            />

            {/* Modal Detail Transaksi Penerimaan */}
            {selectedPenerimaan && (
                <Modal
                    show={showDetailModal}
                    onHide={() => setShowDetailModal(false)}
                    size="xl"
                    centered
                >
                    <Modal.Header closeButton className="border-bottom bg-white py-2.5 px-3">
                        <Modal.Title className="fw-bold text-dark fs-5 d-flex align-items-center gap-2">
                            <Receipt className="text-primary" size={20} />
                            Detail Transaksi Penerimaan Barang
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-3 bg-light">
                        {/* Info Ringkas Transaksi */}
                        <Card className="border shadow-sm rounded-3 mb-3 bg-white">
                            <Card.Body className="p-3">
                                <Row className="g-2">
                                    <Col md={3}>
                                        <div className="text-muted small fw-semibold">No. Masuk / Penerimaan:</div>
                                        <div className="fw-bold text-primary font-monospace fs-6">
                                            {selectedPenerimaan.no_penerimaan}
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="text-muted small fw-semibold">Tanggal Masuk:</div>
                                        <div className="fw-bold text-dark fs-6">
                                            {selectedPenerimaan.tanggal_masuk}
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="text-muted small fw-semibold">Petugas Penerima:</div>
                                        <div className="fw-bold text-dark fs-6">
                                            {selectedPenerimaan.penerima}
                                        </div>
                                    </Col>
                                    <Col md={3}>
                                        <div className="text-muted small fw-semibold">Total Unit Diterima:</div>
                                        <Badge bg="success" className="px-3 py-1 fs-6 fw-bold shadow-sm">
                                            {selectedPenerimaan.items.length} Jenis ({selectedPenerimaan.total_unit} Unit)
                                        </Badge>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        {/* Tabel Detail Produk Dalam Transaksi Ini */}
                        <Card className="border shadow-sm rounded-3 bg-white">
                            <Card.Body className="p-2 px-3">
                                <div className="fw-bold text-dark mb-2" style={{ fontSize: "0.875rem" }}>
                                    DAFTAR BARANG YANG DITERIMA DALAM TRANSAKSI INI:
                                </div>
                                <Table responsive hover size="sm" className="custom-table m-0 border rounded">
                                    <thead className="bg-light">
                                        <tr>
                                            <th style={{ width: "35px" }}>#</th>
                                            <th>Kode</th>
                                            <th>Nama Barang</th>
                                            <th className="text-center">Jumlah</th>
                                            <th>Tanggal Expired</th>
                                            <th className="text-center">Status Expired</th>
                                            <th>Kategori &amp; Sub</th>
                                            <th>Lokasi Simpan</th>
                                            <th className="text-center" style={{ width: "160px" }}>Aksi Item</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPenerimaan.items.map((item, idx) => (
                                            <tr key={item.kode_produk}>
                                                <td className="text-muted fs-6">{idx + 1}</td>
                                                <td>
                                                    <span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span>
                                                </td>
                                                <td className="fw-bold text-dark fs-6">{item.nama_produk}</td>
                                                <td className="text-center">
                                                    <span className="badge bg-success px-2.5 py-1 fs-6 fw-bold">
                                                        {item.jumlah} {item.satuan || "Pcs"}
                                                    </span>
                                                </td>
                                                <td className="fw-bold text-dark fs-6">
                                                    {Number(item.is_no_expired) === 1 ? (
                                                        <div>
                                                            <span
                                                                className="badge px-2 py-1 fs-6 fw-bold shadow-sm"
                                                                style={{ backgroundColor: settings?.color_non_expired || "#0dcaf0", color: "#000000" }}
                                                            >
                                                                {settings?.tahun_non_expired || 5} Thn (Non-Expired)
                                                            </span>
                                                            <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                                                                Est. Sisa {getEffectiveSisaHari(item)} hari
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div>{item.tanggal_expired}</div>
                                                            <div className="small text-muted" style={{ fontSize: "0.75rem" }}>
                                                                {item.sisa_hari < 0 ? `Lewat ${Math.abs(item.sisa_hari)} hari` : `Sisa ${item.sisa_hari} hari`}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {(() => {
                                                        const info = getExpiredInfo(item.sisa_hari, item.is_no_expired, item);
                                                        return (
                                                            <span
                                                                className="badge px-2 py-1 fs-6 fw-bold shadow-sm"
                                                                style={{ backgroundColor: info.color, color: info.textColor }}
                                                            >
                                                                {info.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="fs-6">
                                                    {item.kategori || "-"} {item.sub_kategori ? `(Sub: ${item.sub_kategori})` : ""}
                                                </td>
                                                <td className="fs-6">{item.lokasi || "-"}</td>
                                                <td className="text-center px-2">
                                                    <div className="d-flex gap-2 justify-content-center align-items-center">
                                                        <Button
                                                            size="sm"
                                                            variant="warning"
                                                            className="fw-bold px-2 py-1 fs-6 text-dark d-flex align-items-center gap-1"
                                                            onClick={() => handleArsipSingleItem(item)}
                                                            title="Arsipkan Barang Ini Ke Data Terarsip"
                                                        >
                                                            <ArchiveFill size={12} /> Arsipkan Item
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            className="fw-bold px-2 py-1 fs-6 d-flex align-items-center gap-1"
                                                            onClick={() => handleHapusSingleItem(item)}
                                                            title="Hapus Barang Ini Secara Permanen"
                                                        >
                                                            <Trash size={12} /> Hapus Item
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Modal.Body>
                    <Modal.Footer className="border-top bg-white px-3 py-2 d-flex justify-content-between align-items-center">
                        <div className="d-flex gap-2">
                            <Button
                                variant="primary"
                                className="fw-bold d-flex align-items-center gap-1"
                                onClick={() => handleEditGroup(selectedPenerimaan)}
                            >
                                <PencilFill size={14} /> Edit / Tambah Item
                            </Button>
                            <Button
                                variant="warning"
                                className="fw-bold text-dark d-flex align-items-center gap-1"
                                onClick={() => handleArsipGroup(selectedPenerimaan)}
                            >
                                <ArchiveFill size={14} /> Arsipkan Transaksi Ini
                            </Button>
                        </div>

                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                            Tutup
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}



            {/* Modal Import Excel Data Penerimaan */}
            <Modal
                show={showImportModal}
                onHide={() => setShowImportModal(false)}
                size="lg"
                centered
            >
                <Modal.Header closeButton className="border-bottom bg-white py-2.5 px-3">
                    <Modal.Title className="fw-bold text-dark fs-5 d-flex align-items-center gap-2">
                        <FileEarmarkExcel className="text-success" size={22} />
                        Import Data Penerimaan Barang (1 File Excel = 1 Transaksi Batch)
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 bg-light">
                    {importResult && (
                        <Alert variant={importResult.type} className="d-flex align-items-center gap-2 mb-3 fw-bold">
                            <CheckCircleFill size={18} /> {importResult.message}
                        </Alert>
                    )}

                    {/* Step 1: Info Batch Transaksi Penerimaan */}
                    <Card className="border shadow-sm rounded-3 mb-3 bg-white">
                        <Card.Body className="p-3">
                            <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                                <Receipt size={18} /> 1. Informasi Transaksi Penerimaan (Batch Entry)
                            </h6>
                            <p className="text-muted small mb-3">
                                Seluruh barang yang diimpor dari 1 file Excel ini akan secara otomatis dikelompokkan ke dalam <strong>1 Transaksi Penerimaan</strong> yang sama.
                            </p>
                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-semibold text-dark mb-1">No. Masuk / Penerimaan (Otomatis System):</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={importNoPenerimaan}
                                            readOnly
                                            disabled
                                            className="fw-bold font-monospace bg-light text-primary border-primary-subtle"
                                            placeholder="Otomatis..."
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-semibold text-dark mb-1">Tanggal Masuk:</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={importTanggalMasuk}
                                            onChange={(e) => setImportTanggalMasuk(e.target.value)}
                                            className="fw-semibold"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="small fw-semibold text-dark mb-1">Petugas Penerima:</Form.Label>
                                        <Form.Select
                                            value={importPenerima}
                                            onChange={(e) => setImportPenerima(e.target.value)}
                                            className="fw-semibold"
                                        >
                                            <option value="">-- Pilih Petugas Penerima --</option>
                                            {usersList && usersList.filter(u => (u.role || '').toUpperCase() !== 'PEMAKAI').length > 0 ? (
                                                usersList.filter(u => (u.role || '').toUpperCase() !== 'PEMAKAI').map((u, i) => (
                                                    <option key={i} value={u.nama || u.username}>
                                                        {u.nama ? `${u.nama} (${(u.role || 'OPERATOR').toUpperCase()})` : u.username}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="Petugas Gedung Agung">Petugas Gedung Agung</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Step 2: Download Template Excel */}
                    <Card className="border shadow-sm rounded-3 mb-3 bg-white">
                        <Card.Body className="p-3">
                            <h6 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
                                2. Unduh Template Import Excel (Sudah Ada Dropdown List)
                            </h6>
                            <p className="text-muted small mb-2">
                                Template Excel ini dilengkapi dengan <strong>Dropdown List pilihan Nama Barang, Satuan, Lokasi, dan Status Expired</strong> yang tersambung langsung dengan Master Data database Anda.
                            </p>
                            <Button
                                variant="outline-success"
                                size="sm"
                                className="fw-bold d-inline-flex align-items-center gap-2"
                                onClick={handleDownloadTemplate}
                            >
                                <Download size={14} /> Unduh Template Excel (.xlsx)
                            </Button>
                        </Card.Body>
                    </Card>

                    {/* Step 3: Upload File */}
                    <Card className="border shadow-sm rounded-3 mb-3 bg-white">
                        <Card.Body className="p-3">
                            <h6 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
                                3. Upload File Excel Yang Telah Diisi
                            </h6>
                            <Form.Group className="mb-2">
                                <Form.Control
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                    className="fw-semibold"
                                />
                            </Form.Group>

                            {previewRows.length > 0 && (
                                <div className="mt-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="fw-bold text-dark small">
                                            Preview {previewRows.length} Barang Siap Diimpor:
                                        </span>
                                        <Badge bg="success" className="px-2.5 py-1 fs-6">Form &amp; File Siap</Badge>
                                    </div>
                                    <div className="table-responsive border rounded-3 bg-white" style={{ maxHeight: "200px" }}>
                                        <Table size="sm" hover className="m-0 text-nowrap" style={{ fontSize: "0.825rem" }}>
                                            <thead className="bg-light">
                                                <tr>
                                                    <th>No.</th>
                                                    <th>Kode Barang</th>
                                                    <th>Nama Barang</th>
                                                    <th className="text-center">Jumlah</th>
                                                    <th>Expired</th>
                                                    <th>Satuan</th>
                                                    <th>Lokasi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewRows.map((r, i) => {
                                                    const kode = r.kode_produk || "Otomatis";
                                                    const nama = r.nama_produk || "-";
                                                    const jumlah = r.jumlah || "0";
                                                    const exp = r.tanggal_expired || "Non-Expired (5 Tahun)";
                                                    const satuan = r.satuan || "-";
                                                    const lokasi = r.lokasi || "-";
                                                    return (
                                                        <tr key={i}>
                                                            <td className="text-muted">{i + 1}</td>
                                                            <td className="fw-bold text-primary font-monospace">{kode}</td>
                                                            <td className="fw-bold text-dark">{nama}</td>
                                                            <td className="text-center fw-bold text-success">{jumlah}</td>
                                                            <td>{exp}</td>
                                                            <td>{satuan}</td>
                                                            <td>{lokasi}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Modal.Body>
                <Modal.Footer className="border-top bg-white px-3 py-2 justify-content-between">
                    <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="success"
                        className="fw-bold px-4 d-inline-flex align-items-center gap-2"
                        onClick={handleProcessImport}
                        disabled={importing || !importFile}
                    >
                        {importing ? <Spinner animation="border" size="sm" /> : <Upload size={16} />}
                        Proses Import Transaksi ({previewRows.length > 0 ? `${previewRows.length} Items` : "Klik Untuk Memproses"})
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default SemuaBarang;
