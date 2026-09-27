import { useState, useEffect, useRef, useTransition } from "react";
import { Container, Row, Col, Table, Card, Button, Form, Spinner, Badge, InputGroup, Pagination } from "react-bootstrap";
import { Printer, Download, Search, GeoAltFill, ArrowDownCircleFill, ArrowUpCircleFill, BoxSeam } from "react-bootstrap-icons";
import logoGedung from "../assets/logogedung.png";
import { formatKodeProduk } from "../utils";

const getTodayFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const getFirstDayOfMonthFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
};

const getThreeMonthsAgoFormatted = () => {
    const today = new Date();
    today.setMonth(today.getMonth() - 3);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
};

export default function KartuStok() {
    const [mutasiData, setMutasiData] = useState([]);
    const [summary, setSummary] = useState({ total_masuk: 0, total_keluar: 0, saldo_akhir: 0, total_transaksi: 0 });
    const [loading, setLoading] = useState(true);

    // Master Dropdown List
    const [productList, setProductList] = useState([]);
    const [categories, setCategories] = useState([]);

    // Filter States
    const [selectedKode, setSelectedKode] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const [tglDari, setTglDari] = useState("");
    const [tglSampai, setTglSampai] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [keyword, setKeyword] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [mutasiData.length]);

    const totalPages = Math.ceil(mutasiData.length / itemsPerPage);
    const paginatedMutasi = mutasiData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef(null);

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

    // Fetch Master Data (Nama Barang & Kategori) for dropdowns
    useEffect(() => {
        fetch("/api/nama-barang")
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    setProductList(res.data || []);
                }
            })
            .catch(err => console.error("Gagal memuat master produk:", err));

        fetch("/api/kategori")
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    setCategories(res.data || []);
                }
            })
            .catch(err => console.error("Gagal memuat kategori:", err));
    }, []);

    // Load Kartu Stok Data from Backend
    const loadKartuStok = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedKode) params.append("kode_produk", selectedKode);
        if (tglDari) params.append("tgl_dari", tglDari);
        if (tglSampai) params.append("tgl_sampai", tglSampai);
        if (kategoriFilter) params.append("kategori", kategoriFilter);
        if (keyword) params.append("q", keyword);

        fetch(`/api/barang/kartu-stok?${params.toString()}`)
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    setMutasiData(res.data || []);
                    setSummary(res.summary || { total_masuk: 0, total_keluar: 0, saldo_akhir: 0, total_transaksi: 0 });
                } else {
                    setMutasiData([]);
                }
            })
            .catch(err => {
                console.error("Gagal memuat data kartu stok:", err);
                setMutasiData([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadKartuStok();
    }, [selectedKode, tglDari, tglSampai, kategoriFilter, keyword]);

    const resetFilters = () => {
        setSelectedKode("");
        setProductSearch("");
        setShowProductDropdown(false);
        setTglDari("");
        setTglSampai("");
        setKategoriFilter("");
        setKeyword("");
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
        if (keyword) params.append("q", keyword);

        const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3000" : "";
        window.open(`${baseUrl}/api/data/export/kartu-stok?${params.toString()}`, "_blank");
    };

    // Render detail label produk yang dipilih
    const activeProduct = productList.find(p => p.kode === selectedKode);
    const isExactSelectedText = activeProduct && productSearch === `[${formatKodeProduk(activeProduct.kode)}] ${activeProduct.nama}`;

    return (
        <Container fluid className="px-3 px-md-4 py-3">
            {/* CSS CETAK PRINT DIRECT */}
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
                        padding: 15px !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .custom-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border: 1px solid #000 !important;
                    }
                    .custom-table th, .custom-table td {
                        border: 1px solid #333 !important;
                        padding: 6px 8px !important;
                        font-size: 9.5pt !important;
                        color: #000 !important;
                    }
                    .custom-table thead {
                        background-color: #e2e8f0 !important;
                        color: #000 !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .kop-surat {
                        display: flex !important;
                        align-items: center !important;
                        border-bottom: 3px double #000 !important;
                        padding-bottom: 12px !important;
                        margin-bottom: 20px !important;
                    }
                }
            `}</style>

            <div className="print-area">
                {/* Header Kop Surat Istana Kepresidenan */}
                <div className="kop-surat d-flex align-items-center gap-3 border-bottom border-dark border-3 pb-3 mb-4">
                    <img
                        src={logoGedung}
                        alt="Logo Istana"
                        style={{ height: "75px", width: "auto" }}
                        className="object-fit-contain"
                    />
                    <div>
                        <h4 className="fw-bold mb-0 text-dark tracking-wide text-uppercase" style={{ fontSize: "1.25rem" }}>
                            ISTANA KEPRESIDENAN YOGYAKARTA
                        </h4>
                        <h6 className="fw-bold text-secondary mb-1" style={{ fontSize: "0.95rem" }}>
                            SUBBAGIAN RUMAH TANGGA &amp; PERLENGKAPAN
                        </h6>
                        <p className="small text-muted mb-0" style={{ fontSize: "0.8rem" }}>
                            Jl. Ahmad Yani No. 3, Yogyakarta 55122 • Telp. (0274) 512005
                        </p>
                    </div>
                    <div className="ms-auto text-end no-print d-flex align-items-center gap-2">
                        <Button
                            variant="success"
                            size="sm"
                            className="d-flex align-items-center gap-1.5 px-3 py-1.5 fw-bold shadow-sm"
                            onClick={handleExportExcel}
                        >
                            <Download size={14} /> Export Excel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            className="d-flex align-items-center gap-1.5 px-3 py-1.5 fw-bold shadow-sm"
                            onClick={handlePrint}
                        >
                            <Printer size={14} /> Cetak Laporan
                        </Button>
                    </div>
                </div>

                {/* Info Laporan & Header Mutasi */}
                <div className="mb-3">
                    <h5 className="fw-bold text-dark mb-1">
                        KARTU STOK &amp; LAPORAN MUTASI BARANG
                    </h5>
                    <p className="text-secondary small mb-0 fw-semibold">
                        {activeProduct
                            ? `PRODUK: ${activeProduct.nama} (${formatKodeProduk(activeProduct.kode)})`
                            : "SEMUA MUTASI BARANG (MASUK & KELUAR)"}
                    </p>
                    {(tglDari || tglSampai) && (
                        <p className="text-muted small italic mb-0">
                            Periode Mutasi: {tglDari || "Awal"} s.d. {tglSampai || "Hari Ini"}
                        </p>
                    )}
                </div>

                {/* Filter Section (Non-Printable, Multi-Filter Rapi Identik dengan Rekap Laporan) */}
                <Card className="shadow-sm border-0 mb-4 bg-light no-print">
                    <Card.Body className="p-3">
                        {/* Baris 1: Pencarian Produk, Keyword & Kategori */}
                        <Row className="g-2 mb-2">
                            <Col md={5} className="position-relative" ref={dropdownRef}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Pilih Barang / Produk:</Form.Label>
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
                                                    const term = productSearch.toLowerCase();
                                                    return (
                                                        p.nama?.toLowerCase().includes(term) ||
                                                        String(p.kode).includes(term) ||
                                                        formatKodeProduk(p.kode).toLowerCase().includes(term)
                                                    );
                                                })
                                                .map(p => (
                                                    <div
                                                        key={p.kode}
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
                                            placeholder="Cari No Ref / Lokasi / Keterangan..."
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Kategori Barang:</Form.Label>
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

                        {/* Baris 2: Rentang Tanggal Mutasi & Reset Filter */}
                        <Row className="g-2 align-items-end mb-2">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Tanggal Mutasi (Awal):</Form.Label>
                                    <Form.Control
                                        type="date"
                                        size="sm"
                                        value={tglDari}
                                        onChange={(e) => setTglDari(e.target.value)}
                                        className="fw-semibold"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Tanggal Mutasi (Akhir):</Form.Label>
                                    <Form.Control
                                        type="date"
                                        size="sm"
                                        value={tglSampai}
                                        onChange={(e) => setTglSampai(e.target.value)}
                                        className="fw-semibold"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={4} className="text-end">
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={resetFilters}
                                    disabled={!selectedKode && !productSearch && !tglDari && !tglSampai && !kategoriFilter && !keyword}
                                    className="w-100 fw-bold d-flex align-items-center justify-content-center"
                                    style={{ height: "31px" }}
                                    title="Reset Semua Filter"
                                >
                                    Reset Filter
                                </Button>
                            </Col>
                        </Row>

                        {/* Baris 3: Pilihan Periode Tanggal */}
                        <Row className="g-2 pt-2 border-top">
                            <Col md={12} className="d-flex align-items-center gap-1 flex-wrap">
                                <span className="fw-semibold text-secondary me-2" style={{ fontSize: "0.8rem" }}>Pilihan Periode:</span>
                                <Button
                                    variant={tglDari === getTodayFormatted() && tglSampai === getTodayFormatted() ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        const today = getTodayFormatted();
                                        setTglDari(today);
                                        setTglSampai(today);
                                    }}
                                >
                                    Hari Ini
                                </Button>
                                <Button
                                    variant={tglDari === getFirstDayOfMonthFormatted() && tglSampai === getTodayFormatted() ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        setTglDari(getFirstDayOfMonthFormatted());
                                        setTglSampai(getTodayFormatted());
                                    }}
                                >
                                    Bulan Ini
                                </Button>
                                <Button
                                    variant={tglDari === getThreeMonthsAgoFormatted() && tglSampai === getTodayFormatted() ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        setTglDari(getThreeMonthsAgoFormatted());
                                        setTglSampai(getTodayFormatted());
                                    }}
                                >
                                    3 Bulan Terakhir
                                </Button>
                                <Button
                                    variant={!tglDari && !tglSampai ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        setTglDari("");
                                        setTglSampai("");
                                    }}
                                >
                                    Semua Tanggal
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Info Alert Banner jika belum pilih produk */}
                {!selectedKode && (
                    <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2 border-info border-opacity-25 shadow-sm no-print" style={{ fontSize: "0.85rem" }}>
                        <BoxSeam size={16} className="text-info flex-shrink-0" />
                        <div>
                            <strong>Tampilan Akumulasi Seluruh Produk:</strong> Data di bawah menyajikan rekapitulasi kumulatif dari <strong>seluruh barang</strong>. Untuk menampilkan Kartu Stok produk tertentu, silakan pilih nama barang pada kolom pencarian di atas.
                        </div>
                    </div>
                )}

                {/* Summary Executive Cards */}
                <Row className="g-2 mb-3">
                    {tglDari && (
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-warning bg-opacity-10 border-start border-warning border-4">
                                <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                                    <div>
                                        <div className="text-warning-emphasis fw-bold" style={{ fontSize: "0.75rem" }}>
                                            Saldo Awal ({tglDari})
                                        </div>
                                        <h5 className="fw-bold text-dark mb-0">{(summary.saldo_awal || 0).toLocaleString("id-ID")} Unit</h5>
                                    </div>
                                    <BoxSeam size={24} className="text-warning opacity-75" />
                                </Card.Body>
                            </Card>
                        </Col>
                    )}
                    <Col md={tglDari ? 3 : 4}>
                        <Card className="border-0 shadow-sm bg-success bg-opacity-10 border-start border-success border-4">
                            <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="text-success fw-bold" style={{ fontSize: "0.75rem" }}>
                                        {tglDari ? "Barang Masuk Periode Ini (+)" : "Total Barang Masuk (+)"}
                                    </div>
                                    <h5 className="fw-bold text-success mb-0">{(summary.total_masuk || 0).toLocaleString("id-ID")} Unit</h5>
                                </div>
                                <ArrowDownCircleFill size={24} className="text-success opacity-75" />
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={tglDari ? 3 : 4}>
                        <Card className="border-0 shadow-sm bg-danger bg-opacity-10 border-start border-danger border-4">
                            <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="text-danger fw-bold" style={{ fontSize: "0.75rem" }}>Total Barang Keluar (-)</div>
                                    <h5 className="fw-bold text-danger mb-0">{(summary.total_keluar || 0).toLocaleString("id-ID")} Unit</h5>
                                </div>
                                <ArrowUpCircleFill size={24} className="text-danger opacity-75" />
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={tglDari ? 3 : 4}>
                        <Card className="border-0 shadow-sm bg-primary bg-opacity-10 border-start border-primary border-4">
                            <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="text-primary fw-bold" style={{ fontSize: "0.75rem" }}>Saldo Akhir Stok</div>
                                    <h5 className="fw-bold text-primary mb-0">{(summary.saldo_akhir || 0).toLocaleString("id-ID")} Unit</h5>
                                </div>
                                <BoxSeam size={24} className="text-primary opacity-75" />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Header Buttons Print & Action */}
                <div className="d-flex align-items-center justify-content-between mb-3 no-print">
                    <div className="small text-muted fw-semibold">
                        Menampilkan <span className="text-dark fw-bold">{mutasiData.length}</span> catatan mutasi transaksi.
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="success" size="sm" className="d-flex align-items-center gap-1.5 px-3 py-2 fw-bold shadow-sm" onClick={handleExportExcel}>
                            <Download size={15} /> Export Excel Kartu Stok
                        </Button>
                        <Button variant="dark" size="sm" className="d-flex align-items-center gap-1.5 px-3 py-2 fw-bold shadow-sm" onClick={handlePrint}>
                            <Printer size={15} /> Cetak Kartu Stok (PDF)
                        </Button>
                    </div>
                </div>

                {/* Tabel Kartu Stok & Running Balance */}
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <div className="mt-2 text-muted small">Memuat kartu stok mutasi...</div>
                    </div>
                ) : (
                    <>
                        <Table responsive hover className="custom-table border align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th style={{ width: "40px" }} className="text-center">#</th>
                                    <th style={{ width: "110px" }} className="text-center">Tanggal</th>
                                    <th style={{ width: "110px" }} className="text-center">Mutasi</th>
                                    <th>No. Referensi</th>
                                    <th>Kode &amp; Nama Produk</th>
                                    <th style={{ width: "100px" }} className="text-center text-success">Masuk (+)</th>
                                    <th style={{ width: "100px" }} className="text-center text-danger">Keluar (-)</th>
                                    <th style={{ width: "110px" }} className="text-center bg-primary text-white">Saldo Sisa</th>
                                    <th>Lokasi / Gudang</th>
                                    <th>Keterangan / Penerima / Pemakai</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mutasiData.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4 text-muted fw-semibold">
                                            Tidak ada riwayat mutasi stok barang yang sesuai dengan kriteria filter.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedMutasi.map((item, idx) => {
                                        const isSaldoAwal = item.jenis === "SALDO_AWAL";
                                        const isMasuk = item.jenis === "MASUK";

                                        if (isSaldoAwal) {
                                            return (
                                                <tr key="saldo-awal" className="table-warning border-bottom border-warning">
                                                    <td className="text-center fw-bold text-dark">-</td>
                                                    <td className="text-center font-monospace fw-bold text-dark">{item.tanggal}</td>
                                                    <td className="text-center">
                                                        <Badge bg="warning" text="dark" className="px-2.5 py-1.5 fw-bold">
                                                            SALDO AWAL
                                                        </Badge>
                                                    </td>
                                                    <td className="fw-bold font-monospace text-secondary small">SALDO-AWAL</td>
                                                    <td>
                                                        <div className="fw-bold text-dark">{item.nama_produk}</div>
                                                    </td>
                                                    <td className="text-center text-muted">-</td>
                                                    <td className="text-center text-muted">-</td>
                                                    <td className="text-center fw-bold fs-6 text-dark bg-warning bg-opacity-25 border-start border-end border-warning">
                                                        {item.saldo_sisa} Unit
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-white text-dark border px-2 py-1">Gudang Utama</span>
                                                    </td>
                                                    <td className="small text-dark fw-bold italic">
                                                        {item.keterangan}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={`${item.jenis}-${item.id}-${idx}`}>
                                                <td className="text-center fw-semibold text-muted">{((currentPage - 1) * 10) + idx + 1}</td>
                                                <td className="text-center font-monospace fw-semibold">{item.tanggal || "-"}</td>
                                                <td className="text-center">
                                                    {isMasuk ? (
                                                        <Badge bg="success" className="px-2.5 py-1">MASUK</Badge>
                                                    ) : (
                                                        <Badge bg="danger" className="px-2.5 py-1">KELUAR</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={isMasuk ? "badge-code-in" : "badge-code-out"}>
                                                        {item.no_ref || "-"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-bold text-dark">{item.nama_produk}</div>
                                                    {item.kode_produk && item.kode_produk !== "-" && (
                                                        <div className="mt-1"><span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span></div>
                                                    )}
                                                </td>
                                                <td className="text-center fw-bold text-success fs-6">
                                                    {item.qty_masuk > 0 ? `+${item.qty_masuk}` : "-"}
                                                </td>
                                                <td className="text-center fw-bold text-danger fs-6">
                                                    {item.qty_keluar > 0 ? `-${item.qty_keluar}` : "-"}
                                                </td>
                                                <td className="text-center fw-bold fs-6 text-primary bg-primary bg-opacity-10 border-start border-end border-primary border-opacity-25">
                                                    {item.saldo_sisa} {item.satuan || "Pcs"}
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border px-2 py-1">
                                                        <GeoAltFill size={10} className="text-danger me-1" />
                                                        {item.lokasi || "Gudang Utama"}
                                                    </span>
                                                </td>
                                        <td className="small text-secondary fw-semibold">
                                                    {item.keterangan || "-"}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </Table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top no-print">
                                <div className="small text-muted fw-semibold">
                                    Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-dark fw-bold">{Math.min(currentPage * 10, mutasiData.length)}</span> dari <span className="text-dark fw-bold">{mutasiData.length}</span> mutasi (Hal. {currentPage}/{totalPages})
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

                        {/* Footer Tanda Tangan Resmi Audit */}
                        <div className="mt-5 pt-4">
                            <Row className="justify-content-between text-center" style={{ fontSize: "0.9rem" }}>
                                <Col md={5} className="mb-4">
                                    <p className="mb-1 fw-bold">Mengetahui,</p>
                                    <p className="fw-semibold text-secondary mb-5">
                                        Kepala Subbagian Rumah Tangga &amp; Perlengkapan
                                    </p>
                                    <div className="border-bottom border-dark w-75 mx-auto mb-1"></div>
                                    <p className="small text-muted mb-0">NIP. 19780512 200604 1 002</p>
                                </Col>
                                <Col md={5} className="mb-4">
                                    <p className="mb-1 fw-bold">Yogyakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                    <p className="fw-semibold text-secondary mb-5">
                                        Petugas Pengelola &amp; Pengurus Barang
                                    </p>
                                    <div className="border-bottom border-dark w-75 mx-auto mb-1"></div>
                                    <p className="small text-muted mb-0">Pengurus Barang Inventaris</p>
                                </Col>
                            </Row>
                        </div>
                    </>
                )}
            </div>
        </Container>
    );
}
