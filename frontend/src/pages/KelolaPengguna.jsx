import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Container, Card, Row, Col, Table, Button, Form, Modal, Badge, Spinner, InputGroup, Alert } from "react-bootstrap";
import { PeopleFill, PersonPlusFill, PencilSquare, Trash, Search, FunnelFill, ShieldCheck, QrCode, PhoneFill, ArrowClockwise, KeyFill } from "react-bootstrap-icons";

const API_USERS = "http://localhost:3000/api/users";
const API_AUTH = "http://localhost:3000/api/auth";

const emptyForm = { username: "", email: "", password: "", nama: "", role: "OPERATOR_INVENTARIS", status: "active" };

function KelolaPengguna() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    // State Modal Setup Microsoft Authenticator (2FA)
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [selectedUser2FA, setSelectedUser2FA] = useState(null);
    const [twoFAData, setTwoFAData] = useState(null);
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [twoFAInputCode, setTwoFAInputCode] = useState("");
    const [twoFAActivating, setTwoFAActivating] = useState(false);
    const [twoFAMsg, setTwoFAMsg] = useState({ type: "", text: "" });

    // State Search & Filter Role
    const [keyword, setKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API_USERS);
            if (res.data?.success) setUsers(res.data.data);
        } catch (err) {
            console.error("Gagal memuat pengguna:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Filter & Urutkan secara alfabetis A-Z berdasar nama
    const filteredUsers = useMemo(() => {
        return users
            .filter(u => {
                if (roleFilter !== "ALL" && (u.role || "").toUpperCase() !== roleFilter.toUpperCase()) {
                    return false;
                }
                if (keyword.trim()) {
                    const kw = keyword.toLowerCase().trim();
                    const matchNama = (u.nama || "").toLowerCase().includes(kw);
                    const matchUsername = (u.username || "").toLowerCase().includes(kw);
                    const matchEmail = (u.email || "").toLowerCase().includes(kw);
                    if (!matchNama && !matchUsername && !matchEmail) return false;
                }
                return true;
            })
            .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" }));
    }, [users, roleFilter, keyword]);

    const handleOpenTambah = () => {
        setForm(emptyForm);
        setEditMode(false);
        setEditId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setForm({
            username: user.username || "",
            email: user.email || "",
            password: "",
            nama: user.nama || "",
            role: user.role || "OPERATOR_INVENTARIS",
            status: user.status || "active"
        });
        setEditMode(true);
        setEditId(user.id);
        setShowModal(true);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!form.username.trim() || !form.nama.trim()) {
            alert("Username dan Nama wajib diisi.");
            return;
        }
        if (!editMode && !form.password.trim()) {
            alert("Password awal wajib diisi.");
            return;
        }

        try {
            setSaving(true);
            if (editMode) {
                await axios.put(`${API_USERS}/${editId}`, form);
                alert("Pengguna berhasil diperbarui.");
            } else {
                await axios.post(API_USERS, form);
                alert("Pengguna baru berhasil ditambahkan.");
            }
            setShowModal(false);
            setForm(emptyForm);
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menyimpan pengguna.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (window.confirm(`Hapus akun pengguna "${user.nama}" (${user.username})?`)) {
            try {
                await axios.delete(`${API_USERS}/${user.id}`);
                alert("Pengguna berhasil dihapus.");
                loadUsers();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal menghapus.");
            }
        }
    };

    // Buka Modal Setup Microsoft Authenticator
    const handleOpen2FASetup = async (user) => {
        setSelectedUser2FA(user);
        setTwoFAMsg({ type: "", text: "" });
        setTwoFAInputCode("");
        setShow2FAModal(true);
        setTwoFALoading(true);

        try {
            const res = await axios.get(`${API_AUTH}/2fa/setup?userId=${user.id}`);
            if (res.data?.success) {
                setTwoFAData(res.data);
            } else {
                setTwoFAMsg({ type: "danger", text: res.data?.message || "Gagal memuat QR Code." });
            }
        } catch (err) {
            setTwoFAMsg({ type: "danger", text: err.response?.data?.message || "Gagal menghubungi server 2FA." });
        } finally {
            setTwoFALoading(false);
        }
    };

    // Konfirmasi & Aktifkan 2FA
    const handleActivate2FA = async (e) => {
        e.preventDefault();
        if (!twoFAInputCode.trim() || twoFAInputCode.trim().length !== 6) {
            setTwoFAMsg({ type: "danger", text: "Masukkan 6 digit kode dari aplikasi Microsoft Authenticator." });
            return;
        }

        try {
            setTwoFAActivating(true);
            setTwoFAMsg({ type: "", text: "" });
            const res = await axios.post(`${API_AUTH}/2fa/enable`, {
                userId: selectedUser2FA.id,
                secret: twoFAData.secret,
                otpCode: twoFAInputCode.trim()
            });

            if (res.data?.success) {
                setTwoFAMsg({ type: "success", text: res.data.message });
                loadUsers();
                setTimeout(() => {
                    setShow2FAModal(false);
                }, 1500);
            }
        } catch (err) {
            setTwoFAMsg({ type: "danger", text: err.response?.data?.message || "Gagal mengaktifkan Microsoft Authenticator." });
        } finally {
            setTwoFAActivating(false);
        }
    };

    // Reset / Nonaktifkan 2FA
    const handleReset2FA = async (user) => {
        if (window.confirm(`Reset & Nonaktifkan Microsoft Authenticator untuk akun "${user.nama}" (${user.username})? Pengguna akan dapat login kembali tanpa kode OTP.`)) {
            try {
                const res = await axios.post(`${API_USERS}/${user.id}/reset-2fa`);
                alert(res.data?.message || "2FA berhasil direset.");
                loadUsers();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal mereset 2FA.");
            }
        }
    };

    const getRoleBadge = (role) => {
        const uRole = (role || "").toUpperCase();
        switch (uRole) {
            case "ADMIN":
                return <Badge bg="dark">ADMIN</Badge>;
            case "OPERATOR_INVENTARIS":
                return <Badge bg="primary">OPERATOR INVENTARIS</Badge>;
            case "OPERATOR_POLIKLINIK":
                return <Badge bg="info" className="text-dark">OPERATOR POLIKLINIK</Badge>;
            case "PEMAKAI":
                return <Badge bg="secondary">PEGAWAI / PEMAKAI BARANG</Badge>;
            default:
                return <Badge bg="secondary">{role}</Badge>;
        }
    };

    return (
        <Container fluid className="p-4">
            <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4">
                    <Row className="mb-4 align-items-center">
                        <Col md={7}>
                            <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                                <PeopleFill className="text-primary" size={28} />
                                Kelola Akun Pengguna &amp; Pemakai
                            </h4>
                            <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                                Manajemen akun login, alamat email, enkripsi password, dan konfigurasi Microsoft Authenticator (2FA).
                            </p>
                        </Col>
                        <Col md={5} className="text-md-end mt-3 mt-md-0">
                            <Button variant="primary" onClick={handleOpenTambah} className="fw-bold px-3 py-2 shadow-sm">
                                <PersonPlusFill size={18} className="me-1" /> Tambah Akun Pengguna
                            </Button>
                        </Col>
                    </Row>

                    {/* Filter & Search Bar */}
                    <div className="bg-light p-3 rounded-3 border mb-4 shadow-sm">
                        <Row className="g-2 align-items-center">
                            <Col md={5}>
                                <InputGroup size="sm">
                                    <InputGroup.Text className="bg-white border-end-0">
                                        <Search size={14} className="text-muted" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Cari Nama / Username / Email..."
                                        className="border-start-0 ps-0 fw-semibold"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={4}>
                                <InputGroup size="sm">
                                    <InputGroup.Text className="bg-white border-end-0 fw-semibold text-muted" style={{ fontSize: "0.825rem" }}>
                                        <FunnelFill size={13} className="me-1 text-primary" /> Filter Role:
                                    </InputGroup.Text>
                                    <Form.Select
                                        className="border-start-0 fw-bold text-dark"
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                    >
                                        <option value="ALL">Semua Role Pengguna</option>
                                        <option value="ADMIN">ADMIN (Super Admin)</option>
                                        <option value="OPERATOR_INVENTARIS">OPERATOR INVENTARIS</option>
                                        <option value="OPERATOR_POLIKLINIK">OPERATOR POLIKLINIK</option>
                                        <option value="PEMAKAI">PEGAWAI / PEMAKAI BARANG</option>
                                    </Form.Select>
                                </InputGroup>
                            </Col>
                            <Col md={3} className="text-md-end d-flex align-items-center justify-content-md-end gap-2">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => { setKeyword(""); setRoleFilter("ALL"); }}
                                    disabled={!keyword && roleFilter === "ALL"}
                                    className="fw-semibold"
                                >
                                    Reset Filter
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    {/* Table List Users */}
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table responsive hover className="custom-table align-middle m-0 border rounded-3 overflow-hidden shadow-sm">
                            <thead className="bg-primary text-white" style={{ background: "#0f4c81", color: "#ffffff" }}>
                                <tr>
                                    <th className="text-center bg-primary text-white py-3 px-3" style={{ width: "50px" }}>No</th>
                                    <th className="bg-primary text-white py-3 px-3">Username &amp; Email</th>
                                    <th className="bg-primary text-white py-3 px-3">Nama Lengkap</th>
                                    <th className="bg-primary text-white py-3 px-3">Role Akses</th>
                                    <th className="text-center bg-primary text-white py-3 px-3" style={{ width: "160px" }}>2FA Authenticator</th>
                                    <th className="text-center bg-primary text-white py-3 px-3" style={{ width: "100px" }}>Status</th>
                                    <th className="text-center bg-primary text-white py-3 px-3" style={{ width: "150px" }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-4 text-muted fw-semibold">
                                            Tidak ada data pengguna yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u, i) => (
                                        <tr key={u.id}>
                                            <td className="text-center fw-bold text-secondary">{i + 1}</td>
                                            <td>
                                                <div className="fw-bold font-monospace text-primary">{u.username}</div>
                                                {u.email ? (
                                                    <div className="text-muted small" style={{ fontSize: "0.8rem" }}>{u.email}</div>
                                                ) : (
                                                    <span className="badge bg-light text-muted border" style={{ fontSize: "0.7rem" }}>Belum ada email</span>
                                                )}
                                            </td>
                                            <td className="fw-bold text-dark">{u.nama}</td>
                                            <td>{getRoleBadge(u.role)}</td>
                                            <td className="text-center">
                                                {Number(u.is_2fa_enabled) === 1 ? (
                                                    <Badge bg="success" className="px-2 py-1 shadow-sm d-inline-flex align-items-center gap-1">
                                                        <ShieldCheck size={13} /> Aktif (MS Auth)
                                                    </Badge>
                                                ) : (
                                                    <Badge bg="secondary" className="px-2 py-1 bg-opacity-25 text-dark border">
                                                        Belum Aktif
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={u.status === "active" ? "success" : "danger"}>
                                                    {u.status === "active" ? "Aktif" : "Non-Aktif"}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant={Number(u.is_2fa_enabled) === 1 ? "outline-success" : "outline-primary"}
                                                        onClick={() => handleOpen2FASetup(u)}
                                                        title="Setup Microsoft Authenticator (QR Code)"
                                                    >
                                                        <QrCode size={14} />
                                                    </Button>
                                                    {Number(u.is_2fa_enabled) === 1 && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-warning"
                                                            onClick={() => handleReset2FA(u)}
                                                            title="Reset 2FA (Buka Kunci)"
                                                        >
                                                            <ArrowClockwise size={14} />
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="warning" onClick={() => handleOpenEdit(u)} title="Edit Akun & Password">
                                                        <PencilSquare size={14} />
                                                    </Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteUser(u)} title="Hapus Akun">
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
                </Card.Body>
            </Card>

            {/* Modal Form Tambah / Edit User */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title className="fw-bold fs-5">
                        {editMode ? "Edit Akun Pengguna" : "Tambah Akun Pengguna Baru"}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveUser}>
                    <Modal.Body className="p-4">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-dark">Nama Lengkap Petugas / Pemakai</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Misal: Budi Santoso"
                                value={form.nama}
                                onChange={(e) => setForm(prev => ({ ...prev, nama: e.target.value }))}
                                className="fw-semibold"
                                required
                            />
                        </Form.Group>

                        <Row className="g-2 mb-3">
                            <Col md={6}>
                                <Form.Label className="fw-bold small text-dark">Username Login</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Misal: budi_inv"
                                    value={form.username}
                                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                                    className="fw-semibold font-monospace"
                                    required
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="fw-bold small text-dark">Alamat Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Misal: budi@gedungagung.id"
                                    value={form.email}
                                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="fw-semibold"
                                />
                            </Col>
                            <Col xs={12}>
                                <Form.Text className="text-muted" style={{ fontSize: "0.8rem" }}>
                                    * Email tercatat di database dan dapat digunakan untuk login serta label di Microsoft Authenticator.
                                </Form.Text>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-dark">
                                {editMode ? "Password Baru (Kosongkan jika tidak diganti)" : "Password Login"}
                            </Form.Label>
                            <Form.Control
                                type="password"
                                placeholder={editMode ? "Password baru..." : "Password..."}
                                value={form.password}
                                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                className="fw-semibold"
                                required={!editMode}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-dark">Role / Kategori Pengguna</Form.Label>
                            <Form.Select
                                value={form.role}
                                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                                className="fw-bold text-dark"
                            >
                                <option value="PEMAKAI">PEGAWAI / PEMAKAI BARANG (Pengambil Inventaris)</option>
                                <option value="OPERATOR_INVENTARIS">OPERATOR INVENTARIS</option>
                                <option value="OPERATOR_POLIKLINIK">OPERATOR POLIKLINIK</option>
                                <option value="ADMIN">ADMIN (Super Admin)</option>
                            </Form.Select>
                            <Form.Text className="text-muted" style={{ fontSize: "0.8rem" }}>
                                * Role <strong>PEGAWAI / PEMAKAI BARANG</strong> akan muncul secara otomatis di dropdown pilihan penerima saat transaksi Pemakaian Barang.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small text-dark">Status Akun</Form.Label>
                            <Form.Select
                                value={form.status}
                                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                                className="fw-semibold"
                            >
                                <option value="active">Aktif</option>
                                <option value="inactive">Non-Aktif (Di-suspend)</option>
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button variant="secondary" onClick={() => setShowModal(false)} className="fw-bold">Batal</Button>
                        <Button type="submit" variant="primary" disabled={saving} className="fw-bold px-4">
                            {saving ? "Menyimpan..." : "Simpan Akun"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal Setup Microsoft Authenticator (QR Code Scan) */}
            <Modal show={show2FAModal} onHide={() => setShow2FAModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
                        <PhoneFill size={22} />
                        Setup Microsoft Authenticator: {selectedUser2FA?.nama} ({selectedUser2FA?.username})
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {twoFAMsg.text && (
                        <Alert variant={twoFAMsg.type} className="py-2.5 small fw-semibold mb-3">
                            {twoFAMsg.text}
                        </Alert>
                    )}

                    {twoFALoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted fw-semibold">Membuat QR Code Microsoft Authenticator...</p>
                        </div>
                    ) : twoFAData ? (
                        <Row className="g-4 align-items-center">
                            <Col md={5} className="text-center border-end">
                                <div className="p-2 border rounded-3 bg-white d-inline-block shadow-sm mb-2">
                                    <img
                                        src={twoFAData.qrCodeUrl}
                                        alt="QR Code Microsoft Authenticator"
                                        style={{ width: "200px", height: "200px" }}
                                    />
                                </div>
                                <div className="small text-muted fw-bold">
                                    {selectedUser2FA?.email || selectedUser2FA?.username}
                                </div>
                            </Col>
                            <Col md={7}>
                                <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1">
                                    <ShieldCheck className="text-success" size={18} /> Panduan Pemasangan di HP:
                                </h6>
                                <ol className="small text-muted ps-3 mb-3" style={{ lineHeight: "1.6" }}>
                                    <li>Buka aplikasi <strong>Microsoft Authenticator</strong> di HP Anda.</li>
                                    <li>Tekan tombol <strong>+ (Tambah Akun)</strong>, lalu pilih <strong>"Akun lainnya (Google, Facebook, dll)"</strong>.</li>
                                    <li>Arahkan kamera HP ke <strong>QR Code</strong> di sebelah kiri.</li>
                                    <li>Akun akan langsung tersimpan dan memunculkan 6 digit angka yang berganti setiap 30 detik.</li>
                                </ol>

                                <div className="bg-light p-2.5 rounded-2 border mb-3">
                                    <div className="text-muted small fw-bold" style={{ fontSize: "0.75rem" }}>Kunci Pengaturan Manual (Jika tidak bisa scan):</div>
                                    <code className="text-primary fw-bold font-monospace user-select-all" style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
                                        {twoFAData.secret}
                                    </code>
                                </div>

                                <Form onSubmit={handleActivate2FA}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold text-dark">
                                            Masukkan 6 Digit Kode dari Aplikasi untuk Konfirmasi:
                                        </Form.Label>
                                        <InputGroup size="lg">
                                            <InputGroup.Text className="bg-white">
                                                <KeyFill className="text-primary" />
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={6}
                                                placeholder="000000"
                                                value={twoFAInputCode}
                                                onChange={(e) => setTwoFAInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                                className="text-center fw-bold fs-4 font-monospace"
                                                style={{ letterSpacing: "6px" }}
                                                required
                                            />
                                            <Button
                                                type="submit"
                                                variant="success"
                                                className="fw-bold px-4"
                                                disabled={twoFAActivating || twoFAInputCode.trim().length !== 6}
                                            >
                                                {twoFAActivating ? "Memvalidasi..." : "Aktifkan 2FA"}
                                            </Button>
                                        </InputGroup>
                                    </Form.Group>
                                </Form>
                            </Col>
                        </Row>
                    ) : null}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={() => setShow2FAModal(false)} className="fw-bold">
                        Tutup
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default KelolaPengguna;
