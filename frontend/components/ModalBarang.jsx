import { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col, Badge, Card, Table } from "react-bootstrap";
import { Receipt, BoxSeam, CartPlusFill, Trash, CheckCircleFill, PencilFill, XCircle } from "react-bootstrap-icons";
import axios from "axios";

function ModalBarang({ show, handleClose, editData, refreshData }) {
    const API_BARANG = "http://localhost:3000/api/barang";
    const API_NAMA_BARANG = "http://localhost:3000/api/nama-barang";
    const API_USERS = "http://localhost:3000/api/users";
    const API_KAT = "http://localhost:3000/api/kategori";
    const API_SAT = "http://localhost:3000/api/satuan";
    const API_LOK = "http://localhost:3000/api/lokasi";

    // Master Relational Data
    const [namaBarangs, setNamaBarangs] = useState([]);
    const [operators, setOperators] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [kategoris, setKategoris] = useState([]);
    const [subKategoris, setSubKategoris] = useState([]);
    const [satuans, setSatuans] = useState([]);
    const [lokasis, setLokasis] = useState([]);

    // Sesi Penerimaan (Keranjang) State
    const [noPenerimaan, setNoPenerimaan] = useState("");
    const [penerimaGlobal, setPenerimaGlobal] = useState("");
    const [tanggalMasukGlobal, setTanggalMasukGlobal] = useState(new Date().toISOString().slice(0, 10));
    const [cartItems, setCartItems] = useState([]);

    // Edit Cart Item State & Deleted Items tracking
    const [editingCartId, setEditingCartId] = useState(null);
    const [deletedItems, setDeletedItems] = useState([]);

    // Current Item Draft State
    const initialForm = {
        kode_produk: "",
        nama_produk: "",
        kategori: "",
        sub_kategori: "",
        satuan: "",
        jumlah: "",
        tanggal_expired: "",
        lokasi: ""
    };
    const [form, setForm] = useState(initialForm);

    const [isNamaLainnya, setIsNamaLainnya] = useState(false);
    const [isKatLainnya, setIsKatLainnya] = useState(false);
    const [isSubKatLainnya, setIsSubKatLainnya] = useState(false);
    const [isSatLainnya, setIsSatLainnya] = useState(false);
    const [isLokLainnya, setIsLokLainnya] = useState(false);
    const [isNoExpired, setIsNoExpired] = useState(false);
    const [loading, setLoading] = useState(false);

    const get5YearsDate = (tanggalMasuk) => {
        const base = tanggalMasuk ? new Date(tanggalMasuk) : new Date();
        if (isNaN(base.getTime())) {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 5);
            return d.toISOString().slice(0, 10);
        }
        const d = new Date(base);
        d.setFullYear(d.getFullYear() + 5);
        return d.toISOString().slice(0, 10);
    };

    const handleToggleNoExpired = (e) => {
        const checked = e.target.checked;
        setIsNoExpired(checked);
        if (checked) {
            setForm(prev => ({
                ...prev,
                tanggal_expired: get5YearsDate(tanggalMasukGlobal)
            }));
        }
    };

    // Load master list produk, operator, kategori, satuan, lokasi & next no_penerimaan
    const loadMasterData = async (tgl) => {
        try {
            const dateStr = tgl || tanggalMasukGlobal;
            const [resMaster, resUsers, resKat, resSat, resLok, resNo] = await Promise.all([
                axios.get(API_NAMA_BARANG),
                axios.get(API_USERS),
                axios.get(API_KAT),
                axios.get(API_SAT),
                axios.get(API_LOK),
                axios.get(`${API_BARANG}/next-no-penerimaan?tanggal=${dateStr}`)
            ]);

            if (resMaster.data?.success) setNamaBarangs(resMaster.data.data || []);
            if (resUsers.data?.success) {
                setAllUsers(resUsers.data.data || []);
                const ops = (resUsers.data.data || []).filter(u => u.role === 'operator');
                setOperators(ops.length > 0 ? ops : resUsers.data.data || []);
            }
            if (resKat.data?.success) setKategoris(resKat.data.data || []);
            if (resSat.data?.success) setSatuans(resSat.data.data || []);
            if (resLok.data?.success) setLokasis(resLok.data.data || []);

            if (!editData && resNo.data?.success) {
                setNoPenerimaan(resNo.data.no_penerimaan || "");
            }
        } catch (err) {
            console.error("Gagal memuat master data:", err);
        }
    };

    useEffect(() => {
        if (show) {
            const today = new Date().toISOString().slice(0, 10);
            setEditingCartId(null);
            setDeletedItems([]);
            setForm(initialForm);
            setIsNamaLainnya(false);
            setIsKatLainnya(false);
            setIsSubKatLainnya(false);
            setIsSatLainnya(false);
            setIsLokLainnya(false);
            setIsNoExpired(false);

            if (editData) {
                const existingPenerima = editData.penerima || "";
                const existingDate = editData.tanggal_masuk || today;
                const existingNoPenerimaan = editData.no_penerimaan || "";

                setPenerimaGlobal(existingPenerima);
                setTanggalMasukGlobal(existingDate);
                setNoPenerimaan(existingNoPenerimaan);

                const fallbackItem = {
                    idDraft: editData.kode_produk || Date.now(),
                    isExisting: true,
                    kode_produk: editData.kode_produk || "",
                    nama_produk: editData.nama_produk || "",
                    kategori: editData.kategori || "",
                    sub_kategori: editData.sub_kategori || "",
                    satuan: editData.satuan || "",
                    jumlah: parseInt(editData.jumlah, 10) || 1,
                    tanggal_expired: editData.tanggal_expired || "",
                    lokasi: editData.lokasi || "",
                    is_no_expired: Boolean(editData.is_no_expired) || (editData.sisa_hari !== undefined && editData.sisa_hari > 365) ? 1 : 0
                };

                if (existingNoPenerimaan) {
                    axios.get(`${API_BARANG}/penerimaan/${encodeURIComponent(existingNoPenerimaan)}`)
                        .then(res => {
                            if (res.data?.success && res.data.data && res.data.data.length > 0) {
                                const mapped = res.data.data.map((r, idx) => ({
                                    idDraft: r.kode_produk || (Date.now() + idx),
                                    isExisting: true,
                                    kode_produk: r.kode_produk || "",
                                    nama_produk: r.nama_produk || "",
                                    kategori: r.kategori || "",
                                    sub_kategori: r.sub_kategori || "",
                                    satuan: r.satuan || "",
                                    jumlah: parseInt(r.jumlah, 10) || 1,
                                    tanggal_expired: r.tanggal_expired || "",
                                    lokasi: r.lokasi || "",
                                    is_no_expired: Number(r.is_no_expired) === 1 ? 1 : 0
                                }));
                                setCartItems(mapped);
                            } else {
                                setCartItems([fallbackItem]);
                            }
                        })
                        .catch(err => {
                            console.error("Gagal memuat batch penerimaan:", err);
                            setCartItems([fallbackItem]);
                        });
                } else {
                    setCartItems([fallbackItem]);
                }

                loadMasterData(existingDate);
            } else {
                setTanggalMasukGlobal(today);
                setForm(initialForm);
                setPenerimaGlobal("");
                setCartItems([]);
                setNoPenerimaan("");
                loadMasterData(today);
            }
        }
    }, [show, editData]);

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setTanggalMasukGlobal(newDate);
        if (!editData) {
            axios.get(`${API_BARANG}/next-no-penerimaan?tanggal=${newDate}`)
                .then(res => {
                    if (res.data?.success) setNoPenerimaan(res.data.no_penerimaan);
                })
                .catch(err => console.error(err));
        }
    };

    // Fetch Sub Kategori secara otomatis bila form.kategori berubah
    useEffect(() => {
        if (form.kategori && form.kategori.trim() !== "") {
            axios.get(`${API_KAT}/sub?kategori=${encodeURIComponent(form.kategori)}`)
                .then(res => {
                    if (res.data?.success) setSubKategoris(res.data.data || []);
                })
                .catch(() => setSubKategoris([]));
        } else {
            setSubKategoris([]);
        }
    }, [form.kategori]);

    const handleNamaSelect = (e) => {
        const value = e.target.value;
        if (value === "__LAINNYA__") {
            setIsNamaLainnya(true);
            setForm(prev => ({
                ...prev,
                nama_produk: "",
                kode_produk: "",
                kategori: "",
                sub_kategori: "",
                satuan: "",
                lokasi: ""
            }));
        } else {
            setIsNamaLainnya(false);
            const found = namaBarangs.find(n => n.nama === value);
            if (found) {
                setForm(prev => ({
                    ...prev,
                    nama_produk: found.nama,
                    kode_produk: found.kode || "",
                    kategori: found.kategori || "",
                    sub_kategori: found.sub_kategori || "",
                    satuan: found.satuan || "",
                    lokasi: found.lokasi || ""
                }));
                setIsKatLainnya(!kategoris.some(k => k.nama_kategori === found.kategori) && Boolean(found.kategori));
                setIsSubKatLainnya(!subKategoris.some(sk => sk.nama_sub_kategori === found.sub_kategori) && Boolean(found.sub_kategori));
                setIsSatLainnya(!satuans.some(s => s.nama_satuan === found.satuan) && Boolean(found.satuan));
                setIsLokLainnya(!lokasis.some(l => l.nama_lokasi === found.lokasi) && Boolean(found.lokasi));
            } else {
                setForm(prev => ({ ...prev, nama_produk: value }));
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: name === "kode_produk" ? value.toUpperCase() : value
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

    // Tambah / Update Item di Keranjang Penerimaan
    const handleAddToCart = () => {
        if (!form.nama_produk || form.nama_produk.trim() === "") {
            alert("Silakan pilih atau isi nama barang terlebih dahulu.");
            return;
        }

        const qtyInt = parseInt(form.jumlah, 10);
        if (!qtyInt || qtyInt <= 0) {
            alert("Masukkan jumlah barang diterima yang valid.");
            return;
        }

        if (!isNoExpired && (!form.tanggal_expired || form.tanggal_expired.trim() === "")) {
            alert("Silakan pilih tanggal expired atau centang 'Tidak ada expired (5 Thn)'.");
            return;
        }

        const tglExp = isNoExpired ? get5YearsDate(tanggalMasukGlobal) : form.tanggal_expired;

        if (editingCartId) {
            // Mode Memperbarui Item dari Keranjang
            setCartItems(prev => prev.map(item => {
                if (item.idDraft === editingCartId) {
                    return {
                        ...item,
                        kode_produk: form.kode_produk || item.kode_produk || "",
                        nama_produk: form.nama_produk.trim(),
                        kategori: form.kategori || "",
                        sub_kategori: form.sub_kategori || "",
                        satuan: form.satuan || "Pcs",
                        jumlah: qtyInt,
                        tanggal_expired: tglExp,
                        lokasi: form.lokasi || "",
                        is_no_expired: isNoExpired ? 1 : 0
                    };
                }
                return item;
            }));
            setEditingCartId(null);
        } else {
            // Mode Tambah Item Baru ke Keranjang (Cek jika barang & exp sama sudah ada di keranjang)
            const targetNama = form.nama_produk.trim().toLowerCase();
            setCartItems(prev => {
                const existingIdx = prev.findIndex(item =>
                    item.nama_produk.trim().toLowerCase() === targetNama &&
                    (item.tanggal_expired === tglExp || (Boolean(item.is_no_expired) && isNoExpired))
                );

                if (existingIdx >= 0) {
                    const clone = [...prev];
                    clone[existingIdx] = {
                        ...clone[existingIdx],
                        jumlah: clone[existingIdx].jumlah + qtyInt
                    };
                    return clone;
                } else {
                    const newItem = {
                        idDraft: Date.now(),
                        isExisting: false,
                        kode_produk: form.kode_produk || "",
                        nama_produk: form.nama_produk.trim(),
                        kategori: form.kategori || "",
                        sub_kategori: form.sub_kategori || "",
                        satuan: form.satuan || "Pcs",
                        jumlah: qtyInt,
                        tanggal_expired: tglExp,
                        lokasi: form.lokasi || "",
                        is_no_expired: isNoExpired ? 1 : 0
                    };
                    return [...prev, newItem];
                }
            });
        }

        // Reset draft item form
        setForm(initialForm);
        setIsNamaLainnya(false);
        setIsKatLainnya(false);
        setIsSubKatLainnya(false);
        setIsSatLainnya(false);
        setIsLokLainnya(false);
        setIsNoExpired(false);
    };

    // Muat data item keranjang ke form untuk diedit
    const handleEditCartItem = (itemToEdit) => {
        setEditingCartId(itemToEdit.idDraft);
        setForm({
            kode_produk: itemToEdit.kode_produk || "",
            nama_produk: itemToEdit.nama_produk || "",
            kategori: itemToEdit.kategori || "",
            sub_kategori: itemToEdit.sub_kategori || "",
            satuan: itemToEdit.satuan || "",
            jumlah: itemToEdit.jumlah || "",
            tanggal_expired: itemToEdit.tanggal_expired || "",
            lokasi: itemToEdit.lokasi || ""
        });

        setIsNamaLainnya(false);
        setIsKatLainnya(false);
        setIsSubKatLainnya(false);
        setIsSatLainnya(false);
        setIsLokLainnya(false);
        setIsNoExpired(Number(itemToEdit.is_no_expired) === 1);
    };

    const handleCancelEditCartItem = () => {
        setEditingCartId(null);
        setForm(initialForm);
        setIsNamaLainnya(false);
        setIsKatLainnya(false);
        setIsSubKatLainnya(false);
        setIsSatLainnya(false);
        setIsLokLainnya(false);
        setIsNoExpired(false);
    };

    const handleRemoveFromCart = (itemToRemove) => {
        if (window.confirm(`Hapus "${itemToRemove.nama_produk}" dari penerimaan ini?`)) {
            if (itemToRemove.isExisting && itemToRemove.kode_produk) {
                setDeletedItems(prev => [...prev, itemToRemove.kode_produk]);
            }
            if (editingCartId === itemToRemove.idDraft) {
                handleCancelEditCartItem();
            }
            setCartItems(prev => prev.filter(c => c.idDraft !== itemToRemove.idDraft));
        }
    };

    // Simpan Semua Item Keranjang (Mode Baru & Edit Batch)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!penerimaGlobal) {
            alert("Silakan pilih Petugas Penerima terlebih dahulu.");
            return;
        }

        if (cartItems.length === 0) {
            alert("Keranjang penerimaan masih kosong! Silakan masukkan minimal 1 barang.");
            return;
        }

        try {
            setLoading(true);

            if (editData || noPenerimaan) {
                // Update batch penerimaan
                const payload = {
                    no_penerimaan: noPenerimaan,
                    penerima: penerimaGlobal,
                    tanggal_masuk: tanggalMasukGlobal,
                    items: cartItems,
                    deletedItems: deletedItems
                };

                const res = await axios.put(`${API_BARANG}/batch/${encodeURIComponent(noPenerimaan)}`, payload);
                alert(res.data.message || `Transaksi penerimaan (${noPenerimaan}) berhasil diperbarui.`);
            } else {
                // Buat batch penerimaan baru
                const payload = {
                    no_penerimaan: noPenerimaan,
                    penerima: penerimaGlobal,
                    tanggal_masuk: tanggalMasukGlobal,
                    items: cartItems
                };

                const res = await axios.post(`${API_BARANG}/batch`, payload);
                alert(res.data.message || `Penerimaan barang (${noPenerimaan}) berhasil disimpan.`);
            }

            refreshData();
            handleClose();
        } catch (err) {
            console.error("Gagal menyimpan penerimaan barang:", err);
            alert(err.response?.data?.message || "Gagal menyimpan penerimaan barang.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="xl">
            {/* Header Modal Rapi */}
            <Modal.Header closeButton className="border-bottom py-2 px-3 bg-white">
                <div className="d-flex align-items-center justify-content-between w-100 me-2">
                    <Modal.Title className="fw-bold text-dark fs-5 d-flex align-items-center gap-2">
                        {editData ? (
                            <><PencilFill className="text-primary" size={20} /> Edit Transaksi Penerimaan Barang</>
                        ) : (
                            <><BoxSeam className="text-primary" size={20} /> Form Keranjang Penerimaan Barang</>
                        )}
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2 bg-primary bg-opacity-10 px-3 py-1 border border-primary rounded-3">
                        <Receipt className="text-primary" size={16} />
                        <span className="fw-bold text-primary" style={{ fontSize: "0.875rem" }}>No. Masuk:</span>
                        <strong className="text-primary font-monospace fs-6">
                            {noPenerimaan || "IN-..."}
                        </strong>
                    </div>
                </div>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body className="p-3" style={{ backgroundColor: "#f8fafc" }}>
                    
                    {/* BARIS 1: INFORMASI PETUGAS & TANGGAL PENERIMAAN */}
                    <Card className="border shadow-sm rounded-3 mb-2 bg-white">
                        <Card.Body className="p-2 px-3">
                            <Row className="g-2 align-items-center">
                                <Col md={6}>
                                    <Form.Group className="d-flex align-items-center gap-2">
                                        <Form.Label className="fw-bold text-dark text-nowrap mb-0" style={{ fontSize: "0.875rem", minWidth: "150px" }}>
                                            Petugas Penerima <span className="text-danger">*</span>:
                                        </Form.Label>
                                        <Form.Select
                                            size="sm"
                                            value={penerimaGlobal}
                                            onChange={(e) => setPenerimaGlobal(e.target.value)}
                                            className="fw-bold text-primary border-primary shadow-sm"
                                            required
                                        >
                                            <option value="">-- Pilih Petugas Penerima --</option>
                                            {penerimaGlobal && !allUsers.some(u => u.nama === penerimaGlobal) && (
                                                <option value={penerimaGlobal}>{penerimaGlobal}</option>
                                            )}
                                            {allUsers
                                                .filter(u => (u.role || '').toUpperCase() !== 'PEMAKAI')
                                                .map(u => (
                                                    <option key={u.id} value={u.nama}>
                                                        👤 {u.nama} ({(u.role || 'OPERATOR').toUpperCase()})
                                                    </option>
                                                ))
                                            }
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group className="d-flex align-items-center gap-2">
                                        <Form.Label className="fw-bold text-dark text-nowrap mb-0" style={{ fontSize: "0.875rem", minWidth: "140px" }}>
                                            Tanggal Masuk <span className="text-danger">*</span>:
                                        </Form.Label>
                                        <Form.Control
                                            size="sm"
                                            type="date"
                                            value={tanggalMasukGlobal}
                                            onChange={handleDateChange}
                                            className="fw-bold border-secondary"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* BARIS 2: INPUT / EDIT DETAIL BARANG (DAPAT TAMBAH ITEM KAPAN SAJA) */}
                    <Card className={`border ${editingCartId ? "border-warning" : "border-primary-subtle"} shadow-sm rounded-3 mb-2 bg-white`}>
                        <Card.Body className="p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className={`fw-bold ${editingCartId ? "text-warning" : "text-primary"}`} style={{ fontSize: "0.875rem" }}>
                                    {editingCartId ? (
                                        <>✏️ EDIT DETAIL BARANG TERPILIH DI KERANJANG:</>
                                    ) : (
                                        <>📦 INPUT DETAIL BARANG DITERIMA (TAMBAH ITEM):</>
                                    )}
                                </div>
                                {editingCartId && (
                                    <Button size="sm" variant="outline-secondary" onClick={handleCancelEditCartItem} className="py-0 px-2 text-nowrap" style={{ fontSize: "0.75rem" }}>
                                        <XCircle size={12} className="me-1" /> Batal Edit Item
                                    </Button>
                                )}
                            </div>

                            {/* Form Input Draft Barang */}
                            <Row className="g-2 mb-2">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-dark mb-1 fs-6">
                                            Nama Barang <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Select
                                            size="lg"
                                            className="fw-bold text-dark border-primary shadow-sm fs-6"
                                            value={isNamaLainnya ? "__LAINNYA__" : form.nama_produk}
                                            onChange={handleNamaSelect}
                                        >
                                            <option value="">-- Pilih Barang Terdaftar --</option>
                                            {namaBarangs.map(n => (
                                                <option key={n.id} value={n.nama}>
                                                    {n.kode ? `[${n.kode}] ${n.nama}` : n.nama}
                                                </option>
                                            ))}
                                            <option value="__LAINNYA__">+ Ketik Manual (Barang Baru)</option>
                                        </Form.Select>
                                        {isNamaLainnya && (
                                            <Form.Control
                                                size="lg"
                                                className="mt-2 fs-6 fw-semibold"
                                                placeholder="Ketik nama barang baru..."
                                                name="nama_produk"
                                                value={form.nama_produk}
                                                onChange={handleChange}
                                            />
                                        )}
                                    </Form.Group>
                                </Col>

                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-dark mb-1 fs-6">
                                            Jumlah Diterima <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="number"
                                            size="lg"
                                            min="1"
                                            name="jumlah"
                                            value={form.jumlah}
                                            onChange={handleChange}
                                            placeholder="Jumlah..."
                                            className="fw-bold text-success text-center fs-5"
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold text-dark mb-1 fs-6">
                                            Tanggal Expired <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="date"
                                            size="lg"
                                            name="tanggal_expired"
                                            value={form.tanggal_expired}
                                            onChange={handleChange}
                                            disabled={isNoExpired}
                                            className={isNoExpired ? "bg-info-subtle fw-bold text-primary border-info fs-6" : "fs-6 fw-semibold"}
                                        />
                                        <Form.Check
                                            type="checkbox"
                                            id="checkbox-no-expired-batch"
                                            className="mt-1"
                                            label={<span className="fw-bold text-primary fs-6">Tidak ada expired (5 Thn)</span>}
                                            checked={isNoExpired}
                                            onChange={handleToggleNoExpired}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* Form Tambahan khusus jika barang baru (Ketik Manual) */}
                            {isNamaLainnya && (
                                <div className="p-2 bg-light rounded-3 border mb-2">
                                    <Row className="g-2">
                                        <Col md={2.4}>
                                            <Form.Label className="fw-bold text-dark mb-1 fs-6">Kode Barang</Form.Label>
                                            <Form.Control size="lg" className="fs-6 fw-semibold" placeholder="Kode Barang" name="kode_produk" value={form.kode_produk} onChange={handleChange} />
                                        </Col>
                                        <Col md={2.4}>
                                            <Form.Label className="fw-bold text-dark mb-1 fs-6">Kategori</Form.Label>
                                            <Form.Select size="lg" className="fs-6 fw-semibold" value={isKatLainnya ? "__LAINNYA__" : form.kategori} onChange={handleSelectKategori}>
                                                <option value="">-- Pilih Kategori --</option>
                                                {kategoris.map(k => (<option key={k.id} value={k.nama_kategori}>{k.nama_kategori}</option>))}
                                                <option value="__LAINNYA__">+ Kategori Baru</option>
                                            </Form.Select>
                                            {isKatLainnya && (<Form.Control size="lg" className="mt-1 fs-6" placeholder="Kategori Baru..." name="kategori" value={form.kategori} onChange={handleChange} />)}
                                        </Col>
                                        <Col md={2.4}>
                                            <Form.Label className="fw-bold text-dark mb-1 fs-6">Sub Kategori</Form.Label>
                                            {subKategoris.length > 0 && !isSubKatLainnya ? (
                                                <Form.Select size="lg" className="fs-6 fw-semibold" value={isSubKatLainnya ? "__LAINNYA__" : form.sub_kategori} onChange={handleSelectSubKategori}>
                                                    <option value="">-- Pilih Sub --</option>
                                                    {subKategoris.map(sk => (<option key={sk.id} value={sk.nama_sub_kategori}>{sk.nama_sub_kategori}</option>))}
                                                    <option value="__LAINNYA__">+ Sub Baru</option>
                                                </Form.Select>
                                            ) : (
                                                <Form.Control size="lg" className="fs-6 fw-semibold" placeholder="Sub Kategori..." name="sub_kategori" value={form.sub_kategori} onChange={handleChange} />
                                            )}
                                        </Col>
                                        <Col md={2.4}>
                                            <Form.Label className="fw-bold text-dark mb-1 fs-6">Satuan</Form.Label>
                                            <Form.Select size="lg" className="fs-6 fw-semibold" value={isSatLainnya ? "__LAINNYA__" : form.satuan} onChange={handleSelectSatuan}>
                                                <option value="">-- Pilih Satuan --</option>
                                                {satuans.map(s => (<option key={s.id} value={s.nama_satuan}>{s.nama_satuan}</option>))}
                                                <option value="__LAINNYA__">+ Satuan Baru</option>
                                            </Form.Select>
                                            {isSatLainnya && (<Form.Control size="lg" className="mt-1 fs-6" placeholder="Satuan Baru..." name="satuan" value={form.satuan} onChange={handleChange} />)}
                                        </Col>
                                        <Col md={2.4}>
                                            <Form.Label className="fw-bold text-dark mb-1 fs-6">Lokasi Simpan</Form.Label>
                                            <Form.Select size="lg" className="fs-6 fw-semibold" value={isLokLainnya ? "__LAINNYA__" : form.lokasi} onChange={handleSelectLokasi}>
                                                <option value="">-- Pilih Lokasi --</option>
                                                {lokasis.map(l => (<option key={l.id} value={l.nama_lokasi}>{l.nama_lokasi}</option>))}
                                                <option value="__LAINNYA__">+ Lokasi Baru</option>
                                            </Form.Select>
                                            {isLokLainnya && (<Form.Control size="lg" className="mt-1 fs-6" placeholder="Lokasi Baru..." name="lokasi" value={form.lokasi} onChange={handleChange} />)}
                                        </Col>
                                    </Row>
                                </div>
                            )}

                            <div className="d-flex justify-content-end gap-2">
                                {editingCartId && (
                                    <Button
                                        size="lg"
                                        type="button"
                                        variant="outline-secondary"
                                        className="fw-bold px-3 fs-6"
                                        onClick={handleCancelEditCartItem}
                                    >
                                        Batal Edit
                                    </Button>
                                )}
                                <Button
                                    size="lg"
                                    type="button"
                                    variant={editingCartId ? "warning" : "primary"}
                                    className="fw-bold px-4 d-flex align-items-center gap-2 shadow-sm fs-6"
                                    onClick={handleAddToCart}
                                >
                                    {editingCartId ? (
                                        <><PencilFill /> PERBARUI ITEM DI KERANJANG</>
                                    ) : (
                                        <><CartPlusFill /> + MASUKKAN KE KERANJANG</>
                                    )}
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* BARIS 3: TABEL DRAFT KERANJANG PENERIMAAN */}
                    <Card className="border shadow-sm rounded-3 bg-white">
                        <Card.Body className="p-2 px-3">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                                <div className="fw-bold text-dark" style={{ fontSize: "0.875rem" }}>
                                    DAFTAR BARANG PENERIMAAN ({noPenerimaan || "IN-..."}):
                                </div>
                                <Badge bg="primary" className="px-2.5 py-1 rounded-pill fs-6">
                                    {cartItems.length} Produk (Total: {cartItems.reduce((s, i) => s + i.jumlah, 0)} Unit)
                                </Badge>
                            </div>

                            <Table responsive hover size="sm" className="custom-table m-0 border rounded">
                                <thead className="bg-light">
                                    <tr>
                                        <th style={{ width: "35px" }}>#</th>
                                        <th>Kode</th>
                                        <th>Nama Barang</th>
                                        <th>Jumlah</th>
                                        <th>Expired</th>
                                        <th>Lokasi</th>
                                        <th style={{ width: "140px" }} className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-4 fs-6">
                                                Keranjang penerimaan masih kosong. Isi detail barang lalu klik <strong>"+ MASUKKAN KE KERANJANG"</strong>.
                                            </td>
                                        </tr>
                                    ) : (
                                        cartItems.map((item, idx) => (
                                            <tr key={item.idDraft} className={editingCartId === item.idDraft ? "table-warning" : ""}>
                                                <td className="text-muted fs-6">{idx + 1}</td>
                                                <td className="fw-bold text-primary font-monospace fs-6">{item.kode_produk || "-"}</td>
                                                <td className="fw-bold text-dark fs-6">
                                                    {item.nama_produk}
                                                    <div className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                                                        {item.kategori || "Tanpa Kategori"} {item.sub_kategori ? `• ${item.sub_kategori}` : ""}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge bg-success px-2.5 py-1.5 fs-6 fw-bold">
                                                        {item.jumlah} {item.satuan || "Pcs"}
                                                    </span>
                                                </td>
                                                <td className="fw-bold text-dark fs-6">
                                                    {Number(item.is_no_expired) === 1 ? (
                                                        <span className="badge bg-info text-dark px-2 py-1 fs-6">5 Thn (Non-Expired)</span>
                                                    ) : item.tanggal_expired}
                                                </td>
                                                <td className="fs-6">{item.lokasi || "-"}</td>
                                                <td className="text-center">
                                                    <div className="d-flex gap-1 justify-content-center">
                                                        <Button
                                                            size="sm"
                                                            variant="outline-primary"
                                                            onClick={() => handleEditCartItem(item)}
                                                            title="Edit item di keranjang"
                                                            className="py-1 px-2 fs-6"
                                                        >
                                                            <PencilFill size={12} /> Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            onClick={() => handleRemoveFromCart(item)}
                                                            title="Hapus dari keranjang"
                                                            className="py-1 px-2 fs-6"
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
                        </Card.Body>
                    </Card>

                </Modal.Body>

                <Modal.Footer className="border-top bg-white px-3 py-2 d-flex justify-content-between align-items-center">
                    <Button variant="secondary" size="md" onClick={handleClose} disabled={loading} className="px-4 fw-semibold">
                        Batal
                    </Button>

                    <div className="d-flex align-items-center gap-2">
                        {cartItems.length === 0 && (
                            <span className="text-muted fw-semibold" style={{ fontSize: "0.8rem" }}>
                                ⚠️ Klik <strong>"+ MASUKKAN KE KERANJANG"</strong> dulu untuk menyimpan.
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
                            {loading
                                ? "Menyimpan..."
                                : editData
                                ? `SIMPAN PERUBAHAN (${cartItems.length} PRODUK)`
                                : `SIMPAN PENERIMAAN (${cartItems.length} PRODUK)`
                            }
                        </Button>
                    </div>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default ModalBarang;