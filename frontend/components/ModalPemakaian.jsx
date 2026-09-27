import { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col, Table, Badge, Card } from "react-bootstrap";
import axios from "axios";
import { BoxSeam, CartPlusFill, Trash, PersonFill, PlusLg, CheckCircleFill, Receipt, Search, LockFill, PencilFill } from "react-bootstrap-icons";

function ModalPemakaian({ show, handleClose, refreshData, editData }) {
    const API_NAMA_BARANG = "http://localhost:3000/api/nama-barang";
    const API_USERS = "http://localhost:3000/api/users";
    const API_PEMAKAIAN = "http://localhost:3000/api/pemakaian";

    const [products, setProducts] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    
    // Searchable Dropdown State
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Form Session State
    const [noOrder, setNoOrder] = useState("");
    const [penerima, setPenerima] = useState("");
    const [tanggalPemakaian, setTanggalPemakaian] = useState(new Date().toISOString().slice(0, 10));
    const [keteranganGlobal, setKeteranganGlobal] = useState("");

    // Current Item Draft State
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [jumlahInput, setJumlahInput] = useState("");

    // Keranjang Pemakaian (Cart List)
    const [cartItems, setCartItems] = useState([]);

    const [loading, setLoading] = useState(false);

    // Fetch Master Produk & Users
    const loadMasterData = async (tgl) => {
        try {
            const dateStr = tgl || new Date().toISOString().slice(0, 10);
            const [resProd, resUsers, resNoOrder] = await Promise.all([
                axios.get(API_NAMA_BARANG),
                axios.get(API_USERS),
                axios.get(`${API_PEMAKAIAN}/next-no-order?tanggal=${dateStr}`)
            ]);

            if (resProd.data?.success) setProducts(resProd.data.data || []);
            if (resUsers.data?.success) setAllUsers(resUsers.data.data || []);

            if (!editData && resNoOrder.data?.success) {
                setNoOrder(resNoOrder.data.no_order || "");
            }
        } catch (err) {
            console.error("Gagal memuat data modal pemakaian:", err);
        }
    };

    useEffect(() => {
        if (show) {
            if (editData) {
                // MODE EDIT: Pre-populate data transaksi yang sudah ada
                const existingPenerima = editData.penerima || "";
                const existingDate = editData.tanggal_pemakaian || new Date().toISOString().slice(0, 10);

                setNoOrder(editData.no_order || "");
                setPenerima(existingPenerima);
                setTanggalPemakaian(existingDate);
                setKeteranganGlobal(editData.keterangan || "");
                setCartItems((editData.items || []).map((it, idx) => ({
                    idDraft: Date.now() + idx,
                    kode_produk: it.kode_produk || "",
                    nama_produk: it.nama_produk,
                    satuan: it.satuan || "Pcs",
                    jumlah: it.jumlah
                })));

                loadMasterData(existingDate);
            } else {
                // MODE BARU: Reset form
                const today = new Date().toISOString().slice(0, 10);
                setTanggalPemakaian(today);
                loadMasterData(today);
                setPenerima("");
                setKeteranganGlobal("");
                setSelectedProduct(null);
                setJumlahInput("");
                setCartItems([]);
                setSearchQuery("");
                setIsDropdownOpen(false);
            }
        }
    }, [show, editData]);

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setTanggalPemakaian(newDate);
        if (!editData) {
            axios.get(`${API_PEMAKAIAN}/next-no-order?tanggal=${newDate}`)
                .then(res => {
                    if (res.data?.success) setNoOrder(res.data.no_order);
                })
                .catch(err => console.error(err));
        }
    };

    // Filter produk otomatis berdasarkan huruf yang diketik
    const matchingProducts = products.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (p.nama && p.nama.toLowerCase().includes(q)) ||
            (p.kode && p.kode.toLowerCase().includes(q)) ||
            (p.kategori && p.kategori.toLowerCase().includes(q)) ||
            (p.sub_kategori && p.sub_kategori.toLowerCase().includes(q))
        );
    });

    const handleSelectProduct = (p) => {
        if ((p.total_stok || 0) <= 0) return;
        setSelectedProduct(p);
        setSearchQuery(p.kode ? `[${p.kode}] ${p.nama}` : p.nama);
        setIsDropdownOpen(false);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        setSelectedProduct(null);
        setIsDropdownOpen(true);
    };

    const handleClearSelection = () => {
        setSelectedProduct(null);
        setSearchQuery("");
        setIsDropdownOpen(true);
    };

    // Tambah item ke Keranjang Pemakaian
    const handleAddToCart = () => {
        if (!selectedProduct) {
            alert("Silakan ketik dan pilih produk dari daftar pencarian terlebih dahulu.");
            return;
        }

        const qtyInt = parseInt(jumlahInput, 10);
        if (!qtyInt || qtyInt <= 0) {
            alert("Masukkan jumlah pemakaian yang valid.");
            return;
        }

        // Cek sisa stok
        const currentInCart = cartItems.filter(c => c.nama_produk === selectedProduct.nama)
            .reduce((sum, c) => sum + c.jumlah, 0);

        const availableStock = (selectedProduct.total_stok || 0) - currentInCart;

        if (qtyInt > availableStock) {
            alert(`Jumlah (${qtyInt}) melebihi stok yang tersedia (${availableStock} unit).`);
            return;
        }

        const newItem = {
            idDraft: Date.now(),
            kode_produk: selectedProduct.kode || "",
            nama_produk: selectedProduct.nama,
            satuan: selectedProduct.satuan || "Pcs",
            jumlah: qtyInt,
            stokMaster: selectedProduct.total_stok || 0
        };

        setCartItems(prev => [...prev, newItem]);

        // Reset item draft input
        setSelectedProduct(null);
        setJumlahInput("");
        setSearchQuery("");
        setIsDropdownOpen(false);
    };

    // Hapus item dari Keranjang dengan konfirmasi
    const handleRemoveFromCart = (itemToRemove) => {
        const namaProd = itemToRemove.nama_produk || "produk ini";
        if (window.confirm(`Apakah Anda yakin ingin menghapus "${namaProd}" dari keranjang pemakaian ini?`)) {
            setCartItems(prev => prev.filter(c => c.idDraft !== itemToRemove.idDraft));
        }
    };

    // Simpan semua item pemakaian dari keranjang
    const handleSubmitAll = async (e) => {
        e.preventDefault();

        if (!penerima) {
            alert("Silakan pilih Nama Penerima Barang terlebih dahulu.");
            return;
        }

        if (cartItems.length === 0) {
            alert("Keranjang pemakaian masih kosong! Silakan masukkan minimal 1 produk ke keranjang.");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                no_order: noOrder,
                is_edit: !!editData,
                penerima: penerima,
                tanggal_pemakaian: tanggalPemakaian,
                keterangan: keteranganGlobal,
                items: cartItems.map(item => ({
                    kode_produk: item.kode_produk,
                    nama_produk: item.nama_produk,
                    jumlah: item.jumlah
                }))
            };

            const res = await axios.post(API_PEMAKAIAN, payload);
            alert(res.data.message || `Pemakaian barang (${noOrder}) berhasil disimpan.`);
            refreshData();
            handleClose();
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menyimpan pemakaian barang.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="xl">
            
            {/* Header Modal Rapi & Ringkas */}
            <Modal.Header closeButton className="border-bottom py-2 px-3 bg-white">
                <div className="d-flex align-items-center justify-content-between w-100 me-2">
                    <Modal.Title className="fw-bold text-dark fs-5 d-flex align-items-center gap-2">
                        {editData ? (
                            <><PencilFill className="text-primary" size={20} /> Edit Transaksi Pemakaian Barang</>
                        ) : (
                            <><BoxSeam className="text-primary" size={20} /> Form Pemakaian Barang (Keranjang)</>
                        )}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 px-3 py-1 border border-primary rounded-3">
                        <Receipt className="text-primary" size={16} />
                        <span className="fw-bold text-primary" style={{ fontSize: "0.875rem" }}>No. Order:</span>
                        <strong className="text-primary font-monospace fs-6">
                            {noOrder || "OUT-..."}
                        </strong>
                    </div>
                </div>
            </Modal.Header>

            <Form onSubmit={handleSubmitAll}>
                <Modal.Body className="p-3" style={{ backgroundColor: "#f8fafc" }}>
                    
                    {/* BARIS 1: INFORMASI UTAMA PENERIMA & TANGGAL */}
                    <Card className="border shadow-sm rounded-3 mb-2 bg-white">
                        <Card.Body className="p-2 px-3">
                            <Row className="g-2 align-items-center">
                                <Col md={6}>
                                    <Form.Group className="d-flex align-items-center gap-2">
                                        <Form.Label className="fw-bold text-dark text-nowrap mb-0" style={{ fontSize: "0.875rem", minWidth: "150px" }}>
                                            Penerima Produk <span className="text-danger">*</span>:
                                        </Form.Label>
                                        <Form.Select
                                            size="sm"
                                            value={penerima}
                                            onChange={(e) => setPenerima(e.target.value)}
                                            className="fw-bold text-primary border-primary shadow-sm"
                                            required
                                        >
                                            <option value="">-- Pilih Pegawai Pemakai --</option>
                                            {penerima && !allUsers.some(u => u.nama === penerima) && (
                                                <option value={penerima}>{penerima}</option>
                                            )}

                                            {allUsers
                                                .filter(u => (u.role || '').toUpperCase() === 'PEMAKAI')
                                                .map(u => (
                                                    <option key={u.id} value={u.nama}>
                                                        👤 {u.nama}
                                                    </option>
                                                ))
                                            }
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group className="d-flex align-items-center gap-2">
                                        <Form.Label className="fw-bold text-dark text-nowrap mb-0" style={{ fontSize: "0.875rem", minWidth: "140px" }}>
                                            Tanggal Pemakaian <span className="text-danger">*</span>:
                                        </Form.Label>
                                        <Form.Control
                                            size="sm"
                                            type="date"
                                            value={tanggalPemakaian}
                                            onChange={handleDateChange}
                                            className="fw-bold border-secondary"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* BARIS 2: TAMBAH / PILIH PRODUK KE KERANJANG */}
                    <Card className="border border-primary-subtle shadow-sm rounded-3 mb-2 bg-white">
                        <Card.Body className="p-2 px-3">
                            <div className="fw-bold text-primary mb-1" style={{ fontSize: "0.85rem" }}>
                                🛒 TAMBAH PRODUK KE KERANJANG PEMAKAIAN:
                            </div>

                            <Row className="g-2 align-items-end">
                                {/* UNIFIED SEARCHABLE DROPDOWN */}
                                <Col md={5} className="position-relative">
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-dark mb-1 fs-6">
                                            Cari &amp; Pilih Barang <span className="text-danger">*</span>:
                                        </Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                size="lg"
                                                type="text"
                                                placeholder="Ketik nama atau kode barang..."
                                                value={searchQuery}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                onChange={handleInputChange}
                                                className="fw-bold text-dark border-primary fs-6 pe-5"
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearSelection}
                                                    className="btn btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-2 p-0 text-decoration-none fw-bold"
                                                    style={{ zIndex: 5 }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {/* Floating Dropdown Result List */}
                                        {isDropdownOpen && (
                                            <div
                                                className="position-absolute start-0 end-0 bg-white border border-primary-subtle rounded-3 shadow-lg mt-1 overflow-auto"
                                                style={{ maxHeight: "260px", zIndex: 1050 }}
                                            >
                                                {matchingProducts.length === 0 ? (
                                                    <div className="p-3 text-muted text-center fs-6">
                                                        Tidak ditemukan barang dengan kata kunci "{searchQuery}".
                                                    </div>
                                                ) : (
                                                    matchingProducts.map((p) => {
                                                        const isSelected = selectedProduct?.id === p.id;
                                                        const isOutOfStock = (p.total_stok || 0) <= 0;
                                                        return (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => handleSelectProduct(p)}
                                                                className={`p-2 px-3 border-bottom d-flex align-items-center justify-content-between ${
                                                                    isOutOfStock
                                                                        ? "bg-light text-muted opacity-60"
                                                                        : isSelected
                                                                        ? "bg-primary bg-opacity-10 text-primary fw-bold"
                                                                        : "bg-white text-dark"
                                                                }`}
                                                                style={{ cursor: isOutOfStock ? "not-allowed" : "pointer" }}
                                                            >
                                                                <div>
                                                                    <div className="fw-bold text-dark fs-6">
                                                                        {p.kode && (
                                                                            <span className="font-monospace text-primary me-2 bg-light px-1.5 py-0.5 rounded border">
                                                                                [{p.kode}]
                                                                            </span>
                                                                        )}
                                                                        {p.nama}
                                                                    </div>
                                                                    <div className="text-secondary small" style={{ fontSize: "0.8rem" }}>
                                                                        {p.kategori || "Tanpa Kategori"} {p.sub_kategori ? `• ${p.sub_kategori}` : ""}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    {isOutOfStock ? (
                                                                        <Badge bg="danger" className="px-2 py-1 fs-6">Stok Habis</Badge>
                                                                    ) : (
                                                                        <Badge bg="success" className="px-2 py-1 fs-6 fw-bold">
                                                                            Stok: {p.total_stok} {p.satuan || "Pcs"}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </Form.Group>
                                </Col>

                                {/* STOK TERSEDIA BADGE */}
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-dark mb-1 fs-6">
                                            Stok Tersedia:
                                        </Form.Label>
                                        <div className="p-2 border rounded bg-success bg-opacity-10 text-center fw-bold text-success fs-5">
                                            {selectedProduct ? `${selectedProduct.total_stok || 0} ${selectedProduct.satuan || 'Pcs'}` : "-"}
                                        </div>
                                    </Form.Group>
                                </Col>

                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-dark mb-1 fs-6">
                                            Jumlah Keluar:
                                        </Form.Label>
                                        <Form.Control
                                            size="lg"
                                            type="number"
                                            min="1"
                                            max={selectedProduct ? selectedProduct.total_stok : 9999}
                                            placeholder="Jumlah"
                                            value={jumlahInput}
                                            onChange={(e) => setJumlahInput(e.target.value)}
                                            className="fw-bold text-primary text-center fs-5"
                                        />
                                    </Form.Group>
                                </Col>

                                {/* TOMBOL UTAMA KERANJANG */}
                                <Col md={2}>
                                    <Button
                                        size="lg"
                                        type="button"
                                        variant="primary"
                                        className="w-100 fw-bold d-flex align-items-center justify-content-center gap-1 shadow-sm fs-6"
                                        onClick={handleAddToCart}
                                    >
                                        <CartPlusFill /> + KERANJANG
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* BARIS 3: TABEL DRAFT KERANJANG */}
                    <Card className="border shadow-sm rounded-3 bg-white">
                        <Card.Body className="p-2 px-3">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                                <div className="fw-bold text-dark" style={{ fontSize: "0.85rem" }}>
                                    DAFTAR KERANJANG PEMAKAIAN ({noOrder}):
                                </div>
                                <Badge bg="primary" className="px-2 py-1 rounded-pill" style={{ fontSize: "0.75rem" }}>
                                    {cartItems.length} Produk
                                </Badge>
                            </div>

                            <Table responsive hover size="sm" className="custom-table m-0 border rounded">
                                <thead className="bg-light">
                                    <tr>
                                        <th style={{ width: "35px" }}>#</th>
                                        <th>Kode</th>
                                        <th>Nama Produk</th>
                                        <th>Jumlah Keluar</th>
                                        <th style={{ width: "80px" }} className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-3" style={{ fontSize: "0.825rem" }}>
                                                Keranjang masih kosong. Pilih produk lalu klik tombol biru <strong>"+ KERANJANG"</strong>.
                                            </td>
                                        </tr>
                                    ) : (
                                        cartItems.map((item, idx) => (
                                            <tr key={item.idDraft}>
                                                <td className="text-muted" style={{ fontSize: "0.8rem" }}>{idx + 1}</td>
                                                <td className="fw-bold text-primary" style={{ fontSize: "0.85rem" }}>{item.kode_produk || "-"}</td>
                                                <td className="fw-bold text-dark" style={{ fontSize: "0.875rem" }}>{item.nama_produk}</td>
                                                <td>
                                                    <Form.Control
                                                        size="sm"
                                                        type="number"
                                                        min="1"
                                                        value={item.jumlah}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10) || 1;
                                                            setCartItems(prev => prev.map(c => c.idDraft === item.idDraft ? { ...c, jumlah: val } : c));
                                                        }}
                                                        className="fw-bold text-danger border-danger-subtle text-center py-0"
                                                        style={{ maxWidth: "90px", fontSize: "0.85rem" }}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        onClick={() => handleRemoveFromCart(item)}
                                                        title="Hapus dari keranjang"
                                                        className="py-0 px-2"
                                                        style={{ fontSize: "0.75rem" }}
                                                    >
                                                        <Trash size={11} /> Hapus
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                </Modal.Body>

                <Modal.Footer className="border-top bg-white px-3 py-2 d-flex justify-content-between align-items-center">
                    <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading} className="px-3">
                        Batal
                    </Button>

                    <div className="d-flex align-items-center gap-2">
                        {cartItems.length === 0 && (
                            <span className="text-muted fw-semibold" style={{ fontSize: "0.8rem" }}>
                                ⚠️ Klik <strong>"+ KERANJANG"</strong> dulu untuk menyimpan.
                            </span>
                        )}
                        <Button
                            variant="success"
                            size="md"
                            type="submit"
                            disabled={loading || cartItems.length === 0}
                            className="px-4 py-2 fs-6 fw-bold d-flex align-items-center gap-2 shadow-sm"
                        >
                            <CheckCircleFill />
                            {loading ? "Menyimpan..." : editData ? `SIMPAN PERUBAHAN (${cartItems.length} PRODUK)` : `SIMPAN PEMAKAIAN (${cartItems.length} PRODUK)`}
                        </Button>
                    </div>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default ModalPemakaian;
