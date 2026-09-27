import { useEffect, useState } from "react";
import axios from "axios";
import {
    Container, Row, Col, Card, Form, Button,
    Table, Spinner, Modal, Badge, Pagination
} from "react-bootstrap";
import { PersonBadge, PlusLg, Trash, PencilFill, PersonFill, PersonGear } from "react-bootstrap-icons";

const API_URL = "http://localhost:3000/api/users";

function ManajemenUser() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [nama, setNama] = useState("");
    const [role, setRole] = useState("pemakai");
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filtered = users.filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (u.nama || "").toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q);
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [filtered.length]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API_URL);
            if (res.data?.success) setUsers(res.data.data);
        } catch (err) {
            console.error("Gagal memuat pengguna:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const handleOpenTambah = () => {
        setNama("");
        setRole("pemakai");
        setEditMode(false);
        setEditId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setNama(user.nama || "");
        setRole(user.role || "pemakai");
        setEditMode(true);
        setEditId(user.id);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setNama("");
        setRole("pemakai");
        setEditMode(false);
        setEditId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nama.trim()) return;
        try {
            setSaving(true);
            if (editMode) {
                const res = await axios.put(`${API_URL}/${editId}`, { nama, role });
                alert(res.data.message || "Pengguna diperbarui.");
            } else {
                const res = await axios.post(API_URL, { nama, role });
                alert(res.data.message || "Pengguna ditambahkan.");
            }
            handleClose();
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Terjadi kesalahan.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, namaUser) => {
        if (!window.confirm(`Hapus pengguna "${namaUser}"?`)) return;
        try {
            const res = await axios.delete(`${API_URL}/${id}`);
            alert(res.data.message || "Pengguna dihapus.");
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Gagal menghapus pengguna.");
        }
    };

    const renderRoleBadge = (userRole) => {
        const r = (userRole || "pemakai").toLowerCase();
        if (r === "operator") {
            return <Badge bg="primary" className="px-2 py-1"><PersonGear className="me-1" />Operator</Badge>;
        }
        return <Badge bg="secondary" className="px-2 py-1 bg-opacity-75">Pemakai (Default)</Badge>;
    };

    return (
        <Container fluid className="p-4">

            {/* Header */}
            <Row className="mb-4 align-items-center">
                <Col>
                    <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
                        <PersonBadge size={22} className="text-primary" />
                        Manajemen Pengguna &amp; Role
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
                        Kelola daftar nama pengguna dan role (Pemakai / Operator).
                    </p>
                </Col>
                <Col xs="auto">
                    <Button
                        variant="primary"
                        className="d-flex align-items-center gap-2"
                        onClick={handleOpenTambah}
                        id="btn-tambah-user"
                    >
                        <PlusLg size={16} /> Tambah Pengguna
                    </Button>
                </Col>
            </Row>

            {/* Tabel */}
            <Card className="border shadow-sm rounded-4">
                <Card.Body className="p-4">
                    <Row className="mb-3 align-items-center">
                        <Col>
                            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                                Total: <strong>{users.length}</strong> pengguna
                            </span>
                        </Col>
                        <Col xs={12} sm={4}>
                            <Form.Control
                                placeholder="Cari nama atau role..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                size="sm"
                                id="input-search-user"
                            />
                        </Col>
                    </Row>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <div className="mt-2 text-muted" style={{ fontSize: "0.85rem" }}>Memuat data...</div>
                        </div>
                    ) : (
                        <>
                        <Table responsive className="custom-table m-0">
                            <thead>
                                <tr>
                                    <th style={{ width: "40px" }}>#</th>
                                    <th>Nama Pengguna</th>
                                    <th>Role Akses</th>
                                    <th style={{ width: "100px" }} className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center text-muted py-5">
                                            {search
                                                ? `Tidak ada pengguna yang cocok dengan "${search}".`
                                                : "Belum ada pengguna terdaftar."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((u, idx) => (
                                        <tr key={u.id}>
                                            <td className="text-muted" style={{ fontSize: "0.8rem" }}>{((currentPage - 1) * 10) + idx + 1}</td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: "50%",
                                                        background: `hsl(${(u.nama.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        color: "white", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0
                                                    }}>
                                                        {u.nama.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="fw-semibold">{u.nama}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {renderRoleBadge(u.role)}
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex gap-1 justify-content-center">
                                                    <Button size="sm" variant="outline-primary" onClick={() => handleOpenEdit(u)} title="Edit Role & Nama">
                                                        <PencilFill size={11} />
                                                    </Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDelete(u.id, u.nama)} title="Hapus">
                                                        <Trash size={11} />
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
                                        Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-dark fw-bold">{Math.min(currentPage * 10, filtered.length)}</span> dari <span className="text-dark fw-bold">{filtered.length}</span> pengguna (Hal. {currentPage}/{totalPages})
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
                </Card.Body>
            </Card>

            {/* Modal Tambah / Edit Pengguna */}
            <Modal show={showModal} onHide={handleClose} centered size="md" id="modal-user">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
                        <PersonFill className="text-primary" />
                        {editMode ? "Edit Pengguna & Role" : "Tambah Pengguna"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3">
                    <Form onSubmit={handleSubmit} id="form-user">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold" style={{ fontSize: "0.875rem" }}>
                                Nama Pengguna <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                                value={nama}
                                onChange={(e) => setNama(e.target.value)}
                                placeholder="Masukkan nama..."
                                required
                                autoFocus
                                id="input-nama-user"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold" style={{ fontSize: "0.875rem" }}>
                                Role / Hak Akses <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="fw-semibold"
                                id="select-role-user"
                            >
                                <option value="pemakai">Pemakai (Default)</option>
                                <option value="operator">Operator (Petugas Penerima Barang)</option>
                            </Form.Select>
                            <Form.Text className="text-muted" style={{ fontSize: "0.75rem" }}>
                                User bertipe <strong>Operator</strong> dapat dipilih sebagai Petugas Penerima di Penerimaan Barang.
                            </Form.Text>
                        </Form.Group>

                        <div className="d-flex gap-2 justify-content-end">
                            <Button variant="secondary" onClick={handleClose} disabled={saving}>
                                Batal
                            </Button>
                            <Button type="submit" variant="primary" disabled={saving} id="btn-simpan-user">
                                {saving
                                    ? <><Spinner size="sm" className="me-2" />{editMode ? "Menyimpan..." : "Menambahkan..."}</>
                                    : editMode ? "Simpan Perubahan" : "Tambah Pengguna"
                                }
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

        </Container>
    );
}

export default ManajemenUser;
