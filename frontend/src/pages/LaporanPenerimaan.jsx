import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
    Container,
    Row,
    Col,
    Table,
    Button,
    Form,
    InputGroup,
    Spinner,
    Badge,
    Modal,
    Card,
    Pagination
} from "react-bootstrap";
import {
    BarChartLine,
    Search,
    EyeFill,
    Receipt,
    Download,
    CalendarEvent,
    Printer
} from "react-bootstrap-icons";
import logoGedung from "../assets/logogedung.png";
import { formatKodeProduk } from "../utils";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

function LaporanPenerimaan() {
    const { isCategoryAllowed } = useAuth();
    const { getExpiredInfo, settings } = useSettings();
    const [barang, setBarang] = useState([]);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [productList, setProductList] = useState([]);

    // Search & Filter state (Sama persis dengan Kartu Stok)
    const [selectedKode, setSelectedKode] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const [keyword, setKeyword] = useState("");
    const [tglDari, setTglDari] = useState("");
    const [tglSampai, setTglSampai] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [statusExpiredFilter, setStatusExpiredFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("terbaru");

    const dropdownRef = useRef(null);

    // Modal Detail State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPenerimaan, setSelectedPenerimaan] = useState(null);

    const API_BARANG = "http://localhost:3000/api/barang";
    const API_KATEGORI = "http://localhost:3000/api/kategori";

    // Click outside dropdown handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [resBarang, resKat, resProd] = await Promise.all([
                axios.get(API_BARANG),
                axios.get(API_KATEGORI),
                axios.get("http://localhost:3000/api/nama-barang")
            ]);
            if (resBarang.data?.success) setBarang(resBarang.data.data || []);
            if (resKat.data?.success) setCategories(resKat.data.data || []);
            if (resProd.data?.success) setProductList(resProd.data.data || []);
        } catch (err) {
            console.error("Gagal memuat data laporan penerimaan:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Grouping & Filtering
    const groupedPenerimaan = useMemo(() => {
        const map = new Map();

        barang.forEach(item => {
            // Filter pembatasan hak akses kategori per role
            if (!isCategoryAllowed(item.kategori)) return;

            // Filter produk spesifik
            if (selectedKode && item.kode_produk !== selectedKode) return;

            // Filter rentang tanggal masuk
            const itemTgl = item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "");
            if (tglDari && itemTgl && itemTgl < tglDari) return;
            if (tglSampai && itemTgl && itemTgl > tglSampai) return;

            // Filter kategori & status expired per item
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
                    tanggal_masuk: item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "-"),
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

        // Robust Date & Tie-Breaker Sort
        const parseSortDate = (g) => {
            const rawDate = g.tanggal_masuk || g.created_at;
            if (!rawDate) return 0;
            const str = String(rawDate).trim();
            if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
                const [d, m, y] = str.split("-");
                return new Date(`${y}-${m}-${d}`).getTime() || 0;
            }
            const time = new Date(str).getTime();
            return isNaN(time) ? 0 : time;
        };

        const getSortId = (g) => {
            if (g.items && g.items.length > 0) {
                const maxId = Math.max(...g.items.map(it => Number(it.id) || 0));
                if (maxId > 0) return maxId;
            }
            const num = String(g.no_penerimaan).replace(/\D/g, "");
            return Number(num) || 0;
        };

        result.sort((a, b) => {
            const noA = (a.no_penerimaan || "").trim();
            const noB = (b.no_penerimaan || "").trim();

            const comp = noA.localeCompare(noB, undefined, { numeric: true, sensitivity: 'base' });
            if (comp !== 0) {
                return sortOrder === "terbaru" ? -comp : comp;
            }

            const timeA = parseSortDate(a);
            const timeB = parseSortDate(b);
            return sortOrder === "terbaru" ? timeB - timeA : timeA - timeB;
        });

        return result;
    }, [barang, selectedKode, keyword, tglDari, tglSampai, kategoriFilter, statusExpiredFilter, sortOrder]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [groupedPenerimaan.length]);

    const totalPages = Math.ceil(groupedPenerimaan.length / itemsPerPage);
    const paginatedPenerimaan = groupedPenerimaan.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getGroupStatusBadge = (items) => {
        let worstInfo = null;
        let worstKey = "aman";

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

    const handleDetailGroup = (group) => {
        setSelectedPenerimaan(group);
        setShowDetailModal(true);
    };

    const resetFilters = () => {
        setSelectedKode("");
        setProductSearch("");
        setShowProductDropdown(false);
        setTglDari("");
        setTglSampai("");
        setKategoriFilter("");
        setStatusExpiredFilter("");
        setKeyword("");
        setSortOrder("terbaru");
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams();
        if (selectedKode) params.append("kode_produk", selectedKode);
        if (tglDari) params.append("tgl_dari", tglDari);
        if (tglSampai) params.append("tgl_sampai", tglSampai);
        if (kategoriFilter) params.append("kategori", kategoriFilter);
        if (statusExpiredFilter) params.append("statusExpired", statusExpiredFilter);
        if (keyword) params.append("q", keyword);

        const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "";
        window.open(`${baseUrl}/api/data/export/penerimaan?${params.toString()}`, "_blank");
    };

    const totalJenis = useMemo(() => groupedPenerimaan.reduce((acc, g) => acc + g.items.length, 0), [groupedPenerimaan]);
    const totalUnit = useMemo(() => groupedPenerimaan.reduce((acc, g) => acc + g.total_unit, 0), [groupedPenerimaan]);

    const activeProduct = productList.find(p => p.kode === selectedKode);
    const isExactSelectedText = activeProduct && productSearch === `[${formatKodeProduk(activeProduct.kode)}] ${activeProduct.nama}`;

    const activeFilterText = useMemo(() => {
        const parts = [];
        if (activeProduct) parts.push(`Produk: ${activeProduct.nama} (${formatKodeProduk(activeProduct.kode)})`);
        if (kategoriFilter) parts.push(`Kategori: ${kategoriFilter}`);
        if (statusExpiredFilter) {
            const labels = {
                EXPIRED: "Expired (< 0 hr)",
                KRITIS: "Kritis (<= 30 hr)",
                DIPERHATIKAN: "Diperhatikan (31-60 hr)",
                AMAN: "Aman (> 60 hr)",
                NON_EXPIRED: "Non-Expired (5 Thn)"
            };
            parts.push(`Status: ${labels[statusExpiredFilter] || statusExpiredFilter}`);
        }
        if (tglDari || tglSampai) parts.push(`Periode Masuk: ${tglDari || "Awal"} s.d. ${tglSampai || "Saat Ini"}`);
        if (keyword.trim()) parts.push(`Kata Kunci: "${keyword.trim()}"`);
        return parts.length > 0 ? parts.join(" • ") : "Semua Data Penerimaan Barang (Tanpa Filter)";
    }, [activeProduct, kategoriFilter, statusExpiredFilter, tglDari, tglSampai, keyword]);

    return (
        <Container fluid className="px-3 px-md-4 py-3">
            {/* CSS CETAK PRINT DIRECT EXCEL STYLE */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible !important;
                    }
                    .print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10px !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .d-print-table {
                        display: table !important;
                    }
                    .excel-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border: 1.5px solid #000 !important;
                        margin-top: 10px !important;
                    }
                    .excel-table th {
                        background-color: #cbd5e1 !important;
                        color: #000 !important;
                        border: 1px solid #000 !important;
                        padding: 6px 6px !important;
                        font-size: 8.5pt !important;
                        font-weight: 800 !important;
                        text-align: center !important;
                        text-transform: uppercase !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .excel-table td {
                        border: 1px solid #000 !important;
                        padding: 5px 6px !important;
                        font-size: 8.5pt !important;
                        color: #000 !important;
                    }
                    .excel-table tfoot td {
                        background-color: #e2e8f0 !important;
                        border: 1px solid #000 !important;
                        font-weight: bold !important;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>

            <div className="print-area">
                {/* Header Cetak PDF Polosan (Judul Bold Tebal Jelas Center & Sub-Header Filter Aktif) */}
                <div className="d-none d-print-block mb-4 text-center">
                    <h2 className="fw-bold text-center text-dark text-uppercase mb-2" style={{ fontSize: "1.75rem", fontWeight: "900", letterSpacing: "1.5px" }}>
                        LAPORAN REKAPITULASI PENERIMAAN BARANG
                    </h2>
                    <p className="text-center text-dark mb-1" style={{ fontSize: "0.95rem" }}>
                        <strong>Filter Aktif:</strong> {activeFilterText}
                    </p>
                    <p className="text-center text-secondary mb-3" style={{ fontSize: "0.85rem" }}>
                        Ringkasan: <strong>{groupedPenerimaan.length} Transaksi ({totalJenis} Jenis Barang / {totalUnit} Unit)</strong> &bull; Dicetak: <strong>{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>
                    </p>
                    <div style={{ borderBottom: "2.5px solid #000", width: "100%", margin: "0 auto 20px auto" }}></div>
                </div>

                {/* Container Tampilan Aplikasi Normal (Layar Biasa) */}
                <div className="bg-white p-4 rounded-4 border shadow-sm">
                    {/* Header Page & Action Buttons */}
                    <Row className="mb-4 align-items-center no-print">
                        <Col md={6}>
                            <h3 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
                                <Receipt size={28} />
                                Rekap Penerimaan Barang
                            </h3>
                            <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
                                Rekapitulasi dan laporan riwayat penerimaan barang masuk dari supplier/pemasok.
                            </p>
                        </Col>

                        <Col md={6} className="text-md-end mt-3 mt-md-0">
                            <div className="d-flex gap-2 justify-content-md-end flex-wrap align-items-center">
                                <Button variant="success" size="sm" className="d-flex align-items-center gap-1.5 px-3 py-2 fw-bold shadow-sm" onClick={handleExportExcel}>
                                    <Download size={15} /> Export Excel
                                </Button>
                                <Button variant="dark" size="sm" className="d-flex align-items-center gap-1.5 px-3 py-2 fw-bold shadow-sm" onClick={handlePrint}>
                                    <Printer size={15} /> Cetak (PDF)
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    {/* Executive Summary Cards (Layar Biasa) */}
                    <Row className="g-3 mb-4 no-print">
                        <Col md={4}>
                            <Card className="border-0 bg-primary bg-opacity-10 text-primary rounded-3 shadow-sm h-100">
                                <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                                    <div>
                                        <div className="text-muted small fw-semibold text-uppercase">TOTAL TRANSAKSI PENERIMAAN</div>
                                        <h3 className="fw-bold mb-0 text-primary">{groupedPenerimaan.length} <span className="fs-6 fw-normal text-dark">Sesi Masuk</span></h3>
                                    </div>
                                    <Receipt size={32} className="opacity-75" />
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={4}>
                            <Card className="border-0 bg-info bg-opacity-10 text-dark rounded-3 shadow-sm h-100">
                                <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                                    <div>
                                        <div className="text-muted small fw-semibold text-uppercase">TOTAL JENIS BARANG DITERIMA</div>
                                        <h3 className="fw-bold mb-0 text-dark">{totalJenis} <span className="fs-6 fw-normal text-secondary">Jenis Produk</span></h3>
                                    </div>
                                    <BarChartLine size={32} className="text-info opacity-75" />
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={4}>
                            <Card className="border-0 bg-success bg-opacity-10 text-success rounded-3 shadow-sm h-100">
                                <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                                    <div>
                                        <div className="text-muted small fw-semibold text-uppercase">TOTAL VOLUME STOK MASUK</div>
                                        <h3 className="fw-bold mb-0 text-success">{totalUnit} <span className="fs-6 fw-normal text-dark">Unit / Pcs</span></h3>
                                    </div>
                                    <CalendarEvent size={32} className="opacity-75" />
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Filter Section (Non-Printable, Multi-Filter Rapi) */}
                    <Card className="shadow-sm border-0 mb-4 bg-light no-print">
                        <Card.Body className="p-3">
                            {/* Baris 1: Pencarian Produk, Keyword & Kategori */}
                            <Row className="g-2 mb-2">
                            <Col md={5} className="position-relative" ref={dropdownRef}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Pilih Barang:</Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white border-end-0">
                                            <Search size={13} className="text-muted" />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            className="border-start-0 ps-0 fw-semibold text-dark cursor-pointer"
                                            placeholder="Ketik / Pilih Nama Barang..."
                                            value={productSearch}
                                            onFocus={(e) => {
                                                e.target.select();
                                                setShowProductDropdown(true);
                                            }}
                                            onClick={(e) => {
                                                e.target.select();
                                                setShowProductDropdown(true);
                                            }}
                                            onChange={(e) => {
                                                setProductSearch(e.target.value);
                                                setShowProductDropdown(true);
                                                if (selectedKode && e.target.value === "") {
                                                    setSelectedKode("");
                                                }
                                            }}
                                        />
                                        {(selectedKode || productSearch) && (
                                            <Button
                                                variant="light"
                                                size="sm"
                                                className="border border-start-0 text-muted fw-bold"
                                                onClick={() => {
                                                    setSelectedKode("");
                                                    setProductSearch("");
                                                    setShowProductDropdown(false);
                                                }}
                                            >
                                                ✕
                                            </Button>
                                        )}
                                    </InputGroup>

                                    {/* Dropdown Menu Popup Overlay */}
                                    {showProductDropdown && (
                                        <div
                                            className="position-absolute w-100 bg-white border rounded shadow-lg mt-1"
                                            style={{ maxHeight: "250px", overflowY: "auto", zIndex: 1050, left: 0 }}
                                        >
                                            <div
                                                className={`p-2 small border-bottom fw-bold text-primary ${!selectedKode ? "bg-primary text-white" : ""}`}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => {
                                                    setSelectedKode("");
                                                    setProductSearch("");
                                                    setShowProductDropdown(false);
                                                }}
                                            >
                                                -- Semua Produk --
                                            </div>
                                            {productList
                                                .filter(p => {
                                                    if (!productSearch || isExactSelectedText) return true;
                                                    const q = productSearch.toLowerCase();
                                                    return (
                                                        (p.nama && p.nama.toLowerCase().includes(q)) ||
                                                        (p.kode && p.kode.toLowerCase().includes(q))
                                                    );
                                                })
                                                .map(p => (
                                                    <div
                                                        key={p.id || p.kode}
                                                        className={`p-2 small border-bottom d-flex align-items-center justify-content-between ${selectedKode === p.kode ? "bg-primary bg-opacity-10 fw-bold text-primary" : "text-dark"}`}
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => {
                                                            setSelectedKode(p.kode);
                                                            setProductSearch(`[${formatKodeProduk(p.kode)}] ${p.nama}`);
                                                            setShowProductDropdown(false);
                                                        }}
                                                    >
                                                        <span>{p.nama}</span>
                                                        <Badge bg="secondary" className="font-monospace ms-2">
                                                            {formatKodeProduk(p.kode)}
                                                        </Badge>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Pencarian Kata Kunci:</Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white border-end-0">
                                            <Search className="text-muted" size={13} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            className="border-start-0 ps-0 fw-semibold"
                                            placeholder="No Masuk / Penerima / Produk..."
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Kategori:</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={kategoriFilter}
                                        onChange={(e) => setKategoriFilter(e.target.value)}
                                        className="fw-semibold"
                                    >
                                        <option value="">Semua Kategori</option>
                                        {categories.map(c => (
                                            <option key={c.id || c.nama_kategori} value={c.nama_kategori}>{c.nama_kategori}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Baris 2: Rentang Tanggal, Status Expired, Urutan & Reset */}
                        <Row className="g-2 align-items-end">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Dari Tanggal:</Form.Label>
                                    <Form.Control
                                        type="date"
                                        size="sm"
                                        value={tglDari}
                                        onChange={(e) => setTglDari(e.target.value)}
                                        className="fw-semibold"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Sampai Tanggal:</Form.Label>
                                    <Form.Control
                                        type="date"
                                        size="sm"
                                        value={tglSampai}
                                        onChange={(e) => setTglSampai(e.target.value)}
                                        className="fw-semibold"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Status Expired:</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={statusExpiredFilter}
                                        onChange={(e) => setStatusExpiredFilter(e.target.value)}
                                        className="fw-semibold"
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="EXPIRED">Expired (&lt; 0 hr)</option>
                                        <option value="KRITIS">Kritis (&lt;= 30 hr)</option>
                                        <option value="DIPERHATIKAN">Diperhatikan (31-60 hr)</option>
                                        <option value="AMAN">Aman (&gt; 60 hr)</option>
                                        <option value="NON_EXPIRED">Non-Expired</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Urutan:</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="fw-semibold"
                                    >
                                        <option value="terbaru">Terbaru</option>
                                        <option value="terlama">Terlama</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={2} className="text-end">
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={resetFilters}
                                    disabled={!selectedKode && !productSearch && !tglDari && !tglSampai && !kategoriFilter && !statusExpiredFilter && !keyword && sortOrder === "terbaru"}
                                    className="w-100 fw-bold d-flex align-items-center justify-content-center"
                                    style={{ height: "31px" }}
                                    title="Reset Semua Filter"
                                >
                                    Reset Filter
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                    <div className="d-flex align-items-center gap-2 mb-3 no-print">
                        <Badge bg="primary" className="px-3 py-2 fs-6 fw-bold border shadow-sm">
                            {groupedPenerimaan.length} Transaksi ({totalJenis} Jenis / {totalUnit} Unit)
                        </Badge>
                    </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : (
                    <>
                        {/* TABEL 1: LAYAR APLIKASI BIASA (DILENGKAPI AKSI & PAGINASI, HIDE SAAT CETAK) */}
                        <Table responsive hover className="custom-table m-0 align-middle border rounded-3 shadow-sm mt-2 bg-white no-print">
                            <thead className="bg-primary text-white" style={{ background: "#0f4c81", color: "#ffffff" }}>
                                <tr>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary text-center" style={{ width: "40px" }}>No.</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">No. Masuk / Penerimaan</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Tanggal Masuk</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Petugas Penerima</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Jenis &amp; Total Unit</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Kategori</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary text-center">Status Expired</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary text-center no-print" style={{ width: "110px" }}>Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {groupedPenerimaan.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted py-5 fs-6">
                                            Tidak ada data penerimaan barang yang sesuai dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedPenerimaan.map((group, index) => (
                                        <tr key={group.no_penerimaan}>
                                            <td className="fw-bold text-secondary text-center px-3 fs-6">{((currentPage - 1) * 10) + index + 1}</td>
                                            <td className="px-3">
                                                <span className="badge-code-in">
                                                    {group.no_penerimaan}
                                                </span>
                                            </td>
                                            <td className="px-3">
                                                <div className="fw-bold text-dark fs-6">
                                                    {group.tanggal_masuk}
                                                </div>
                                            </td>
                                            <td className="px-3">
                                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-2 py-1 fs-6 fw-bold">
                                                    {group.penerima}
                                                </span>
                                            </td>
                                            <td className="px-3">
                                                {group.items.length === 1 ? (
                                                    <div className="d-flex flex-column gap-1">
                                                        <div className="fw-bold text-dark fs-6">
                                                            {group.items[0].nama_produk}
                                                        </div>
                                                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                                            <span className="badge bg-success px-2 py-0.5 fs-6 fw-bold">
                                                                {group.items[0].jumlah} {group.items[0].satuan || "Pcs"}
                                                            </span>
                                                            <span className="badge bg-light text-dark border px-2 py-0.5 fs-6">
                                                                Exp: {group.items[0].tanggal_expired}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-column gap-1">
                                                        <div className="fw-bold text-dark fs-6 text-truncate" style={{ maxWidth: "340px" }} title={group.items.map(i => `${i.nama_produk} (${i.jumlah} ${i.satuan || 'Pcs'})`).join(", ")}>
                                                            {group.items.map(i => i.nama_produk).join(", ")}
                                                        </div>
                                                        <div className="d-flex align-items-center gap-1">
                                                            <span className="badge bg-light text-secondary border px-2 py-0.5 fs-6" style={{ fontWeight: "600" }}>
                                                                {group.items.length} Jenis Barang ({group.total_unit} Unit)
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3">
                                                {group.kategori_list && (
                                                    <span className="badge bg-primary text-white px-2 py-1 fs-6 fw-bold">
                                                        {group.kategori_list}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 text-center">
                                                {getGroupStatusBadge(group.items)}
                                            </td>
                                            <td className="text-center px-3 no-print">
                                                <Button
                                                    size="sm"
                                                    variant="info"
                                                    onClick={() => handleDetailGroup(group)}
                                                    className="fw-bold px-2.5 py-1 fs-6 text-dark d-flex align-items-center gap-1 shadow-sm mx-auto"
                                                    title="Lihat Rincian Barang Diterima"
                                                >
                                                    <EyeFill size={14} /> Detail
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>

                        {/* TABEL 2: DEDICATED CETAK PRINT / PDF (EXCEL-STYLE ROWSPAN MERGED PER NOMOR PENERIMAAN) */}
                        <table className="excel-table w-100 border border-dark m-0 align-middle d-none d-print-table">
                            <thead>
                                <tr>
                                    <th className="text-center" style={{ width: "30px" }}>No.</th>
                                    <th style={{ width: "120px" }}>No. Masuk</th>
                                    <th style={{ width: "80px" }}>Tgl Masuk</th>
                                    <th style={{ width: "95px" }}>Penerima</th>
                                    <th style={{ width: "85px" }}>Kode</th>
                                    <th>Nama Barang / Produk</th>
                                    <th className="text-center" style={{ width: "55px" }}>Jumlah</th>
                                    <th className="text-center" style={{ width: "50px" }}>Satuan</th>
                                    <th className="text-center" style={{ width: "85px" }}>Tgl Expired</th>
                                    <th style={{ width: "90px" }}>Lokasi</th>
                                    <th style={{ width: "80px" }}>Kategori</th>
                                    <th className="text-center" style={{ width: "65px" }}>Total Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedPenerimaan.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="text-center py-4">
                                            Tidak ada data penerimaan barang.
                                        </td>
                                    </tr>
                                ) : (
                                    groupedPenerimaan.map((group, groupIdx) => {
                                        const itemCount = group.items.length || 1;
                                        return group.items.map((item, itemIdx) => (
                                            <tr key={`${group.no_penerimaan}_${item.id || item.kode_produk}_${itemIdx}`}>
                                                {itemIdx === 0 && (
                                                    <>
                                                        <td rowSpan={itemCount} className="text-center align-middle">{groupIdx + 1}</td>
                                                        <td rowSpan={itemCount} className="align-middle"><span className="badge-code-in">{group.no_penerimaan}</span></td>
                                                        <td rowSpan={itemCount} className="align-middle">{group.tanggal_masuk}</td>
                                                        <td rowSpan={itemCount} className="align-middle">{group.penerima}</td>
                                                    </>
                                                )}
                                                <td><span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span></td>
                                                <td className="fw-bold">{item.nama_produk}</td>
                                                <td className="text-center fw-bold">{item.jumlah}</td>
                                                <td className="text-center">{item.satuan || "Pcs"}</td>
                                                <td className="text-center fw-bold">
                                                    {Number(item.is_no_expired) === 1 ? "Non-Exp" : item.tanggal_expired}
                                                </td>
                                                <td>{item.lokasi || "-"}</td>
                                                {itemIdx === 0 && (
                                                    <>
                                                        <td rowSpan={itemCount} className="text-center align-middle">{group.kategori_list || "-"}</td>
                                                        <td rowSpan={itemCount} className="text-center fw-bold align-middle">{group.total_unit}</td>
                                                    </>
                                                )}
                                            </tr>
                                        ));
                                    })
                                )}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="6" className="text-end fw-bold py-2 px-2">TOTAL RINGKASAN REKAPITULASI:</td>
                                    <td className="text-center fw-bold py-2 px-2">{totalUnit}</td>
                                    <td colSpan="5" className="fw-bold py-2 px-2">Unit / Pcs ({totalJenis} Jenis Barang / {groupedPenerimaan.length} Transaksi)</td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Pagination Controls (Layar Biasa) */}
                        {totalPages > 1 && (
                            <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top no-print">
                                <div className="small text-muted fw-semibold">
                                    Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-dark fw-bold">{Math.min(currentPage * 10, groupedPenerimaan.length)}</span> dari <span className="text-dark fw-bold">{groupedPenerimaan.length}</span> penerimaan (Hal. {currentPage}/{totalPages})
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <Button variant="outline-primary" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="fw-bold">&laquo; Prev</Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                        .map((p, i, arr) => (
                                            <span key={p} className="d-flex align-items-center">
                                                {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-muted">...</span>}
                                                <Button variant={p === currentPage ? "primary" : "outline-secondary"} size="sm" onClick={() => setCurrentPage(p)} style={{ minWidth: "32px" }} className="fw-bold">{p}</Button>
                                            </span>
                                        ))
                                    }
                                    <Button variant="outline-primary" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="fw-bold">Next &raquo;</Button>
                                </div>
                            </div>
                        )}

                    </>
                )}
                </div>
            </div>

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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPenerimaan.items.map((item, idx) => (
                                            <tr key={item.kode_produk}>
                                                <td className="text-muted fs-6">{idx + 1}</td>
                                                <td className="fw-bold text-primary font-monospace fs-6">
                                                    {formatKodeProduk(item.kode_produk)}
                                                </td>
                                                <td className="fw-bold text-dark fs-6">{item.nama_produk}</td>
                                                <td className="text-center">
                                                    <span className="badge bg-success px-2.5 py-1 fs-6 fw-bold">
                                                        {item.jumlah} {item.satuan || "Pcs"}
                                                    </span>
                                                </td>
                                                <td className="fw-bold text-dark fs-6">
                                                    {Number(item.is_no_expired) === 1 ? (
                                                        <span className="badge bg-info text-dark px-2 py-1 fs-6">5 Thn (Non-Expired)</span>
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
                                                        const info = getExpiredInfo(item.sisa_hari, item.is_no_expired);
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Modal.Body>
                    <Modal.Footer className="border-top bg-white px-3 py-2 justify-content-end">
                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                            Tutup
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </Container>
    );
}

export default LaporanPenerimaan;
