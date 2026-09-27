import { useState, useEffect, Fragment, useMemo } from "react";
import axios from "axios";
import { Container, Card, Row, Col, Table, Button, Form, Badge, Alert, Accordion, Modal } from "react-bootstrap";
import { ShieldLockFill, CheckCircleFill, TagsFill, ListCheck, ExclamationTriangleFill } from "react-bootstrap-icons";
import { useAuth } from "../context/AuthContext";

const API_USERS = "http://localhost:3000/api/users";
const API_KATEGORI = "http://localhost:3000/api/kategori";

const menuStructure = [
    { key: "dashboard", label: "Dashboard Utama", isParent: true },
    { key: "master_barang", label: "Master Data Barang", isParent: true },
    { key: "penerimaan", label: "Penerimaan Barang", isParent: true },
    { key: "pemakaian", label: "Pemakaian Barang", isParent: true },
    {
        key: "laporan", label: "Laporan Utama & Rekapitulasi", isParent: true, children: [
            { key: "rekap_penerimaan", label: "Rekapitulasi Penerimaan" },
            { key: "rekap_pemakaian", label: "Rekapitulasi Pemakaian" },
            { key: "laporan_expired", label: "Rekap Audit Kadaluwarsa" }
        ]
    },
    {
        key: "expired", label: "Kedaluwarsa & Pemantauan Status", isParent: true, children: [
            { key: "pemantauan_expired", label: "Pemantauan (Semua Barang Active)" }
        ]
    },
    { key: "arsip", label: "Data Terarsip (Arsip Penerimaan)", isParent: true },
    { key: "pengaturan", label: "Konfigurasi Sistem", isParent: true },
    { key: "kelola_pengguna", label: "Manajemen Pengguna & Hak Akses", isParent: true }
];

