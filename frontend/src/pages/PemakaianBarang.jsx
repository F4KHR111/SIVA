import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
    Container, Row, Col, Card, Table, Button, Form, Spinner, Badge, Modal, Pagination
} from "react-bootstrap";
import { BoxSeam, PlusLg, Search, Trash, CalendarEvent, PersonFill, Receipt, EyeFill, Box, PencilFill, PrinterFill } from "react-bootstrap-icons";
import ModalPemakaian from "../../components/ModalPemakaian";
import { formatKodeProduk } from "../utils";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

const API_PEMAKAIAN = "http://localhost:3000/api/pemakaian";
const API_USERS = "http://localhost:3000/api/users";
const API_NAMA_BARANG = "http://localhost:3000/api/nama-barang";

const getTodayFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

function PemakaianBarang() {
    const { isCategoryAllowed } = useAuth();
    const { settings, fetchSettings } = useSettings();
    const [pemakaianList, setPemakaianList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Refresh global settings when PemakaianBarang page opens
    useEffect(() => {
        if (fetchSettings) fetchSettings();
    }, []);

    // Modal Create / Edit Pemakaian Keranjang State
    const [showModal, setShowModal] = useState(false);
    const [editOrderData, setEditOrderData] = useState(null);

    // Detail Order Modal State
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Order item to print state
    const [printOrderData, setPrintOrderData] = useState(null);

    const [bulanFilter, setBulanFilter] = useState("");
    const [tglDari, setTglDari] = useState("");
    const [tglSampai, setTglSampai] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const loadPemakaian = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm.trim()) params.set("q", searchTerm.trim());
            if (tglDari) params.set("tgl_dari", tglDari);
            if (tglSampai) params.set("tgl_sampai", tglSampai);
            if (bulanFilter) params.set("bulan", bulanFilter);

            const qs = params.toString();
            const url = qs ? `${API_PEMAKAIAN}?${qs}` : API_PEMAKAIAN;

            const res = await axios.get(url);
            if (res.data?.success) setPemakaianList(res.data.data || []);
        } catch (err) {
            console.error("Gagal memuat data pemakaian:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPemakaian();
    }, [bulanFilter, tglDari, tglSampai, searchTerm]);

    // Grouping data berdasarkan No. Order
    const groupedOrders = useMemo(() => {
        const map = new Map();

        pemakaianList.forEach(item => {
            if (!isCategoryAllowed(item.kategori)) return;

            const key = (item.no_order && item.no_order.trim() !== "") ? item.no_order.trim() : `ID-${item.id}`;

            if (!map.has(key)) {
                map.set(key, {
                    no_order: item.no_order || key,
                    tanggal_pemakaian: item.tanggal_pemakaian,
                    penerima: item.penerima,
                    keterangan: item.keterangan,
                    items: [],
                    total_unit: 0
                });
            }

            const group = map.get(key);
            group.items.push(item);
            group.total_unit += parseInt(item.jumlah, 10) || 0;
        });

        return Array.from(map.values());
    }, [pemakaianList]);

    // Filter pencarian pada data yang sudah di-grouping
    const filteredOrders = groupedOrders.filter(group => {
        const term = searchTerm.toLowerCase();
        const matchNoOrder = group.no_order && group.no_order.toLowerCase().includes(term);
        const matchPenerima = group.penerima && group.penerima.toLowerCase().includes(term);
        const matchItems = group.items.some(it =>
            (it.nama_produk && it.nama_produk.toLowerCase().includes(term)) ||
            (it.kode_produk && it.kode_produk.toLowerCase().includes(term))
        );
        return matchNoOrder || matchPenerima || matchItems;
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredOrders.length]);

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleHapusOrderGroup = async (group) => {
        if (window.confirm(`Batalkan seluruh transaksi No. Order "${group.no_order}" (${group.items.length} jenis barang, total ${group.total_unit} unit)? Stok seluruh barang akan dikembalikan.`)) {
            try {
                for (const item of group.items) {
                    await axios.delete(`${API_PEMAKAIAN}/${item.id}`);
                }
                alert(`Seluruh transaksi No. Order "${group.no_order}" berhasil dibatalkan.`);
                loadPemakaian();
                setShowDetailModal(false);
            } catch (err) {
                console.error("Gagal membatalkan transaksi:", err);
                alert("Gagal membatalkan transaksi.");
            }
        }
    };

    // Open Modal Tambah Pemakaian Baru
    const handleOpenTambah = () => {
        setEditOrderData(null);
        setShowModal(true);
    };

    // Open Modal Edit Pemakaian (Memakai ModalPemakaian yang Sama untuk Tambah & Edit)
    const handleOpenEditOrder = (group) => {
        setEditOrderData(group);
        setShowModal(true);
        setShowDetailModal(false);
    };

    const handleOpenEdit = handleOpenEditOrder;

    const handleOpenDetail = (group) => {
        setSelectedOrder(group);
        setShowDetailModal(true);
    };

    // Trigger Print Bon Barang (F4 Dipotong 2 Portrait) - Ambil Pengaturan Terbaru dari DB
    const handlePrintBon = async (group) => {
        if (fetchSettings) {
            await fetchSettings();
        }
        setPrintOrderData(group);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    // Format tanggal Indonesia e.g. "Yogyakarta, 03-08-2026"
    const formatTanggalIndo = (tglStr) => {
        if (!tglStr) return "";
        const parts = tglStr.split("-");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return tglStr;
    };

    // Perhitungan Skala Ukuran & Spasi Otomatis Cetak Bon berdasarkan Jumlah Item (Auto Fit F4/2 Portrait)
    const printScaleStyles = useMemo(() => {
        const count = printOrderData ? printOrderData.items.length : 0;

        if (count >= 10) {
            return { fontSz: "9.5px", cellPad: "2px 4px", spaceSign: "24px", marginFooter: "4px" };
        } else if (count >= 6) {
            return { fontSz: "10.5px", cellPad: "3px 5px", spaceSign: "30px", marginFooter: "8px" };
        } else if (count >= 4) {
            return { fontSz: "11.5px", cellPad: "4px 6px", spaceSign: "36px", marginFooter: "12px" };
        }
        return { fontSz: "13px", cellPad: "6px 8px", spaceSign: "45px", marginFooter: "16px" };
    }, [printOrderData]);

    return (
        <Container fluid className="p-4">

            {/* Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
                        <BoxSeam size={22} className="text-primary" />
                        Pemakaian Barang (Barang Keluar)
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
                        Riwayat pengeluaran &amp; pemakaian barang.
                    </p>
                </Col>
                <Col xs="auto">
                    <Button
                        variant="primary"
                        className="d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
                        onClick={handleOpenTambah}
                        id="btn-tambah-pemakaian"
                    >
                        <PlusLg size={16} /> Input Pemakaian Barang
                    </Button>
                </Col>
            </Row>

            {/* Filter & Search Card */}
            <Card className="border shadow-sm rounded-4 mb-4">
                <Card.Body className="p-3">
                    <Row className="g-3 align-items-center">
                        <Col md={4}>
                            <div className="position-relative">
                                <Form.Control
                                    placeholder="Cari No. Order, produk, atau penerima..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="ps-5"
                                    size="sm"
                                    id="input-search-pemakaian"
                                />
                                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={14} />
                            </div>
                        </Col>

                        <Col md={5} className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="fw-semibold text-secondary text-nowrap" style={{ fontSize: "0.85rem" }}>
                                Tanggal Keluar:
                            </span>
                            <div className="d-flex align-items-center gap-1">
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    style={{ width: "135px" }}
                                    value={tglDari}
                                    onChange={(e) => setTglDari(e.target.value)}
                                />
                                <span className="text-muted small">s.d.</span>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    style={{ width: "135px" }}
                                    value={tglSampai}
                                    onChange={(e) => setTglSampai(e.target.value)}
                                />
                            </div>
                            <div className="d-flex gap-1 ms-1">
                                <Button
                                    variant={tglDari === getTodayFormatted() && tglSampai === getTodayFormatted() ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2 fw-semibold"
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
                                    variant={!tglDari && !tglSampai ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        setTglDari("");
                                        setTglSampai("");
                                    }}
                                >
                                    Semua Tanggal
                                </Button>
                            </div>
                        </Col>

                        <Col md={3} className="text-md-end text-muted" style={{ fontSize: "0.85rem" }}>
                            Total Transaksi: <strong>{filteredOrders.length}</strong> Order
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

                    {/* Table Grouped by Order */}
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <div className="mt-2 text-muted" style={{ fontSize: "0.85rem" }}>Memuat riwayat pemakaian...</div>
                        </div>
                    ) : (
                        <>
                            <Table responsive hover className="custom-table align-middle border rounded-3 overflow-hidden shadow-sm m-0">
                                <thead>
                                    <tr>
                                        <th className="py-3 px-3 text-center" style={{ width: "50px" }}>No.</th>
                                        <th className="py-3 px-3 text-nowrap-cell" style={{ width: "160px" }}>No. Order</th>
                                        <th className="py-3 px-3 text-nowrap-cell" style={{ width: "110px" }}>Tanggal</th>
                                        <th className="py-3 px-3 text-nowrap-cell" style={{ width: "140px" }}>Pemakai / Penerima</th>
                                        <th className="py-3 px-3">Barang Keluar</th>
                                        <th className="py-3 px-3 text-nowrap-cell text-center" style={{ width: "150px" }}>Jumlah Keluar</th>
                                        <th style={{ width: "220px" }} className="py-3 px-3 text-center text-nowrap-cell">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-5">
                                                {searchTerm || bulanFilter
                                                    ? "Tidak ada transaksi pemakaian yang cocok dengan pencarian."
                                                    : "Belum ada transaksi pemakaian barang dicatat."}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedOrders.map((group, idx) => {
                                            const firstItem = group.items[0];
                                            const otherCount = group.items.length - 1;

                                            return (
                                                <tr key={group.no_order}>
                                                    <td className="fw-semibold text-muted text-center px-3">{((currentPage - 1) * 10) + idx + 1}</td>
                                                    <td className="px-3 text-nowrap-cell">
                                                        <span className="badge-code-out">
                                                            {group.no_order}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 text-nowrap-cell">
                                                        <div className="cell-bold">{group.tanggal_pemakaian}</div>
                                                    </td>
                                                    <td className="px-3 text-nowrap-cell">
                                                        <div className="fw-semibold text-dark">{group.penerima || "-"}</div>
                                                    </td>
                                                    <td className="px-3">
                                                        <div className="fw-bold text-dark text-truncate" style={{ maxWidth: "360px" }}>
                                                            {firstItem ? firstItem.nama_produk : "-"}
                                                            {otherCount > 0 && (
                                                                <span className="text-muted fw-normal ms-1 small">
                                                                    (+ {otherCount} produk lainnya)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 text-center text-nowrap-cell">
                                                        <span className="badge-unit-out">
                                                            -{group.total_unit} Unit ({group.items.length} Jenis)
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-3">
                                                        <div className="d-flex gap-1.5 justify-content-center">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() => handleOpenDetail(group)}
                                                                className="fw-semibold px-2 py-1 btn-sm d-flex align-items-center gap-1"
                                                                title="Lihat Detail Transaksi Order Ini"
                                                            >
                                                                <EyeFill size={13} /> Detail
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-secondary"
                                                                onClick={() => handleOpenEditOrder(group)}
                                                                className="fw-semibold px-2 py-1 btn-sm d-flex align-items-center gap-1 text-dark"
                                                                title="Edit Keranjang Pemakaian"
                                                            >
                                                                <PencilFill size={12} /> Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-success"
                                                                onClick={() => handlePrintBon(group)}
                                                                className="fw-semibold px-2 py-1 btn-sm d-flex align-items-center gap-1"
                                                                title="Cetak Bon Barang"
                                                            >
                                                                <PrinterFill size={12} /> Print
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                onClick={() => handleHapusOrderGroup(group)}
                                                                className="fw-semibold px-2 py-1 btn-sm"
                                                                title="Batalkan Seluruh Transaksi Order Ini"
                                                            >
                                                                <Trash size={12} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </Table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top">
                                    <div className="small text-muted fw-semibold">
                                        Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-dark fw-bold">{Math.min(currentPage * 10, filteredOrders.length)}</span> dari <span className="text-dark fw-bold">{filteredOrders.length}</span> order (Hal. {currentPage}/{totalPages})
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

            {/* Modal Pemakaian (Dapat Digunakan Untuk Tambah Baru & Edit Keranjang Transaksi) */}
            <ModalPemakaian
                show={showModal}
                handleClose={() => {
                    setShowModal(false);
                    setEditOrderData(null);
                }}
                refreshData={loadPemakaian}
                editData={editOrderData}
            />

            {/* MODAL DETAIL ORDER TRANSAKSI PEMAKAIAN */}
            {selectedOrder && (
                <Modal
                    show={showDetailModal}
                    onHide={() => setShowDetailModal(false)}
                    centered
                    size="lg"
                    scrollable={true}
                >
                    <Modal.Header closeButton className="border-bottom bg-light">
                        <Modal.Title className="fw-bold text-dark fs-5 d-flex align-items-center gap-2">
                            <Receipt className="text-primary" />
                            Detail Order Pemakaian: <span className="font-monospace text-primary">{selectedOrder.no_order}</span>
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">

                        {/* Header Info Order */}
                        <Card className="border-0 shadow-sm bg-primary bg-opacity-10 mb-4 rounded-3">
                            <Card.Body className="p-3">
                                <Row className="g-3">
                                    <Col md={4}>
                                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>Penerima Barang:</div>
                                        <div className="fw-bold text-primary fs-6">
                                            <PersonFill className="me-1" /> {selectedOrder.penerima || "-"}
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>Tanggal Pemakaian:</div>
                                        <div className="fw-bold text-dark fs-6">
                                            <CalendarEvent className="me-1 text-secondary" /> {selectedOrder.tanggal_pemakaian}
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>Total Pengeluaran:</div>
                                        <div className="fw-bold text-danger fs-6">
                                            {selectedOrder.items.length} Jenis ({selectedOrder.total_unit} Unit)
                                        </div>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        {/* Rincian Produk Dalam Order */}
                        <div className="fw-bold text-dark mb-2" style={{ fontSize: "0.9rem" }}>
                            RINCIAN PRODUK YANG DIKELUARKAN:
                        </div>

                        <Table responsive hover className="custom-table border rounded-3 m-0">
                            <thead className="bg-light">
                                <tr>
                                    <th style={{ width: "40px" }}>#</th>
                                    <th>Kode Produk</th>
                                    <th>Nama Barang</th>
                                    <th>Jumlah Keluar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrder.items.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="text-muted" style={{ fontSize: "0.85rem" }}>{idx + 1}</td>
                                        <td><span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span></td>
                                        <td className="fw-bold text-dark">{item.nama_produk}</td>
                                        <td>
                                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle px-2 py-1 fs-6 fw-bold">
                                                -{item.jumlah} Unit
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                    </Modal.Body>

                    <Modal.Footer className="border-top d-flex justify-content-between">
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-primary"
                                onClick={() => handleOpenEditOrder(selectedOrder)}
                                className="fw-bold d-flex align-items-center gap-1"
                            >
                                <PencilFill /> Edit Transaksi Order Ini
                            </Button>
                            <Button
                                variant="success"
                                onClick={() => handlePrintBon(selectedOrder)}
                                className="fw-bold d-flex align-items-center gap-2"
                            >
                                <PrinterFill /> Cetak Bon Barang (F4/2 Portrait)
                            </Button>
                        </div>

                        <div className="d-flex gap-2">
                            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                                Tutup
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => handleHapusOrderGroup(selectedOrder)}
                                className="fw-bold d-flex align-items-center gap-1"
                            >
                                <Trash /> Batalkan Order
                            </Button>
                        </div>
                    </Modal.Footer>
                </Modal>
            )}

            {/* AREA HIDDEN KHUSUS CETAK BON BARANG (PORTRAIT F4/2) */}
            {printOrderData && (
                <div id="area-cetak-bon" style={{
                    fontSize: settings?.print_font_size || printScaleStyles.fontSz,
                    minHeight: "145mm",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                }}>
                    <div>
                        <div style={{ width: "100%", textAlign: "center", marginBottom: "12px" }}>
                            <div style={{ fontSize: "1.35em", fontWeight: "bold", letterSpacing: "1px", lineHeight: "1.3" }}>
                                {settings?.print_kop_1 || "SEKRETARIAT PRESIDEN"}
                            </div>
                            <div style={{ fontSize: "1.35em", fontWeight: "bold", letterSpacing: "1px", lineHeight: "1.3", marginBottom: "8px" }}>
                                {settings?.print_kop_2 || "ISTANA KEPRESIDENAN YOGYAKARTA"}
                            </div>
                            <div style={{ fontSize: "1.7em", fontWeight: "bold", letterSpacing: "2px", marginTop: "6px" }}>
                                {settings?.print_judul_dokumen || "BON BARANG"}
                            </div>
                        </div>

                        <div style={{ fontSize: settings?.print_font_size || printScaleStyles.fontSz, marginBottom: "8px", lineHeight: "1.5" }}>
                            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: "85px" }}>No. Order</td>
                                        <td style={{ width: "12px" }}>:</td>
                                        <td style={{ fontWeight: "normal" }}>{printOrderData.no_order}</td>
                                    </tr>
                                    <tr>
                                        <td>NAMA</td>
                                        <td>:</td>
                                        <td style={{ fontWeight: "normal" }}>{printOrderData.penerima}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Tabel Produk Otomatis Menyesuaikan Skala Baris & Padding */}
                        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", fontSize: settings?.print_font_size || printScaleStyles.fontSz }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #000" }}>
                                    <th style={{ borderRight: "1px solid #000", padding: printScaleStyles.cellPad, width: "40px", textAlign: "center", fontWeight: "normal" }}>No.</th>
                                    <th style={{ borderRight: "1px solid #000", padding: printScaleStyles.cellPad, textAlign: "left", fontWeight: "normal" }}>Nama Barang</th>
                                    <th style={{ padding: printScaleStyles.cellPad, width: "100px", textAlign: "right", fontWeight: "normal" }}>Banyaknya</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printOrderData.items.map((it, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #000" }}>
                                        <td style={{ borderRight: "1px solid #000", padding: printScaleStyles.cellPad, textAlign: "center" }}>{i + 1}</td>
                                        <td style={{ borderRight: "1px solid #000", padding: printScaleStyles.cellPad }}>{it.nama_produk}</td>
                                        <td style={{ padding: printScaleStyles.cellPad, textAlign: "right" }}>{it.jumlah}</td>
                                    </tr>
                                ))}
                                <tr style={{ fontWeight: "normal" }}>
                                    <td colSpan="2" style={{ borderRight: "1px solid #000", padding: printScaleStyles.cellPad, textAlign: "left" }}>Total</td>
                                    <td style={{ padding: printScaleStyles.cellPad, textAlign: "right" }}>{printOrderData.total_unit}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Tanggal & Tanda Tangan (Posisi Pinned / Terkunci di Bawah Halaman Cetak) */}
                    <div className="area-ttd-footer" style={{ marginTop: "auto", paddingTop: "8px", fontSize: settings?.print_font_size || printScaleStyles.fontSz }}>
                        <div style={{ textAlign: "right", paddingRight: "20px", marginBottom: "4px" }}>
                            Yogyakarta, {formatTanggalIndo(printOrderData.tanggal_pemakaian)}
                        </div>

                        <table style={{ width: "100%", marginTop: "4px" }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: "50%", textAlign: "left", verticalAlign: "top" }}>
                                        {settings?.print_label_ttd_kiri || "Penerima"}
                                        <div style={{ height: settings?.print_space_signature || printScaleStyles.spaceSign }}></div>
                                        <div>_________________________</div>
                                        {printOrderData.penerima && (
                                            <div style={{ marginTop: "2px", fontWeight: "normal" }}>{printOrderData.penerima}</div>
                                        )}
                                    </td>
                                    <td style={{ width: "50%", textAlign: "right", verticalAlign: "top", paddingRight: "10px" }}>
                                        {settings?.print_label_ttd_kanan || "Petugas Persediaan"}
                                        <div style={{ height: settings?.print_space_signature || printScaleStyles.spaceSign }}></div>
                                        <div style={{ fontWeight: "normal" }}>
                                            {settings?.print_nama_petugas ? settings.print_nama_petugas : "_________________________"}
                                        </div>
                                        {settings?.print_nip_petugas && (
                                            <div style={{ fontSize: "0.85em", marginTop: "2px" }}>NIP. {settings.print_nip_petugas}</div>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </Container>
    );
}

export default PemakaianBarang;
