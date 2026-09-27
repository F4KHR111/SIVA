import { useEffect, useState, useMemo } from "react";
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
    Archive,
    Search,
    ArrowCounterclockwise,
    Trash,
    EyeFill,
    Receipt,
    Download,
    CalendarEvent,
    ArrowClockwise,
    PersonFill
} from "react-bootstrap-icons";

import { formatKodeProduk } from "../utils";
import { useSettings } from "../context/SettingsContext";

function ArsipBarang() {
    const { getExpiredInfo } = useSettings();
    const [allBarang, setAllBarang] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tglDari, setTglDari] = useState("");
    const [tglSampai, setTglSampai] = useState("");
    const [keyword, setKeyword] = useState("");
    const [filterBulanTahun, setFilterBulanTahun] = useState(""); // YYYY-MM

    // Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPenerimaan, setSelectedPenerimaan] = useState(null);

    const API_BARANG = "http://localhost:3000/api/barang";

    // Load Data Terarsip
    const loadData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (keyword.trim()) params.set("q", keyword.trim());
            if (tglDari) params.set("tgl_dari", tglDari);
            if (tglSampai) params.set("tgl_sampai", tglSampai);
            if (filterBulanTahun) params.set("bulan", filterBulanTahun);

            const qs = params.toString();
            const url = qs ? `${API_BARANG}/arsip?${qs}` : `${API_BARANG}/arsip`;

            const res = await axios.get(url);
            if (res.data && res.data.success) {
                setAllBarang(res.data.data || []);
            }
        } catch (err) {
            console.error("Gagal memuat data arsip:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [tglDari, tglSampai, keyword, filterBulanTahun]);

    // Filter items berdasarkan Filter Bulan-Tahun, Date Range, dan Keyword
    const filteredBarang = useMemo(() => {
        let filtered = [...allBarang];

        if (tglDari) {
            filtered = filtered.filter(item => {
                const str = item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "");
                return str >= tglDari;
            });
        }

        if (tglSampai) {
            filtered = filtered.filter(item => {
                const str = item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "");
                return str <= tglSampai;
            });
        }

        if (filterBulanTahun) {
            filtered = filtered.filter(item => {
                const str = item.tanggal_masuk || item.created_at || "";
                return str.slice(0, 7) === filterBulanTahun;
            });
        }

        if (keyword.trim() !== "") {
            const kw = keyword.toLowerCase();
            filtered = filtered.filter(item => (
                (item.no_penerimaan && item.no_penerimaan.toLowerCase().includes(kw)) ||
                (item.kode_produk && item.kode_produk.toLowerCase().includes(kw)) ||
                (item.nama_produk && item.nama_produk.toLowerCase().includes(kw)) ||
                (item.kategori && item.kategori.toLowerCase().includes(kw)) ||
                (item.lokasi && item.lokasi.toLowerCase().includes(kw)) ||
                (item.penerima && item.penerima.toLowerCase().includes(kw))
            ));
        }

        return filtered;
    }, [allBarang, tglDari, tglSampai, filterBulanTahun, keyword]);

    // Grouping per No. Penerimaan (No. Masuk)
    const groupedArsip = useMemo(() => {
        const map = new Map();

        filteredBarang.forEach(item => {
            const key = (item.no_penerimaan && item.no_penerimaan.trim() !== "")
                ? item.no_penerimaan.trim()
                : `TANPA-NO-${item.kode_produk}`;

            if (!map.has(key)) {
                map.set(key, {
                    no_penerimaan: item.no_penerimaan || key,
                    tanggal_masuk: item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "-"),
                    penerima: item.penerima || "-",
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

        return Array.from(map.values()).map(g => ({
            ...g,
            kategori_list: Array.from(g.kategori_set).join(", "),
            lokasi_list: Array.from(g.lokasi_set).join(", ")
        }));
    }, [filteredBarang]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [groupedArsip.length]);

    const totalPages = Math.ceil(groupedArsip.length / itemsPerPage);
    const paginatedArsip = groupedArsip.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const resetFilter = () => {
        setFilterBulanTahun("");
        setKeyword("");
    };

    // Action Handlers
    const handleDetailGroup = (group) => {
        setSelectedPenerimaan(group);
        setShowDetailModal(true);
    };

    const handlePulihkanGroup = async (group) => {
        if (window.confirm(`Pulihkan seluruh transaksi penerimaan "${group.no_penerimaan}" (${group.items.length} jenis barang, total ${group.total_unit} unit) kembali ke stok aktif?`)) {
            try {
                await axios.put(`${API_BARANG}/pulihkan-penerimaan/${encodeURIComponent(group.no_penerimaan)}`);
                alert(`Seluruh transaksi penerimaan "${group.no_penerimaan}" berhasil dipulihkan ke stok aktif.`);
                loadData();
                setShowDetailModal(false);
            } catch (err) {
                console.error(err);
                alert("Gagal memulihkan transaksi penerimaan.");
            }
        }
    };

    const handleHapusGroup = async (group) => {
        if (window.confirm(`Hapus PERMANEN seluruh transaksi penerimaan "${group.no_penerimaan}" (${group.items.length} jenis barang, total ${group.total_unit} unit)?\n\nPERHATIAN: Tindakan ini tidak dapat dibatalkan!`)) {
            try {
                for (const item of group.items) {
                    await axios.delete(`${API_BARANG}/${encodeURIComponent(item.kode_produk)}`);
                }
                alert(`Seluruh transaksi penerimaan "${group.no_penerimaan}" berhasil dihapus secara permanen.`);
                loadData();
                setShowDetailModal(false);
            } catch (err) {
                console.error(err);
                alert("Gagal menghapus transaksi penerimaan.");
            }
        }
    };

    const handlePulihkanSingleItem = async (item) => {
        if (window.confirm(`Pulihkan produk "${item.nama_produk}" (${item.jumlah} ${item.satuan || 'Pcs'}) kembali ke stok aktif?`)) {
            try {
                await axios.put(`${API_BARANG}/pulihkan/${encodeURIComponent(item.kode_produk)}`);
                alert(`Produk "${item.nama_produk}" berhasil dipulihkan.`);
                loadData();
                if (selectedPenerimaan) {
                    const remaining = selectedPenerimaan.items.filter(i => i.kode_produk !== item.kode_produk);
                    if (remaining.length === 0) {
                        setShowDetailModal(false);
                    } else {
                        setSelectedPenerimaan(prev => ({ ...prev, items: remaining }));
                    }
                }
            } catch (err) {
                console.error(err);
                alert("Gagal memulihkan item barang.");
            }
        }
    };

    const handleHapusSingleItem = async (item) => {
        if (window.confirm(`Hapus PERMANEN produk "${item.nama_produk}" (${item.jumlah} ${item.satuan || 'Pcs'})?\n\nPERHATIAN: Tindakan ini tidak dapat dibatalkan!`)) {
            try {
                await axios.delete(`${API_BARANG}/${encodeURIComponent(item.kode_produk)}`);
                alert(`Produk "${item.nama_produk}" berhasil dihapus secara permanen.`);
                loadData();
                if (selectedPenerimaan) {
                    const remaining = selectedPenerimaan.items.filter(i => i.kode_produk !== item.kode_produk);
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

    // Helper Status Expired Badge
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

    // Export Excel Data Terarsip
    const handleExport = async () => {
        try {
            const response = await axios.get("http://localhost:3000/api/data/export/arsip", {
                responseType: "blob"
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const contentDisposition = response.headers["content-disposition"];
            let fileName = "ArsipPenerimaanBarang.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match) fileName = match[1].replace(/['"]/g, "");
            }
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Gagal mengexport data arsip.");
            console.error(err);
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="bg-white p-4 rounded-4 border shadow-sm">
                {/* Header Page */}
                <Row className="mb-3 align-items-center">
                    <Col md={6}>
                        <h3 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                            <Archive size={26} className="text-secondary" />
                            Arsip Penerimaan Barang
                        </h3>
                        <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
                            Daftar transaksi dan barang penerimaan terarsip (dapat dipulihkan atau dihapus permanen).
                        </p>
                    </Col>

                    <Col md={6} className="text-md-end mt-3 mt-md-0">
                        <div className="d-flex gap-2 justify-content-md-end flex-wrap align-items-center">
                            <InputGroup style={{ maxWidth: "260px" }}>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <Search className="text-muted" size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    className="border-start-0 ps-0 fs-6"
                                    placeholder="Cari di arsip..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                            </InputGroup>

                            <Button variant="outline-secondary" className="d-flex align-items-center gap-1 fw-bold fs-6" onClick={handleExport}>
                                <Download size={14} /> Export Excel Arsip
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Filter Bar Universal: Date Range & Keyword */}
                <div className="bg-light p-3 rounded-3 border mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.875rem" }}>
                                <CalendarEvent size={16} className="text-primary" /> Tanggal Masuk:
                            </span>
                            <div className="d-flex align-items-center gap-1.5 bg-white p-1 rounded border shadow-sm">
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
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        {(tglDari || tglSampai || filterBulanTahun || keyword) && (
                            <Button
                                variant="link"
                                size="sm"
                                className="text-danger p-0 text-decoration-none fw-bold me-2"
                                onClick={() => {
                                    setTglDari("");
                                    setTglSampai("");
                                    setFilterBulanTahun("");
                                    setKeyword("");
                                }}
                            >
                                Reset Filter
                            </Button>
                        )}
                        <Badge bg="secondary" className="px-3 py-2 fw-semibold fs-6 border shadow-sm">
                            Menampilkan: <strong>{groupedArsip.length} Transaksi</strong> ({filteredBarang.length} Item Terarsip)
                        </Badge>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="secondary" />
                    </div>
                ) : (
                    <>
                        <Table responsive hover className="custom-table m-0 align-middle border rounded-3 shadow-sm mt-2 bg-white">
                            <thead className="bg-primary text-white" style={{ background: "#0f4c81", color: "#ffffff" }}>
                                <tr>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary text-center" style={{ width: "40px" }}>No.</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">No. Masuk / Penerimaan</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Tanggal Masuk</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Petugas Penerima</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Jenis &amp; Total Unit</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary">Kategori</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary text-center">Status Expired</th>
                                    <th className="py-3 px-3 fw-bold text-white bg-primary text-center" style={{ width: "240px" }}>Aksi Transaksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {groupedArsip.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted py-5 fs-6">
                                            <div className="mb-2"><Archive size={40} className="text-muted opacity-50" /></div>
                                            Tidak ada data transaksi penerimaan di arsip
                                            {filterBulanTahun && ` untuk periode ${filterBulanTahun}`}.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedArsip.map((group, index) => (
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
                                                    <PersonFill size={12} className="me-1" />
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
                                                            <span className="badge bg-secondary px-2 py-0.5 fs-6 fw-bold">
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
                                                <div className="d-flex flex-column gap-1">
                                                    {group.kategori_list && (
                                                        <span className="badge bg-primary text-white px-2 py-1 fs-6 fw-bold text-start" style={{ width: "fit-content" }}>
                                                            {group.kategori_list}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-3 text-center">
                                                {getGroupStatusBadge(group.items)}
                                            </td>

                                            <td className="text-center px-3">
                                                <div className="d-flex gap-2 justify-content-center align-items-center">
                                                    {group.items.length > 1 ? (
                                                        <Button
                                                            size="sm"
                                                            variant="info"
                                                            onClick={() => handleDetailGroup(group)}
                                                            className="fw-bold px-2 py-1 fs-6 text-dark d-flex align-items-center gap-1 shadow-sm"
                                                            title="Lihat Rincian Barang Terarsip"
                                                        >
                                                            <EyeFill size={14} /> Detail
                                                        </Button>
                                                    ) : (
                                                        <div style={{ width: "70px", flexShrink: 0 }}></div>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="success"
                                                        onClick={() => handlePulihkanGroup(group)}
                                                        className="fw-bold px-2 py-1 fs-6 d-flex align-items-center gap-1 shadow-sm"
                                                        title="Pulihkan Seluruh Transaksi Ini ke Stok Aktif"
                                                    >
                                                        <ArrowCounterclockwise size={13} /> Pulihkan
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        onClick={() => handleHapusGroup(group)}
                                                        className="fw-bold px-2 py-1 fs-6 d-flex align-items-center gap-1"
                                                        title="Hapus Permanen Seluruh Transaksi Ini"
                                                    >
                                                        <Trash size={13} /> Hapus
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top">
                                <div className="small text-muted fw-semibold">
                                    Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-dark fw-bold">{Math.min(currentPage * 10, groupedArsip.length)}</span> dari <span className="text-dark fw-bold">{groupedArsip.length}</span> penerimaan (Hal. {currentPage}/{totalPages})
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

            {/* Modal Detail Transaksi Penerimaan Terarsip */}
            {selectedPenerimaan && (
                <Modal
                    show={showDetailModal}
                    onHide={() => setShowDetailModal(false)}
                    size="xl"
                    centered
                >
                    <Modal.Header closeButton className="border-bottom bg-white py-2.5 px-3">
                        <Modal.Title className="fw-bold text-dark fs-5 d-flex align-items-center gap-2">
                            <Receipt className="text-secondary" size={20} />
                            Detail Transaksi Penerimaan Terarsip
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-3 bg-light">
                        {/* Info Ringkas Transaksi */}
                        <Card className="border shadow-sm rounded-3 mb-3 bg-white">
                            <Card.Body className="p-3">
                                <Row className="g-2">
                                    <Col md={3}>
                                        <div className="text-muted small fw-semibold">No. Masuk / Penerimaan:</div>
                                        <div>
                                            <span className="badge-code-in">{selectedPenerimaan.no_penerimaan}</span>
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
                                        <Badge bg="secondary" className="px-3 py-1 fs-6 fw-bold shadow-sm">
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
                                    DAFTAR BARANG TERARSIP DALAM TRANSAKSI INI:
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
                                            <th className="text-center" style={{ width: "190px" }}>Aksi Item</th>
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
                                                    <span className="badge bg-secondary px-2.5 py-1 fs-6 fw-bold">
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
                                                <td className="text-center px-2">
                                                    <div className="d-flex gap-2 justify-content-center align-items-center">
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            className="fw-bold px-2 py-1 fs-6 d-flex align-items-center gap-1 shadow-sm"
                                                            onClick={() => handlePulihkanSingleItem(item)}
                                                            title="Pulihkan Barang Ini Ke Stok Aktif"
                                                        >
                                                            <ArrowCounterclockwise size={13} /> Pulihkan
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            className="fw-bold px-2 py-1 fs-6 d-flex align-items-center gap-1"
                                                            onClick={() => handleHapusSingleItem(item)}
                                                            title="Hapus Barang Ini Secara Permanen"
                                                        >
                                                            <Trash size={13} /> Hapus
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
                                variant="success"
                                className="fw-bold d-flex align-items-center gap-1 shadow-sm"
                                onClick={() => handlePulihkanGroup(selectedPenerimaan)}
                            >
                                <ArrowCounterclockwise size={14} /> Pulihkan Seluruh Transaksi Ini
                            </Button>
                        </div>

                        <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                            Tutup
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </Container>
    );
}

export default ArsipBarang;