function MatriksHakAkses() {
    const { refreshProfile, setIsPageDirty } = useAuth();

    // State Permissions Matrix
    const [selectedRole, setSelectedRole] = useState("OPERATOR_POLIKLINIK");
    const [permissionsMap, setPermissionsMap] = useState({});
    const [initialPermissionsMap, setInitialPermissionsMap] = useState({});
    const [savingPerm, setSavingPerm] = useState(false);
    const [permMsg, setPermMsg] = useState("");

    // State Category Permissions Matrix
    const [categoryList, setCategoryList] = useState([]);
    const [roleCategoryMap, setRoleCategoryMap] = useState({});
    const [initialRoleCategoryMap, setInitialRoleCategoryMap] = useState({});
    const [savingCatPerm, setSavingCatPerm] = useState(false);
    const [catPermMsg, setCatPermMsg] = useState("");

    // Unsaved Changes Role Switch Modal State
    const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
    const [pendingRole, setPendingRole] = useState(null);

    const loadPermissions = async () => {
        try {
            const [resPerm, resCat, resCatPerm] = await Promise.all([
                axios.get(`${API_USERS}/permissions`),
                axios.get(API_KATEGORI),
                axios.get(`${API_USERS}/category-permissions`)
            ]);

            if (resPerm.data?.success) {
                const pData = resPerm.data.data || {};
                setPermissionsMap(pData);
                setInitialPermissionsMap(JSON.parse(JSON.stringify(pData)));
            }
            if (resCat.data?.success) setCategoryList(resCat.data.data || []);
            if (resCatPerm.data?.success) {
                const cData = resCatPerm.data.data || {};
                setRoleCategoryMap(cData);
                setInitialRoleCategoryMap(JSON.parse(JSON.stringify(cData)));
            }
        } catch (err) {
            console.error("Gagal memuat hak akses:", err);
        }
    };

    useEffect(() => {
        loadPermissions();
    }, []);

    // Current Role State Derived Data
    const currentRolePerms = permissionsMap[selectedRole] || {};
    const currentRoleCategories = roleCategoryMap[selectedRole] || [];

    // Dirty Checking Logic for current role
    const isDirtyPerms = useMemo(() => {
        const current = permissionsMap[selectedRole] || {};
        const initial = initialPermissionsMap[selectedRole] || {};
        return JSON.stringify(current) !== JSON.stringify(initial);
    }, [permissionsMap, initialPermissionsMap, selectedRole]);

    const isDirtyCat = useMemo(() => {
        const current = (roleCategoryMap[selectedRole] || []).slice().sort();
        const initial = (initialRoleCategoryMap[selectedRole] || []).slice().sort();
        return JSON.stringify(current) !== JSON.stringify(initial);
    }, [roleCategoryMap, initialRoleCategoryMap, selectedRole]);

    const isDirty = isDirtyPerms || isDirtyCat;

    // Save All Pending Changes Function
    const handleSaveAll = async () => {
        let success = true;
        if (isDirtyPerms) {
            try {
                const res = await axios.post(`${API_USERS}/permissions`, {
                    role: selectedRole,
                    permissions: currentRolePerms
                });
                if (res.data?.success) {
                    setInitialPermissionsMap(prev => ({
                        ...prev,
                        [selectedRole]: JSON.parse(JSON.stringify(currentRolePerms))
                    }));
                } else {
                    success = false;
                }
            } catch {
                success = false;
            }
        }
        if (isDirtyCat) {
            try {
                const res = await axios.post(`${API_USERS}/category-permissions`, {
                    role: selectedRole,
                    categories: currentRoleCategories
                });
                if (res.data?.success) {
                    setInitialRoleCategoryMap(prev => ({
                        ...prev,
                        [selectedRole]: JSON.parse(JSON.stringify(currentRoleCategories))
                    }));
                } else {
                    success = false;
                }
            } catch {
                success = false;
            }
        }
        if (success) {
            refreshProfile();
        }
        return success;
    };

    // Sync isDirty with Global Layout Navigation Guard
    useEffect(() => {
        if (isDirty) {
            setIsPageDirty(true, handleSaveAll);
        } else {
            setIsPageDirty(false);
        }
        return () => setIsPageDirty(false);
    }, [isDirty, setIsPageDirty]);

    // Window Unload Confirmation Guard
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // Handle Role Change Attempt
    const handleSelectRole = (newRole) => {
        if (newRole === selectedRole) return;
        if (isDirty) {
            setPendingRole(newRole);
            setShowRoleConfirmModal(true);
        } else {
            setSelectedRole(newRole);
            setPermMsg("");
            setCatPermMsg("");
        }
    };

    // Confirm Discarding Unsaved Changes
    const handleConfirmDiscard = () => {
        setPermissionsMap(JSON.parse(JSON.stringify(initialPermissionsMap)));
        setRoleCategoryMap(JSON.parse(JSON.stringify(initialRoleCategoryMap)));
        if (pendingRole) {
            setSelectedRole(pendingRole);
        }
        setPendingRole(null);
        setShowRoleConfirmModal(false);
        setPermMsg("");
        setCatPermMsg("");
    };

    // Reset Changes for Current Role
    const handleResetCurrentRole = () => {
        setPermissionsMap(prev => ({
            ...prev,
            [selectedRole]: JSON.parse(JSON.stringify(initialPermissionsMap[selectedRole] || {}))
        }));
        setRoleCategoryMap(prev => ({
            ...prev,
            [selectedRole]: JSON.parse(JSON.stringify(initialRoleCategoryMap[selectedRole] || []))
        }));
    };

    // Toggle Menu Permission Switch
    const handleTogglePermission = (menuKey, val) => {
        setPermissionsMap(prev => ({
            ...prev,
            [selectedRole]: {
                ...(prev[selectedRole] || {}),
                [menuKey]: val
            }
        }));
    };

    const handleSavePermissions = async () => {
        try {
            setSavingPerm(true);
            setPermMsg("");
            const res = await axios.post(`${API_USERS}/permissions`, {
                role: selectedRole,
                permissions: currentRolePerms
            });
            if (res.data?.success) {
                setPermMsg(`Hak akses menu untuk role ${selectedRole} berhasil disimpan!`);
                setInitialPermissionsMap(prev => ({
                    ...prev,
                    [selectedRole]: JSON.parse(JSON.stringify(currentRolePerms))
                }));
                refreshProfile();
            }
        } catch (err) {
            console.error("Gagal simpan hak akses:", err);
            setPermMsg(err.response?.data?.message || "Gagal menyimpan hak akses menu.");
        } finally {
            setSavingPerm(false);
        }
    };

    // Toggle Category Permission Checkbox
    const handleToggleCategoryAccess = (namaKategori) => {
        setRoleCategoryMap(prev => {
            const currentList = prev[selectedRole] ? [...prev[selectedRole]] : [];
            const exists = currentList.includes(namaKategori);

            let updated;
            if (exists) {
                updated = currentList.filter(k => k !== namaKategori);
            } else {
                updated = [...currentList, namaKategori];
            }

            return {
                ...prev,
                [selectedRole]: updated
            };
        });
    };

    const handleSaveCategoryPermissions = async () => {
        try {
            setSavingCatPerm(true);
            setCatPermMsg("");
            const res = await axios.post(`${API_USERS}/category-permissions`, {
                role: selectedRole,
                categories: currentRoleCategories
            });
            if (res.data?.success) {
                setCatPermMsg(`Pembatasan akses kategori barang untuk role ${selectedRole} berhasil disimpan!`);
                setInitialRoleCategoryMap(prev => ({
                    ...prev,
                    [selectedRole]: JSON.parse(JSON.stringify(currentRoleCategories))
                }));
                refreshProfile();
            }
        } catch (err) {
            setCatPermMsg("Gagal menyimpan pembatasan kategori.");
        } finally {
            setSavingCatPerm(false);
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
                                <ShieldLockFill className="text-warning" size={28} />
                                Matriks Hak Akses &amp; Pembatasan Kategori Barang
                            </h4>
                            <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                                Pengaturan hak akses sakelar menu/sub-menu dan pembatasan kategori barang per role.
                            </p>
                        </Col>
                        <Col md={5} className="text-md-end mt-3 mt-md-0">
                            <Form.Select
                                size="lg"
                                value={selectedRole}
                                onChange={(e) => handleSelectRole(e.target.value)}
                                className="fw-bold text-primary bg-light border-primary shadow-sm"
                            >
                                <option value="OPERATOR_POLIKLINIK">OPERATOR POLIKLINIK</option>
                                <option value="OPERATOR_INVENTARIS">OPERATOR INVENTARIS</option>
                                <option value="PEMAKAI">PEGAWAI / PEMAKAI BARANG</option>
                                <option value="ADMIN">ADMIN (Super Admin)</option>
                            </Form.Select>
                        </Col>
                    </Row>



                    {selectedRole === "ADMIN" ? (
                        <Alert variant="info" className="fw-bold fs-6 p-4 rounded-3 shadow-sm mb-0">
                            Role <strong>ADMIN (Super Admin)</strong> secara bawaan memiliki akses penuh 100% ke seluruh menu, sub-menu, dan master kategori barang tanpa batasan.
                        </Alert>
                    ) : (
                        <Accordion defaultActiveKey="0" className="d-flex flex-column gap-3">
                            {/* SUB 1: VISIBILITAS MENU UTAMA */}
                            <Accordion.Item eventKey="0" className="border shadow-sm rounded-3 overflow-hidden">
                                <Accordion.Header>
                                    <div className="d-flex align-items-center justify-content-between w-100 me-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <ListCheck className="text-primary" size={22} />
                                            <span className="fw-bold text-dark fs-6">1. Visibilitas Menu &amp; Sub-Menu Utama</span>
                                            <span className="ms-2">{getRoleBadge(selectedRole)}</span>
                                        </div>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body className="p-0">
                                    <div className="bg-light p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
                                        <span className="small text-muted fw-semibold">
                                            Aktifkan / nonaktifkan sakelar untuk mengatur visibilitas menu navigasi bagi role <strong>{selectedRole}</strong>.
                                        </span>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={handleSavePermissions}
                                            disabled={savingPerm}
                                            className="fw-bold px-3 shadow-sm"
                                        >
                                            {savingPerm ? "Menyimpan..." : "Simpan Hak Akses Menu"}
                                        </Button>
                                    </div>

                                    {permMsg && (
                                        <Alert variant="success" dismissible onClose={() => setPermMsg("")} className="fw-semibold m-3">
                                            <CheckCircleFill size={18} className="me-2" /> {permMsg}
                                        </Alert>
                                    )}

                                    <Table hover className="custom-table align-middle m-0">
                                        <thead className="bg-primary text-white" style={{ background: "#0f4c81", color: "#ffffff" }}>
                                            <tr>
                                                <th className="py-2.5 px-3 bg-primary text-white">Menu &amp; Sub-Menu Sistem</th>
                                                <th className="py-2.5 px-3 text-center bg-primary text-white" style={{ width: "200px" }}>Status Akses</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {menuStructure.map(item => {
                                                const isParentVisible = currentRolePerms[item.key] !== false;

                                                return (
                                                    <Fragment key={item.key}>
                                                        <tr className="bg-white fw-bold">
                                                            <td className="px-3 py-3 text-dark fs-6">
                                                                {item.label}
                                                            </td>
                                                            <td className="px-3 py-3 text-center">
                                                                <Form.Check
                                                                    type="switch"
                                                                    id={`switch-${selectedRole}-${item.key}`}
                                                                    checked={isParentVisible}
                                                                    onChange={(e) => handleTogglePermission(item.key, e.target.checked)}
                                                                    label={isParentVisible ? <span className="fw-bold text-success">TAMPIL</span> : <span className="fw-bold text-danger">SEMBUNYI</span>}
                                                                />
                                                            </td>
                                                        </tr>

                                                        {item.children && isParentVisible && item.children.map(child => {
                                                            const isChildVisible = currentRolePerms[child.key] !== false;

                                                            return (
                                                                <tr key={child.key} className="bg-light">
                                                                    <td className="ps-5 py-2 text-secondary font-monospace" style={{ fontSize: "0.9rem" }}>
                                                                        └── {child.label}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <Form.Check
                                                                            type="switch"
                                                                            id={`switch-${selectedRole}-${child.key}`}
                                                                            checked={isChildVisible}
                                                                            onChange={(e) => handleTogglePermission(child.key, e.target.checked)}
                                                                            label={isChildVisible ? <span className="fw-bold text-success small">TAMPIL</span> : <span className="fw-bold text-danger small">SEMBUNYI</span>}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </Accordion.Body>
                            </Accordion.Item>

                            {/* SUB 2: PEMBATASAN AKSES KATEGORI BARANG */}
                            <Accordion.Item eventKey="1" className="border shadow-sm rounded-3 overflow-hidden">
                                <Accordion.Header>
                                    <div className="d-flex align-items-center justify-content-between w-100 me-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <TagsFill className="text-primary" size={20} />
                                            <span className="fw-bold text-dark fs-6">2. Pembatasan Akses Kategori Barang</span>
                                            <Badge bg={currentRoleCategories.length > 0 ? "primary" : "secondary"} className="ms-2">
                                                {currentRoleCategories.length > 0 ? `${currentRoleCategories.length} Kategori Dicentang` : "Semua Kategori (Bebas)"}
                                            </Badge>
                                        </div>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body className="p-4 bg-white">
                                    <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom flex-wrap gap-2">
                                        <p className="text-muted small mb-0">
                                            Centang kategori barang yang <strong>boleh dilihat &amp; dikelola</strong> oleh role <strong>{selectedRole}</strong>.
                                            <br />
                                            <em>* Jika tidak ada kategori yang dicentang, maka role ini diizinkan melihat seluruh kategori barang secara bebas.</em>
                                        </p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleSaveCategoryPermissions}
                                            disabled={savingCatPerm}
                                            className="fw-bold px-3 shadow-sm"
                                        >
                                            {savingCatPerm ? "Menyimpan..." : "Simpan Akses Kategori"}
                                        </Button>
                                    </div>

                                    {catPermMsg && (
                                        <Alert variant="success" dismissible onClose={() => setCatPermMsg("")} className="fw-semibold mb-3">
                                            <CheckCircleFill size={18} className="me-2" /> {catPermMsg}
                                        </Alert>
                                    )}

                                    <Row className="g-3">
                                        {categoryList.length === 0 ? (
                                            <Col md={12}>
                                                <Alert variant="warning" className="small m-0">
                                                    Belum ada master kategori barang di sistem. Silakan buat kategori di menu <strong>Kategori &amp; Lokasi</strong>.
                                                </Alert>
                                            </Col>
                                        ) : (
                                            categoryList.map(kat => {
                                                const isChecked = currentRoleCategories.includes(kat.nama_kategori);

                                                return (
                                                    <Col md={4} key={kat.id}>
                                                        <div className={`p-3 rounded-3 border ${isChecked ? "bg-primary bg-opacity-10 border-primary" : "bg-light"}`}>
                                                            <Form.Check
                                                                type="checkbox"
                                                                id={`cat-check-${selectedRole}-${kat.id}`}
                                                                checked={isChecked}
                                                                onChange={() => handleToggleCategoryAccess(kat.nama_kategori)}
                                                                label={
                                                                    <span className="fw-bold text-dark fs-6 ms-1">
                                                                        {kat.nama_kategori}
                                                                    </span>
                                                                }
                                                            />
                                                        </div>
                                                    </Col>
                                                );
                                            })
                                        )}
                                    </Row>
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>
                    )}
                </Card.Body>
            </Card>

            {/* Modal Warning Pindah Role saat Unsaved Changes */}
            <Modal show={showRoleConfirmModal} onHide={() => setShowRoleConfirmModal(false)} centered backdrop="static">
                <Modal.Header closeButton className="bg-light py-2.5">
                    <Modal.Title className="fw-bold fs-6 text-dark">
                        Perubahan Belum Disimpan
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-3 px-4">
                    <p className="mb-0 text-dark fw-medium" style={{ fontSize: "0.9rem" }}>
                        Ada perubahan hak akses role <strong>{selectedRole}</strong> yang belum disimpan. Simpan perubahan sebelum berpindah ke role <strong>{pendingRole}</strong>?
                    </p>
                </Modal.Body>
                <Modal.Footer className="bg-light py-2.5 px-4 d-flex align-items-center justify-content-between">
                    <Button
                        variant="secondary"
                        className="fw-semibold px-3 py-2 border-0"
                        style={{ fontSize: "0.875rem", borderRadius: "6px", minWidth: "90px" }}
                        onClick={() => setShowRoleConfirmModal(false)}
                    >
                        Batal
                    </Button>
                    <div className="d-flex align-items-center gap-2">
                        <Button
                            variant="outline-danger"
                            className="fw-semibold px-3 py-2"
                            style={{ fontSize: "0.875rem", borderRadius: "6px" }}
                            onClick={handleConfirmDiscard}
                        >
                            Pindah Tanpa Simpan
                        </Button>
                        <Button
                            variant="primary"
                            className="fw-semibold px-3 py-2 border-0"
                            style={{ fontSize: "0.875rem", borderRadius: "6px" }}
                            onClick={async () => {
                                const success = await handleSaveAll();
                                if (success) {
                                    if (pendingRole) setSelectedRole(pendingRole);
                                    setPendingRole(null);
                                    setShowRoleConfirmModal(false);
                                }
                            }}
                        >
                            Simpan &amp; Pindah
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default MatriksHakAkses;
