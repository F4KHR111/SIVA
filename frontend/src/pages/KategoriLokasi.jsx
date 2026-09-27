import { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Card, Form, Button, Spinner, Badge, ListGroup } from "react-bootstrap";
import { Tags, GeoAltFill, PlusLg, Trash, Collection, Diagram3Fill, XCircle, CheckLg } from "react-bootstrap-icons";

function KategoriLokasi() {
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [units, setUnits] = useState([]);

    const [loadingKat, setLoadingKat] = useState(false);
    const [loadingLok, setLoadingLok] = useState(false);
    const [loadingSat, setLoadingSat] = useState(false);

    const [newKategori, setNewKategori] = useState("");
    const [newLokasi, setNewLokasi] = useState("");
    const [newSatuan, setNewSatuan] = useState("");

    const [selectedKatId, setSelectedKatId] = useState("");
    const [selectedLokId, setSelectedLokId] = useState("");
    const [selectedSatId, setSelectedSatId] = useState("");

    // Toggle Form States (Klik tombol dulu baru muncul field isi)
    const [showAddKat, setShowAddKat] = useState(false);
    const [showAddSub, setShowAddSub] = useState(false);
    const [showAddLok, setShowAddLok] = useState(false);
    const [showAddSat, setShowAddSat] = useState(false);

    // Sub Kategori State
    const [subCategories, setSubCategories] = useState([]);
    const [loadingSub, setLoadingSub] = useState(false);
    const [newSubKategori, setNewSubKategori] = useState("");

    const API_KAT = "http://localhost:3000/api/kategori";
    const API_LOK = "http://localhost:3000/api/lokasi";
    const API_SAT = "http://localhost:3000/api/satuan";

    const loadKategori = async () => {
        try {
            setLoadingKat(true);
            const res = await axios.get(API_KAT);
            if (res.data?.success) setCategories(res.data.data);
        } catch (err) {
            console.error("Gagal memuat kategori:", err);
        } finally {
            setLoadingKat(false);
        }
    };

    const loadLokasi = async () => {
        try {
            setLoadingLok(true);
            const res = await axios.get(API_LOK);
            if (res.data?.success) setLocations(res.data.data);
        } catch (err) {
            console.error("Gagal memuat lokasi:", err);
        } finally {
            setLoadingLok(false);
        }
    };

    const loadSatuan = async () => {
        try {
            setLoadingSat(true);
            const res = await axios.get(API_SAT);
            if (res.data?.success) setUnits(res.data.data);
        } catch (err) {
            console.error("Gagal memuat satuan:", err);
        } finally {
            setLoadingSat(false);
        }
    };

    const loadSubKategori = async (katId) => {
        if (!katId) {
            setSubCategories([]);
            return;
        }
        try {
            setLoadingSub(true);
            const res = await axios.get(`${API_KAT}/sub?kategori_id=${katId}`);
            if (res.data?.success) setSubCategories(res.data.data);
        } catch (err) {
            console.error("Gagal memuat sub kategori:", err);
        } finally {
            setLoadingSub(false);
        }
    };

    useEffect(() => {
        loadKategori();
        loadLokasi();
        loadSatuan();
    }, []);

    useEffect(() => {
        loadSubKategori(selectedKatId);
        setShowAddSub(false); // Reset toggle saat ganti kategori
    }, [selectedKatId]);

    const handleAddKategori = async (e) => {
        e.preventDefault();
        if (!newKategori.trim()) return;
        try {
            const res = await axios.post(API_KAT, { nama_kategori: newKategori.trim() });
            alert(res.data.message || "Kategori ditambahkan.");
            setNewKategori("");
            setShowAddKat(false);
            loadKategori();
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menambahkan kategori.");
        }
    };

    const handleAddSubKategori = async (e) => {
        e.preventDefault();
        if (!selectedKatId || !newSubKategori.trim()) return;
        try {
            const res = await axios.post(`${API_KAT}/sub`, {
                kategori_id: selectedKatId,
                nama_sub_kategori: newSubKategori.trim()
            });
            alert(res.data.message || "Sub Kategori ditambahkan.");
            setNewSubKategori("");
            setShowAddSub(false);
            loadSubKategori(selectedKatId);
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menambahkan sub kategori.");
        }
    };

    const handleDeleteSubKategori = async (subId, subName) => {
        if (window.confirm(`Hapus sub kategori "${subName}"?`)) {
            try {
                const res = await axios.delete(`${API_KAT}/sub/${subId}`);
                alert(res.data.message || "Sub kategori dihapus.");
                loadSubKategori(selectedKatId);
            } catch (err) {
                alert(err.response?.data?.message || "Gagal menghapus sub kategori.");
            }
        }
    };

    const handleAddLokasi = async (e) => {
        e.preventDefault();
        if (!newLokasi.trim()) return;
        try {
            const res = await axios.post(API_LOK, { nama_lokasi: newLokasi.trim() });
            alert(res.data.message || "Lokasi ditambahkan.");
            setNewLokasi("");
            setShowAddLok(false);
            loadLokasi();
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menambahkan lokasi.");
        }
    };

    const handleAddSatuan = async (e) => {
        e.preventDefault();
        if (!newSatuan.trim()) return;
        try {
            const res = await axios.post(API_SAT, { nama_satuan: newSatuan.trim() });
            alert(res.data.message || "Satuan ditambahkan.");
            setNewSatuan("");
            setShowAddSat(false);
            loadSatuan();
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menambahkan satuan.");
        }
    };

    const handleDeleteKategori = async () => {
        if (!selectedKatId) {
            alert("Pilih kategori yang ingin dihapus terlebih dahulu.");
            return;
        }
        const item = categories.find(c => String(c.id) === String(selectedKatId));
        if (!item) return;
        if (window.confirm(`Hapus kategori "${item.nama_kategori}" beserta seluruh sub kategorinya?`)) {
            try {
                const res = await axios.delete(`${API_KAT}/${selectedKatId}`);
                alert(res.data.message || "Kategori dihapus.");
                setSelectedKatId("");
                loadKategori();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal menghapus kategori.");
            }
        }
    };

    const handleDeleteLokasi = async () => {
        if (!selectedLokId) {
            alert("Pilih lokasi yang ingin dihapus terlebih dahulu.");
            return;
        }
        const item = locations.find(l => String(l.id) === String(selectedLokId));
        if (!item) return;
        if (window.confirm(`Hapus lokasi "${item.nama_lokasi}"?`)) {
            try {
                const res = await axios.delete(`${API_LOK}/${selectedLokId}`);
                alert(res.data.message || "Lokasi dihapus.");
                setSelectedLokId("");
                loadLokasi();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal menghapus lokasi.");
            }
        }
    };

    const handleDeleteSatuan = async () => {
        if (!selectedSatId) {
            alert("Pilih satuan yang ingin dihapus terlebih dahulu.");
            return;
        }
        const item = units.find(u => String(u.id) === String(selectedSatId));
        if (!item) return;
        if (window.confirm(`Hapus satuan "${item.nama_satuan}"?`)) {
            try {
                const res = await axios.delete(`${API_SAT}/${selectedSatId}`);
                alert(res.data.message || "Satuan dihapus.");
                setSelectedSatId("");
                loadSatuan();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal menghapus satuan.");
            }
        }
    };

    const selectedKatObj = categories.find(c => String(c.id) === String(selectedKatId));

    return (
        <Container fluid className="p-4">
            <Row className="mb-4">
                <Col>
                    <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
                        <Collection size={22} className="text-primary" />
                        Data Kategori, Sub Kategori, Lokasi &amp; Satuan
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
                        Kelola data master kategori, sub-kategori, lokasi, dan satuan barang.
                    </p>
                </Col>
            </Row>

            <Row className="g-4">
                {/* Kategori & Sub Kategori Card */}
                <Col lg={6} md={12}>
                    <Card className="border shadow-sm rounded-4 h-100">
                        <Card.Body className="p-4 d-flex flex-column justify-content-between">
                            <div>
                                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <h5 className="fw-bold text-primary mb-0 fs-5">
                                            Data Kategori Utama
                                        </h5>
                                        <Badge bg="primary" className="rounded-pill px-2.5 py-1 fs-6">
                                            {categories.length} Kategori
                                        </Badge>
                                    </div>
                                    <Button
                                        variant={showAddKat ? "outline-secondary" : "primary"}
                                        size="sm"
                                        className="fw-bold d-flex align-items-center gap-1 shadow-sm"
                                        onClick={() => setShowAddKat(!showAddKat)}
                                    >
                                        {showAddKat ? <XCircle size={15} /> : <PlusLg size={15} />}
                                        {showAddKat ? "Batal" : "Tambah Kategori Baru"}
                                    </Button>
                                </div>

                                {/* Form Input Tambah Kategori (Hanya muncul jika tombol diklik) */}
                                {showAddKat && (
                                    <Form onSubmit={handleAddKategori} className="mb-4 bg-primary bg-opacity-10 p-3 rounded-3 border border-primary-subtle shadow-sm">
                                        <Form.Label className="fw-bold text-primary mb-2 fs-6">
                                            Nama Kategori Utama Baru:
                                        </Form.Label>
                                        <Row className="g-2">
                                            <Col>
                                                <Form.Control
                                                    size="lg"
                                                    className="fs-6 fw-semibold border-primary shadow-sm bg-white"
                                                    placeholder="Ketik nama kategori (contoh: Alat Kantor)..."
                                                    value={newKategori}
                                                    onChange={(e) => setNewKategori(e.target.value)}
                                                    required
                                                    autoFocus
                                                />
                                            </Col>
                                            <Col xs="auto">
                                                <Button type="submit" variant="primary" size="lg" className="d-flex align-items-center gap-1 px-3 fw-semibold">
                                                    <CheckLg size={18} /> Simpan
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Form>
                                )}

                                {/* Dropdown Pilih Kategori Utama */}
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-secondary mb-1 fs-6">
                                        Pilih Kategori Utama (Untuk Isi &amp; Kelola Sub-Kategori):
                                    </Form.Label>

                                    {loadingKat ? (
                                        <div className="text-center py-3"><Spinner animation="border" variant="primary" size="sm" /></div>
                                    ) : (
                                        <Form.Select
                                            size="lg"
                                            className="fw-semibold shadow-sm border-primary fs-6"
                                            value={selectedKatId}
                                            onChange={(e) => setSelectedKatId(e.target.value)}
                                        >
                                            <option value="">-- Pilih Kategori Utama ({categories.length}) --</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nama_kategori}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>

                                {/* Petunjuk jika belum memilih Kategori */}
                                {!selectedKatId && (
                                    <div className="p-3 bg-info bg-opacity-10 border border-info-subtle rounded-3 text-info-emphasis fs-6">
                                        <strong>Petunjuk Sub-Kategori:</strong> Silakan pilih salah satu Kategori Utama pada dropdown di atas terlebih dahulu untuk menambah atau mengedit Sub-Kategori.
                                    </div>
                                )}

                                {/* Area KELOLA SUB KATEGORI */}
                                {selectedKatId && (
                                    <div className="mt-3 p-3 bg-primary bg-opacity-10 rounded-3 border border-primary-subtle">
                                        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                            <span className="fw-bold text-primary d-flex align-items-center gap-2 fs-6">
                                                Sub Kategori: <span className="bg-white px-2 py-1 rounded border border-primary text-dark font-monospace fw-bold">{selectedKatObj?.nama_kategori}</span>
                                            </span>
                                            <div className="d-flex align-items-center gap-2">
                                                <Badge bg="info" className="text-dark bg-opacity-20 border border-info-subtle fs-6">
                                                    {subCategories.length} Sub Kategori
                                                </Badge>
                                                <Button
                                                    variant={showAddSub ? "outline-secondary" : "success"}
                                                    size="sm"
                                                    className="fw-bold d-flex align-items-center gap-1 shadow-sm"
                                                    onClick={() => setShowAddSub(!showAddSub)}
                                                >
                                                    {showAddSub ? <XCircle size={14} /> : <PlusLg size={14} />}
                                                    {showAddSub ? "Batal" : "Tambah Sub"}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Form Tambah Sub Kategori (Hanya muncul jika tombol diklik) */}
                                        {showAddSub && (
                                            <Form onSubmit={handleAddSubKategori} className="mb-3 bg-white p-3 rounded-3 border border-success shadow-sm">
                                                <Form.Label className="fw-bold text-success mb-2 fs-6">
                                                    Isi Sub Kategori Baru untuk {selectedKatObj?.nama_kategori}:
                                                </Form.Label>
                                                <Row className="g-2">
                                                    <Col>
                                                        <Form.Control
                                                            size="lg"
                                                            className="fs-6 fw-semibold border-success shadow-sm bg-white"
                                                            placeholder="Ketik nama sub kategori (contoh: ATK, Kertas, Pembersih)..."
                                                            value={newSubKategori}
                                                            onChange={(e) => setNewSubKategori(e.target.value)}
                                                            required
                                                            autoFocus
                                                        />
                                                    </Col>
                                                    <Col xs="auto">
                                                        <Button type="submit" size="lg" variant="success" className="d-flex align-items-center gap-1 px-3 fw-bold">
                                                            <CheckLg size={18} /> Simpan
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </Form>
                                        )}

                                        {loadingSub ? (
                                            <div className="text-center py-2"><Spinner animation="border" size="sm" /></div>
                                        ) : subCategories.length === 0 ? (
                                            <div className="text-muted text-center py-3 bg-white rounded-3 border fs-6">
                                                Belum ada Sub Kategori di bawah <strong>"{selectedKatObj?.nama_kategori}"</strong>. Silakan klik tombol <strong>"Tambah Sub"</strong> di atas.
                                            </div>
                                        ) : (
                                            <ListGroup variant="flush" className="rounded-3 border shadow-sm style-sub-list">
                                                {subCategories.map(sub => (
                                                    <ListGroup.Item key={sub.id} className="d-flex justify-content-between align-items-center py-2 px-3 bg-white fs-6">
                                                        <span className="fw-bold text-dark">{sub.nama_sub_kategori}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            className="p-1 px-2 border-0"
                                                            onClick={() => handleDeleteSubKategori(sub.id, sub.nama_sub_kategori)}
                                                            title="Hapus Sub Kategori"
                                                        >
                                                            <Trash size={15} />
                                                        </Button>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedKatId && (
                                <div className="pt-3 border-top mt-3 d-flex justify-content-between align-items-center bg-white p-2 px-3 rounded-3 border">
                                    <span className="text-dark fw-bold fs-6">
                                        Terpilih: <strong>{selectedKatObj?.nama_kategori}</strong>
                                    </span>
                                    <Button size="sm" variant="outline-danger" onClick={handleDeleteKategori} className="d-flex align-items-center gap-1 fw-semibold">
                                        <Trash size={13} /> Hapus Kategori Utama
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Lokasi Card */}
                <Col lg={3} md={6}>
                    <Card className="border shadow-sm rounded-4 h-100">
                        <Card.Body className="p-4 d-flex flex-column justify-content-between">
                            <div>
                                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <h5 className="fw-bold text-primary mb-0 fs-5">
                                            Data Lokasi
                                        </h5>
                                        <Badge bg="primary" className="rounded-pill px-2 py-1 fs-6">
                                            {locations.length}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant={showAddLok ? "outline-secondary" : "primary"}
                                        size="sm"
                                        className="fw-bold d-flex align-items-center gap-1 shadow-sm"
                                        onClick={() => setShowAddLok(!showAddLok)}
                                    >
                                        {showAddLok ? <XCircle size={14} /> : <PlusLg size={14} />}
                                        {showAddLok ? "Batal" : "Tambah"}
                                    </Button>
                                </div>

                                {/* Form Input Lokasi (Hanya muncul bila tombol diklik) */}
                                {showAddLok && (
                                    <Form onSubmit={handleAddLokasi} className="mb-4 bg-primary bg-opacity-10 p-3 rounded-3 border border-primary-subtle shadow-sm">
                                        <Form.Label className="fw-bold text-primary mb-2 fs-6">
                                            Nama Lokasi Baru:
                                        </Form.Label>
                                        <Row className="g-2">
                                            <Col>
                                                <Form.Control
                                                    size="lg"
                                                    className="fs-6 fw-semibold border-primary shadow-sm bg-white"
                                                    placeholder="Ketik lokasi baru..."
                                                    value={newLokasi}
                                                    onChange={(e) => setNewLokasi(e.target.value)}
                                                    required
                                                    autoFocus
                                                />
                                            </Col>
                                            <Col xs="auto">
                                                <Button type="submit" variant="primary" size="lg" className="d-flex align-items-center gap-1">
                                                    <CheckLg size={18} />
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Form>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-secondary mb-1 fs-6">
                                        Daftar Lokasi Simpan:
                                    </Form.Label>

                                    {loadingLok ? (
                                        <div className="text-center py-3"><Spinner animation="border" variant="primary" size="sm" /></div>
                                    ) : (
                                        <Form.Select
                                            size="lg"
                                            className="fw-semibold shadow-sm fs-6"
                                            value={selectedLokId}
                                            onChange={(e) => setSelectedLokId(e.target.value)}
                                        >
                                            <option value="">-- Lihat Lokasi ({locations.length}) --</option>
                                            {locations.map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.nama_lokasi}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </div>

                            {selectedLokId && (
                                <div className="pt-3 border-top mt-3 d-flex justify-content-between align-items-center bg-light p-2 rounded-3">
                                    <span className="text-dark fw-bold fs-6">
                                        Terpilih: {locations.find(l => String(l.id) === String(selectedLokId))?.nama_lokasi}
                                    </span>
                                    <Button size="sm" variant="danger" onClick={handleDeleteLokasi} className="d-flex align-items-center gap-1 fw-semibold">
                                        <Trash size={12} /> Hapus
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Satuan Card */}
                <Col lg={3} md={6}>
                    <Card className="border shadow-sm rounded-4 h-100">
                        <Card.Body className="p-4 d-flex flex-column justify-content-between">
                            <div>
                                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <h5 className="fw-bold text-primary mb-0 fs-5">
                                            Data Satuan
                                        </h5>
                                        <Badge bg="primary" className="rounded-pill px-2 py-1 fs-6">
                                            {units.length}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant={showAddSat ? "outline-secondary" : "primary"}
                                        size="sm"
                                        className="fw-bold d-flex align-items-center gap-1 shadow-sm"
                                        onClick={() => setShowAddSat(!showAddSat)}
                                    >
                                        {showAddSat ? <XCircle size={14} /> : <PlusLg size={14} />}
                                        {showAddSat ? "Batal" : "Tambah"}
                                    </Button>
                                </div>

                                {/* Form Input Satuan (Hanya muncul bila tombol diklik) */}
                                {showAddSat && (
                                    <Form onSubmit={handleAddSatuan} className="mb-4 bg-primary bg-opacity-10 p-3 rounded-3 border border-primary-subtle shadow-sm">
                                        <Form.Label className="fw-bold text-primary mb-2 fs-6">
                                            Nama Satuan Baru:
                                        </Form.Label>
                                        <Row className="g-2">
                                            <Col>
                                                <Form.Control
                                                    size="lg"
                                                    className="fs-6 fw-semibold border-primary shadow-sm bg-white"
                                                    placeholder="Ketik satuan baru..."
                                                    value={newSatuan}
                                                    onChange={(e) => setNewSatuan(e.target.value)}
                                                    required
                                                    autoFocus
                                                />
                                            </Col>
                                            <Col xs="auto">
                                                <Button type="submit" variant="primary" size="lg" className="d-flex align-items-center gap-1">
                                                    <CheckLg size={18} />
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Form>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-secondary mb-1 fs-6">
                                        Daftar Satuan Barang:
                                    </Form.Label>

                                    {loadingSat ? (
                                        <div className="text-center py-3"><Spinner animation="border" variant="primary" size="sm" /></div>
                                    ) : (
                                        <Form.Select
                                            size="lg"
                                            className="fw-semibold shadow-sm fs-6"
                                            value={selectedSatId}
                                            onChange={(e) => setSelectedSatId(e.target.value)}
                                        >
                                            <option value="">-- Lihat Satuan ({units.length}) --</option>
                                            {units.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.nama_satuan}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </div>

                            {selectedSatId && (
                                <div className="pt-3 border-top mt-3 d-flex justify-content-between align-items-center bg-light p-2 rounded-3">
                                    <span className="text-dark fw-bold fs-6">
                                        Terpilih: {units.find(u => String(u.id) === String(selectedSatId))?.nama_satuan}
                                    </span>
                                    <Button size="sm" variant="danger" onClick={handleDeleteSatuan} className="d-flex align-items-center gap-1 fw-semibold">
                                        <Trash size={12} /> Hapus
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default KategoriLokasi;
