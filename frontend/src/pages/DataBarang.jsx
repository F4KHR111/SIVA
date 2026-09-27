import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Modal, Badge, Alert, Pagination, InputGroup } from "react-bootstrap";
import { BoxSeam, PlusLg, Trash, PencilFill, GeoAltFill, Tags, Box, LockFill, UnlockFill, ExclamationTriangleFill, ShieldLockFill, Diagram3Fill, FileEarmarkArrowDown, Search } from "react-bootstrap-icons";
import { formatKodeProduk } from "../utils";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:3000/api/nama-barang";

const emptyForm = { kode: "", nama: "", kategori: "", sub_kategori: "", satuan: "", lokasi: "", total_stok: "" };

function DataBarang() {
    const { isCategoryAllowed } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Master Relational Data
    const [kategoris, setKategoris] = useState([]);
    const [subKategoris, setSubKategoris] = useState([]);
    const [satuans, setSatuans] = useState([]);
    const [lokasis, setLokasis] = useState([]);

    // Filter states
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [subKategoriFilter, setSubKategoriFilter] = useState("");
    const [availableSubFilter, setAvailableSubFilter] = useState([]);
    const [stokFilterMode, setStokFilterMode] = useState("semua"); // "semua" | "ada_stok" | "habis"
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Manual input toggle states
    const [isKatLainnya, setIsKatLainnya] = useState(false);
    const [isSubKatLainnya, setIsSubKatLainnya] = useState(false);
    const [isSatLainnya, setIsSatLainnya] = useState(false);
    const [isLokLainnya, setIsLokLainnya] = useState(false);

    // Modal tambah / edit
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [exportingOpname, setExportingOpname] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const [resItems, resKat, resSat, resLok] = await Promise.all([
                axios.get(API_URL),
                axios.get("http://localhost:3000/api/kategori"),
                axios.get("http://localhost:3000/api/satuan"),
                axios.get("http://localhost:3000/api/lokasi")
            ]);
            if (resItems.data?.success) setItems(resItems.data.data);
            if (resKat.data?.success) setKategoris(resKat.data.data);
            if (resSat.data?.success) setSatuans(resSat.data.data);
            if (resLok.data?.success) setLokasis(resLok.data.data);
        } catch (err) {
            console.error("Gagal memuat data master barang:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (form.kategori && form.kategori.trim() !== "") {
            axios.get(`http://localhost:3000/api/kategori/sub?kategori=${encodeURIComponent(form.kategori)}`)
                .then(res => {
                    if (res.data?.success) setSubKategoris(res.data.data);
                })
                .catch(() => setSubKategoris([]));
        } else {
            setSubKategoris([]);
        }
    }, [form.kategori]);

    useEffect(() => {
        if (kategoriFilter && kategoriFilter.trim() !== "") {
            axios.get(`http://localhost:3000/api/kategori/sub?kategori=${encodeURIComponent(kategoriFilter)}`)
                .then(res => {
                    if (res.data?.success) setAvailableSubFilter(res.data.data);
                })
                .catch(() => setAvailableSubFilter([]));
        } else {
            setAvailableSubFilter([]);
        }
    }, [kategoriFilter]);

    const handleOpenTambah = () => {
        setForm(emptyForm);
        setIsKatLainnya(false);
        setIsSubKatLainnya(false);
        setIsSatLainnya(false);
        setIsLokLainnya(false);
        setEditMode(false);
        setEditId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setForm({
            kode: item.kode || "",
            nama: item.nama || "",
            kategori: item.kategori || "",
            sub_kategori: item.sub_kategori || "",
            satuan: item.satuan || "",
            lokasi: item.lokasi || "",
            total_stok: item.total_stok !== undefined ? item.total_stok : ""
        });
        setIsKatLainnya(false);
        setIsSubKatLainnya(false);
        setIsSatLainnya(false);
        setIsLokLainnya(false);
        setEditMode(true);
        setEditId(item.id);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setForm(emptyForm);
        setIsKatLainnya(false);
        setIsSubKatLainnya(false);
        setIsSatLainnya(false);
        setIsLokLainnya(false);
        setEditMode(false);
        setEditId(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: name === "kode" ? value.toUpperCase() : value
        }));
    };

    const handleSelectKategori = (e) => {
        const val = e.target.value;
        if (val === "__LAINNYA__") {
            setIsKatLainnya(true);
            setIsSubKatLainnya(true);
            setForm(prev => ({ ...prev, kategori: "", sub_kategori: "" }));
        } else {
            setIsKatLainnya(false);
            setIsSubKatLainnya(false);
            setForm(prev => ({ ...prev, kategori: val, sub_kategori: "" }));
        }
    };

    const handleSelectSubKategori = (e) => {
        const val = e.target.value;
        if (val === "__LAINNYA__") {
            setIsSubKatLainnya(true);
            setForm(prev => ({ ...prev, sub_kategori: "" }));
        } else {
            setIsSubKatLainnya(false);
            setForm(prev => ({ ...prev, sub_kategori: val }));
        }
    };

    const handleSelectSatuan = (e) => {
        const val = e.target.value;
        if (val === "__LAINNYA__") {
            setIsSatLainnya(true);
            setForm(prev => ({ ...prev, satuan: "" }));
        } else {
            setIsSatLainnya(false);
            setForm(prev => ({ ...prev, satuan: val }));
        }
    };

    const handleSelectLokasi = (e) => {
        const val = e.target.value;
        if (val === "__LAINNYA__") {
            setIsLokLainnya(true);
            setForm(prev => ({ ...prev, lokasi: "" }));
        } else {
            setIsLokLainnya(false);
            setForm(prev => ({ ...prev, lokasi: val }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nama.trim()) return;
        try {
            setSaving(true);
            const payload = {
                kode: form.kode,
                nama: form.nama,
                kategori: form.kategori,
                sub_kategori: form.sub_kategori,
                satuan: form.satuan,
                lokasi: form.lokasi,
            };

            if (editMode) {
                const res = await axios.put(`${API_URL}/${editId}`, payload);
                alert(res.data.message || "Data diperbarui.");
            } else {
                const res = await axios.post(API_URL, payload);
                alert(res.data.message || "Data ditambahkan.");
            }
            handleClose();
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || "Terjadi kesalahan.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, namaBarang) => {
        if (!window.confirm(`Hapus data barang "${namaBarang}"? (Catatan: Riwayat penerimaan & pemakaian tetap tersimpan).`)) return;
        try {
            const res = await axios.delete(`${API_URL}/${id}`);
            alert(res.data.message || "Data dihapus.");
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menghapus.");
        }
    };

    const handleExportOpname = async () => {
        try {
            setExportingOpname(true);
            const params = new URLSearchParams();
            if (kategoriFilter) params.append("kategori", kategoriFilter);
            if (subKategoriFilter) params.append("sub_kategori", subKategoriFilter);
            if (search) params.append("q", search);

            const response = await axios.get(`http://localhost:3000/api/data/export/opname?${params.toString()}`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, "0");
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const yyyy = today.getFullYear();
            link.href = url;
            link.setAttribute("download", `OpnameStok_${dd}-${mm}-${yyyy}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Gagal mengunduh file opname stok.");
            console.error(err);
        } finally {
            setExportingOpname(false);
        }
    };

    const filtered = items
        .filter(item => {
            const matchSearch = !search.trim() ||
                item.nama?.toLowerCase().includes(search.toLowerCase()) ||
                item.kode?.toLowerCase().includes(search.toLowerCase()) ||
                item.lokasi?.toLowerCase().includes(search.toLowerCase());

            const matchKat = !kategoriFilter || item.kategori === kategoriFilter;
            const matchSubKat = !subKategoriFilter || item.sub_kategori === subKategoriFilter;

            const stokVal = Number(item.total_stok) || 0;
            let matchStok = true;
            if (stokFilterMode === "ada_stok") {
                matchStok = stokVal > 0;
            } else if (stokFilterMode === "habis") {
                matchStok = stokVal === 0;
            }

            const matchCatAllowed = isCategoryAllowed(item.kategori);

            return matchSearch && matchKat && matchSubKat && matchStok && matchCatAllowed;
        })
        .sort((a, b) => {
            const katA = (a.kategori || "").toLowerCase();
            const katB = (b.kategori || "").toLowerCase();
            if (katA < katB) return -1;
            if (katA > katB) return 1;

            const subA = (a.sub_kategori || "").toLowerCase();
            const subB = (b.sub_kategori || "").toLowerCase();
            if (subA < subB) return -1;
            if (subA > subB) return 1;

            const namaA = (a.nama || "").toLowerCase();
            const namaB = (b.nama || "").toLowerCase();
            return namaA.localeCompare(namaB);
        });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [search, kategoriFilter, subKategoriFilter, stokFilterMode]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const paginatedFiltered = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage]);

    return (
        <Container fluid className="p-4">
            <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4">
                    <Row className="mb-4 align-items-center">
                        <Col md={6}>
                            <h4 className="fw-bold text-dark mb-1 fs-4">
                                Data Barang
                            </h4>
                            <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                                Daftar data barang dan jumlah stok aktif.
                            </p>
                        </Col>
                        <Col md={6} className="text-md-end mt-3 mt-md-0">
                            <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                                <Button
                                    variant="outline-success"
                                    onClick={handleExportOpname}
                                    disabled={exportingOpname}
                                    className="d-flex align-items-center gap-1 fw-bold px-3 py-2"
                                    id="btn-export-opname"
                                    title="Export semua data barang sebagai lembar opname stok Excel"
                                >
                                    {exportingOpname
                                        ? <><Spinner size="sm" className="me-1" /> Mengunduh...</>
                                        : <><FileEarmarkArrowDown size={18} /> Export Opname Stok</>
                                    }
                                </Button>
                                <Button variant="primary" onClick={handleOpenTambah} className="d-flex align-items-center gap-1 fw-bold px-3 py-2">
                                    <PlusLg size={18} /> Tambah Data Barang
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    {/* Filter & Search Bar */}
                    <div className="bg-light p-3 rounded-3 border mb-3">
                        <Row className="g-2 align-items-center">
                            <Col md={4} className="position-relative">
                                <InputGroup size="lg">
                                    <InputGroup.Text className="bg-white border-end-0">
                                        <Search className="text-muted" size={16} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Pilih / Cari Nama Barang..."
                                        value={search}
                                        onFocus={(e) => {
                                            e.target.select();
                                            setShowSearchDropdown(true);
                                        }}
                                        onClick={(e) => {
                                            e.target.select();
                                            setShowSearchDropdown(true);
                                        }}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setShowSearchDropdown(true);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => setShowSearchDropdown(false), 200);
                                        }}
                                        id="input-search-data-barang"
                                        className="border-start-0 ps-0 bg-white fs-6 fw-semibold text-dark cursor-pointer"
                                        autoComplete="off"
                                    />
                                    {search && (
                                        <Button
                                            variant="light"
                                            className="border border-start-0 text-muted fw-bold"
                                            onClick={() => {
                                                setSearch("");
                                                setShowSearchDropdown(false);
                                            }}
                                        >
                                            ✕
                                        </Button>
                                    )}
                                </InputGroup>

                                {/* Dropdown Menu Popup Overlay (Pilihan Opsi Otomatis) */}
                                {showSearchDropdown && (
                                    <div
                                        className="position-absolute w-100 bg-white border rounded shadow-lg mt-1"
                                        style={{ maxHeight: "280px", overflowY: "auto", zIndex: 1050, left: 0 }}
                                    >
                                        <div
                                            className={`p-2.5 small border-bottom fw-bold ${!search ? "bg-primary text-white" : "text-primary"}`}
                                            style={{ cursor: "pointer" }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSearch("");
                                                setShowSearchDropdown(false);
                                            }}
                                        >
                                            -- Semua Data Barang --
                                        </div>
                                        {items
                                            .filter(item => {
                                                if (!search.trim()) return true;
                                                const q = search.toLowerCase();
                                                return (
                                                    (item.nama && item.nama.toLowerCase().includes(q)) ||
                                                    (item.kode && item.kode.toLowerCase().includes(q)) ||
                                                    (item.lokasi && item.lokasi.toLowerCase().includes(q)) ||
                                                    (item.kategori && item.kategori.toLowerCase().includes(q))
                                                );
                                            })
                                            .slice(0, 35)
                                            .map(item => (
                                                <div
                                                    key={item.id || item.kode}
                                                    className="p-2.5 small border-bottom d-flex align-items-center justify-content-between text-dark hover-bg-light"
                                                    style={{ cursor: "pointer" }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSearch(item.nama);
                                                        setShowSearchDropdown(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="fw-bold text-dark">{item.nama}</div>
                                                        <div className="small text-muted" style={{ fontSize: "0.78rem" }}>
                                                            {item.kategori} {item.sub_kategori ? `› ${item.sub_kategori}` : ''} {item.lokasi ? `• ${item.lokasi}` : ''}
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <Badge bg="primary" className="font-monospace px-2 py-1 me-1">
                                                            {formatKodeProduk(item.kode)}
                                                        </Badge>
                                                        <Badge bg={item.total_stok > 0 ? "success" : "danger"}>
                                                            Stok: {item.total_stok || 0}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </Col>

                            <Col md={3}>
                                <Form.Select
                                    size="lg"
                                    value={kategoriFilter}
                                    onChange={(e) => {
                                        setKategoriFilter(e.target.value);
                                        setSubKategoriFilter("");
                                    }}
                                    className="fw-semibold text-dark bg-white fs-6 border-primary-subtle"
                                >
                                    <option value="">-- Semua Kategori --</option>
                                    {kategoris.map(k => (
                                        <option key={k.id} value={k.nama_kategori}>
                                            {k.nama_kategori}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>

                            {kategoriFilter && availableSubFilter.length > 0 && (
                                <Col md={3}>
                                    <Form.Select
                                        size="lg"
                                        value={subKategoriFilter}
                                        onChange={(e) => setSubKategoriFilter(e.target.value)}
                                        className="fw-bold text-dark border-info bg-white fs-6"
                                    >
                                        <option value="">-- Semua Sub Kategori --</option>
                                        {availableSubFilter.map(sk => (
                                            <option key={sk.id} value={sk.nama_sub_kategori}>
                                                {sk.nama_sub_kategori}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                            )}

                            {(kategoriFilter || subKategoriFilter || search || stokFilterMode !== "semua") && (
                                <Col xs="auto">
                                    <Button
                                        variant="outline-secondary"
                                        size="lg"
                                        onClick={() => {
                                            setSearch("");
                                            setKategoriFilter("");
                                            setSubKategoriFilter("");
                                            setStokFilterMode("semua");
                                        }}
                                        className="fw-semibold fs-6 px-3"
                                    >
                                        Reset Filter
                                    </Button>
                                </Col>
                            )}

                            {/* Radio Buttons Filter Status Stok (Hide Stok Kosong / Ada Stok / Semua) */}
                            <Col md={12} className="mt-2 pt-2 border-top d-flex align-items-center gap-3 flex-wrap">
                                <span className="fw-bold text-dark small me-1">Filter Stok:</span>
                                <Form.Check
                                    inline
                                    type="radio"
                                    id="stok-radio-semua"
                                    name="stokFilterMode"
                                    label={<span className="fw-semibold text-dark">Semua Barang</span>}
                                    checked={stokFilterMode === "semua"}
                                    onChange={() => setStokFilterMode("semua")}
                                    className="user-select-none cursor-pointer"
                                />
                                <Form.Check
                                    inline
                                    type="radio"
                                    id="stok-radio-ada-stok"
                                    name="stokFilterMode"
                                    label={<span className="fw-bold text-success">Sembunyikan Stok Kosong (Hanya Ada Stok &gt; 0)</span>}
                                    checked={stokFilterMode === "ada_stok"}
                                    onChange={() => setStokFilterMode("ada_stok")}
                                    className="user-select-none cursor-pointer"
                                />
                                <Form.Check
                                    inline
                                    type="radio"
                                    id="stok-radio-habis"
                                    name="stokFilterMode"
                                    label={<span className="fw-bold text-danger">Stok Kosong / Habis (0 Unit)</span>}
                                    checked={stokFilterMode === "habis"}
                                    onChange={() => setStokFilterMode("habis")}
                                    className="user-select-none cursor-pointer"
                                />
                            </Col>
                        </Row>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table responsive hover className="custom-table align-middle border rounded-3 overflow-hidden shadow-sm">
                            <thead>
                                <tr>
                                    <th className="py-3 px-3 text-center" style={{ width: "50px" }}>#</th>
                                    <th className="py-3 px-3 text-nowrap-cell" style={{ width: "150px" }}>Kode Barang</th>
                                    <th className="py-3 px-3">Nama Barang</th>
                                    <th className="py-3 px-3 text-nowrap-cell" style={{ width: "100px" }}>Satuan</th>
                                    <th className="py-3 px-3 text-nowrap-cell text-center" style={{ width: "150px" }}>Total Stok Aktif</th>
                                    <th className="py-3 px-3" style={{ width: "180px" }}>Kategori &amp; Sub</th>
                                    <th className="py-3 px-3" style={{ width: "140px" }}>Lokasi Simpan</th>
                                    <th className="py-3 px-3 text-center" style={{ width: "110px" }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted py-5 fs-6">
                                            {search
                                                ? `Tidak ada barang yang cocok dengan "${search}".`
                                                : "Belum ada data barang terdaftar."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedFiltered.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td className="fw-semibold text-muted text-center px-3">{((currentPage - 1) * 10) + idx + 1}</td>
                                            <td className="px-3 text-nowrap-cell">
                                                <span className="badge-code-product">
                                                    {item.kode || "-"}
                                                </span>
                                            </td>
                                            <td className="px-3">
                                                <div className="fw-bold text-dark">{item.nama}</div>
                                            </td>
                                            <td className="px-3 text-nowrap-cell">
                                                <span className="fw-semibold text-dark">{item.satuan || "Pcs"}</span>
                                            </td>
                                            <td className="px-3 text-center text-nowrap-cell">
                                                {item.total_stok > 0 ? (
                                                    <span className="badge-unit-success">
                                                        {item.total_stok} {item.satuan || "Pcs"}
                                                    </span>
                                                ) : (
                                                    <span className="badge-unit-out">
                                                        Stok Kosong (0)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3">
                                                <div className="fw-bold text-dark">{item.kategori || "-"}</div>
                                                {item.sub_kategori && (
                                                    <div className="small text-muted" style={{ fontSize: "0.8rem" }}>
                                                        Sub: {item.sub_kategori}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3">
                                                <div className="fw-semibold text-dark">{item.lokasi || "-"}</div>
                                            </td>
                                            <td className="text-center px-3">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    <Button size="sm" variant="outline-primary" onClick={() => handleOpenEdit(item)} title="Edit Data Barang & Penyesuaian Stok" className="p-1 px-2">
                                                        <PencilFill size={14} />
                                                    </Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDelete(item.id, item.nama)} title="Hapus Data Barang" className="p-1 px-2">
                                                        <Trash size={14} />
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
                                Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span> - <span className="text-dark fw-bold">{Math.min(currentPage * 10, filtered.length)}</span> dari <span className="text-dark fw-bold">{filtered.length}</span> barang (Halaman {currentPage} dari {totalPages})
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
                </Card.Body>
            </Card>

            {/* Modal Tambah / Edit Data Barang */}
            <Modal show={showModal} onHide={handleClose} centered size="lg" scrollable={true} id="modal-data-barang">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold fs-4 text-primary">
                        {editMode ? "Edit Data Barang" : "Tambah Data Barang"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3">
                    <Form onSubmit={handleSubmit} id="form-data-barang">
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-dark fs-6">
                                        Kode Barang
                                    </Form.Label>
                                    <Form.Control
                                        size="lg"
                                        className="fs-6 fw-semibold"
                                        name="kode"
                                        value={form.kode}
                                        onChange={handleChange}
                                        placeholder="Contoh: BRG-001"
                                        id="input-kode-data-barang"
                                    />
                                    <Form.Text className="text-muted" style={{ fontSize: "0.8rem" }}>
                                        Kode unik identitas barang.
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-dark fs-6">
                                        Nama Barang <span className="text-danger">*</span>
                                    </Form.Label>
                                    <Form.Control
                                        size="lg"
                                        className="fs-6 fw-semibold"
                                        name="nama"
                                        value={form.nama}
                                        onChange={handleChange}
                                        placeholder="Contoh: Kertas HVS A4 80gr"
                                        required
                                        autoFocus
                                        id="input-nama-data-barang"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* INFO SISA STOK OTOMATIS */}
                        <Alert variant="info" className="border-info bg-info-subtle my-3">
                            <div className="d-flex align-items-center gap-2 text-dark fw-semibold" style={{ fontSize: "0.85rem" }}>
                                <Diagram3Fill size={20} className="text-info flex-shrink-0" />
                                <div>
                                    <strong>Pencatatan Stok Otomatis Berbasis Flow:</strong> Total stok produk dihitung secara realtime dari <strong>Penerimaan Barang (Masuk)</strong> dikurangi <strong>Pemakaian Barang (Keluar)</strong>. Stok tidak dapat dimanipulasi secara manual agar setiap mutasi barang terjamin auditnya.
                                </div>
                            </div>
                        </Alert>

                        {/* ROW 2: Kategori & Sub Kategori */}
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-dark fs-6">
                                        Kategori
                                    </Form.Label>
                                    <Form.Select
                                        size="lg"
                                        className="fs-6 fw-semibold"
                                        value={isKatLainnya ? "__LAINNYA__" : form.kategori}
                                        onChange={handleSelectKategori}
                                    >
                                        <option value="">Pilih Kategori</option>
                                        {kategoris.map(k => (
                                            <option key={k.id} value={k.nama_kategori}>{k.nama_kategori}</option>
                                        ))}
                                        <option value="__LAINNYA__">+ Tambah Kategori Baru</option>
                                    </Form.Select>
                                    {isKatLainnya && (
                                        <Form.Control
                                            size="lg"
                                            className="mt-2 fs-6 fw-semibold"
                                            placeholder="Tulis nama kategori baru..."
                                            name="kategori"
                                            value={form.kategori}
                                            onChange={handleChange}
                                        />
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-dark fs-6">
                                        Sub Kategori
                                    </Form.Label>
                                    {subKategoris.length > 0 ? (
                                        <>
                                            <Form.Select
                                                size="lg"
                                                className="fs-6 fw-semibold"
                                                value={isSubKatLainnya ? "__LAINNYA__" : form.sub_kategori}
                                                onChange={handleSelectSubKategori}
                                            >
                                                <option value="">-- Pilih Sub Kategori --</option>
                                                {subKategoris.map(sk => (
                                                    <option key={sk.id} value={sk.nama_sub_kategori}>
                                                        {sk.nama_sub_kategori}
                                                    </option>
                                                ))}
                                                <option value="__LAINNYA__">+ Tambah Sub Kategori Baru</option>
                                            </Form.Select>
                                            {isSubKatLainnya && (
                                                <Form.Control
                                                    size="lg"
                                                    className="mt-2 fs-6 fw-semibold"
                                                    placeholder="Tulis sub kategori baru..."
                                                    name="sub_kategori"
                                                    value={form.sub_kategori}
                                                    onChange={handleChange}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <Form.Control
                                            size="lg"
                                            className="fs-6 fw-semibold"
                                            placeholder="Ketik Sub Kategori (Opsional)..."
                                            name="sub_kategori"
                                            value={form.sub_kategori}
                                            onChange={handleChange}
                                        />
                                    )}
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* ROW 3: Satuan & Lokasi */}
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-dark fs-6">
                                        Satuan
                                    </Form.Label>
                                    <Form.Select
                                        size="lg"
                                        className="fs-6 fw-semibold"
                                        value={isSatLainnya ? "__LAINNYA__" : form.satuan}
                                        onChange={handleSelectSatuan}
                                    >
                                        <option value="">Pilih Satuan</option>
                                        {satuans.map(s => (
                                            <option key={s.id} value={s.nama_satuan}>{s.nama_satuan}</option>
                                        ))}
                                        <option value="__LAINNYA__">+ Tambah Satuan Baru</option>
                                    </Form.Select>
                                    {isSatLainnya && (
                                        <Form.Control
                                            size="lg"
                                            className="mt-2 fs-6 fw-semibold"
                                            placeholder="Tulis nama satuan baru..."
                                            name="satuan"
                                            value={form.satuan}
                                            onChange={handleChange}
                                        />
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-dark fs-6">
                                        Lokasi Simpan
                                    </Form.Label>
                                    <Form.Select
                                        size="lg"
                                        className="fs-6 fw-semibold"
                                        value={isLokLainnya ? "__LAINNYA__" : form.lokasi}
                                        onChange={handleSelectLokasi}
                                    >
                                        <option value="">Pilih Lokasi</option>
                                        {lokasis.map(l => (
                                            <option key={l.id} value={l.nama_lokasi}>{l.nama_lokasi}</option>
                                        ))}
                                        <option value="__LAINNYA__">+ Tambah Lokasi Baru</option>
                                    </Form.Select>
                                    {isLokLainnya && (
                                        <Form.Control
                                            size="lg"
                                            className="mt-2 fs-6 fw-semibold"
                                            placeholder="Tulis nama lokasi baru..."
                                            name="lokasi"
                                            value={form.lokasi}
                                            onChange={handleChange}
                                        />
                                    )}
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="d-flex gap-2 justify-content-end border-top pt-3 mt-2">
                            <Button variant="secondary" size="lg" onClick={handleClose} disabled={saving} className="px-4">
                                Batal
                            </Button>
                            <Button type="submit" variant="primary" size="lg" disabled={saving} id="btn-simpan-data-barang" className="px-4 fw-bold">
                                {saving
                                    ? <><Spinner size="sm" className="me-2" />{editMode ? "Menyimpan..." : "Menambahkan..."}</>
                                    : editMode ? "Simpan Perubahan" : "Tambah Data Barang"
                                }
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

        </Container>
    );
}

export default DataBarang;
