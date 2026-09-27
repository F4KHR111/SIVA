import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
    Container,
    Row,
    Col,
    Table,
    Button,
    Spinner,
    Modal,
    ProgressBar,
    Form
} from "react-bootstrap";
import {
    Boxes,
    ExclamationTriangleFill,
    CheckCircleFill,
    XCircleFill,
    PlusLg,
    PencilSquare,
    Archive,
    FileEarmarkTextFill,
    GeoAltFill,
    Upload,
    Folder2Open
} from "react-bootstrap-icons";

import ModalBarang from "../../components/ModalBarang";
import { formatKodeProduk } from "../utils";
import { useSettings } from "../context/SettingsContext";

function Dashboard({ setMenu }) {
    const { settings, getExpiredInfo } = useSettings();

    const [barang, setBarang] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openingFolder, setOpeningFolder] = useState(false);

    // Dashboard Stats
    const [stats, setStats] = useState({
        total_barang: 0,
        expired: 0,
        warning: 0,
        aman: 0
    });

    // CRUD Modal
    const [showCRUDModal, setShowCRUDModal] = useState(false);
    const [editData, setEditData] = useState(null);

    // Drilldown Modal
    const [showDrilldown, setShowDrilldown] = useState(false);
    const [drilldownTitle, setDrilldownTitle] = useState("");
    const [drilldownData, setDrilldownData] = useState([]);
    const [drilldownColor, setDrilldownColor] = useState("");

    const API_BARANG = "http://localhost:3000/api/barang";
    const API_DASHBOARD = "http://localhost:3000/api/dashboard";

    const loadDashboardStats = async () => {
        try {
            const res = await axios.get(API_DASHBOARD);
            if (res.data && res.data.success) {
                setStats(res.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat statistik dashboard:", err);
        }
    };

    const loadBarang = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API_BARANG);
            if (res.data && res.data.success) {
                setBarang(res.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat data barang:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardStats();
        loadBarang();
    }, []);

    const refreshAll = () => {
        loadDashboardStats();
        loadBarang();
    };

    const handleEdit = (item) => {
        setEditData(item);
        setShowCRUDModal(true);
    };

    const handleOpenExportsFolder = async () => {
        if (openingFolder) return;
        try {
            setOpeningFolder(true);
            const res = await axios.post("http://localhost:3000/api/data/open-folder");
            if (!res.data || !res.data.success) {
                alert("Gagal membuka folder hasil export: " + (res.data?.message || "Terjadi kesalahan."));
            }
        } catch (err) {
            console.error("Gagal membuka folder:", err);
            alert("Gagal menghubungi server untuk membuka folder.");
        } finally {
            setOpeningFolder(false);
        }
    };

    const handleArsip = async (kode) => {
        if (window.confirm(`Apakah Anda yakin ingin mengarsipkan produk "${kode}"?`)) {
            try {
                const res = await axios.put(`${API_BARANG}/arsip/${kode}`);
                alert(res.data.message || "Barang berhasil diarsipkan.");
                refreshAll();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal mengarsipkan.");
            }
        }
    };

    // Handle Card Click for Drilldown Modal
    const handleCardClick = async (category) => {
        try {
            const resActive = await axios.get(API_BARANG);
            const allProducts = (resActive.data?.data || []).filter(i => (i.stok_sisa !== undefined ? Number(i.stok_sisa) : Number(i.jumlah)) > 0);

            let title = "";
            let filteredList = [];
            let color = "primary";

            switch (category) {
                case "total":
                    title = "Daftar Semua Barang Aktif";
                    filteredList = allProducts;
                    color = "info";
                    break;
                case "aman":
                    title = "Daftar Barang Status: AMAN";
                    filteredList = allProducts.filter(i => i.sisa_hari > 30);
                    color = "success";
                    break;
                case "warning":
                    title = "Daftar Barang: MENDEKATI EXPIRED (≤ 30 Hari)";
                    filteredList = allProducts.filter(i => i.sisa_hari >= 0 && i.sisa_hari <= 30);
                    color = "warning";
                    break;
                case "expired":
                    title = "Daftar Barang: TELAH EXPIRED";
                    filteredList = allProducts.filter(i => i.sisa_hari < 0);
                    color = "danger";
                    break;
                default:
                    return;
            }

            setDrilldownTitle(title);
            setDrilldownData(filteredList);
            setDrilldownColor(color);
            setShowDrilldown(true);
        } catch (err) {
            console.error("Gagal memuat drilldown data:", err);
        }
    };

    const getIndonesianDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('id-ID', options);
    };

    const criticalList = barang.filter(item =>
        Number(item.is_no_expired) !== 1 &&
        (item.stok_sisa !== undefined ? Number(item.stok_sisa) : Number(item.jumlah)) > 0 &&
        item.sisa_hari <= (settings?.threshold_kritis || 30)
    );

    return (

        <Container fluid className="p-4">

            {/* Welcome Banner */}
            <div className="bg-white p-4 rounded-4 border mb-4 d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3 shadow-sm">
                <div>
                    <h3 className="fw-bold mb-1" style={{ color: "var(--dark-slate)" }}>
                        Selamat Datang
                    </h3>
                    <p className="text-muted mb-0">
                        Pantau ketersediaan dan masa pakai barang inventaris &mdash; <span className="text-primary fw-semibold">{getIndonesianDate()}</span>
                    </p>
                </div>
                <Button
                    variant="primary"
                    className="d-flex align-items-center gap-2 py-2 px-3 shadow-sm fw-semibold"
                    onClick={handleOpenExportsFolder}
                    disabled={openingFolder}
                    style={{ borderRadius: "10px" }}
                >
                    {openingFolder ? (
                        <>
                            <Spinner animation="border" size="sm" />
                            <span>Membuka...</span>
                        </>
                    ) : (
                        <>
                            <Folder2Open size={18} />
                            <span>Buka Folder Excel (Export)</span>
                        </>
                    )}
                </Button>
            </div>

            {/* Summary Metrics Cards */}
            <Row className="g-4 mb-4">

                <Col md={3} sm={6}>
                    <div
                        className="stat-card"
                        style={{ "--card-accent": "var(--primary-color)" }}
                        onClick={() => handleCardClick("total")}
                    >
                        <div className="stat-card-icon-container" style={{ "--icon-bg": "var(--primary-bg)", "--icon-color": "var(--primary-color)" }}>
                            <Boxes size={22} />
                        </div>
                        <div className="stat-card-title">Total Seluruh Barang</div>
                        <div className="stat-card-value">{stats.total_barang}</div>
                        <div className="stat-card-desc text-primary"><i className="bi bi-info-circle me-1"></i>Klik untuk detail</div>
                    </div>
                </Col>

                <Col md={3} sm={6}>
                    <div
                        className="stat-card"
                        style={{ "--card-accent": "#10b981" }}
                        onClick={() => handleCardClick("aman")}
                    >
                        <div className="stat-card-icon-container" style={{ "--icon-bg": "#ecfdf5", "--icon-color": "#10b981" }}>
                            <CheckCircleFill size={22} />
                        </div>
                        <div className="stat-card-title">Barang Layak (Aman)</div>
                        <div className="stat-card-value text-success">{stats.aman}</div>
                        <div className="stat-card-desc text-success"><i className="bi bi-shield-check me-1"></i>Kondisi baik</div>
                    </div>
                </Col>

                <Col md={3} sm={6}>
                    <div
                        className="stat-card"
                        style={{ "--card-accent": "#f59e0b" }}
                        onClick={() => handleCardClick("warning")}
                    >
                        <div className="stat-card-icon-container" style={{ "--icon-bg": "#fffbeb", "--icon-color": "#f59e0b" }}>
                            <ExclamationTriangleFill size={22} />
                        </div>
                        <div className="stat-card-title">{settings?.label_kritis || "Segera Expired"} (≤{settings?.threshold_kritis || 30} Hari)</div>
                        <div className="stat-card-value text-warning">{stats.warning}</div>
                        <div className="stat-card-desc text-warning"><i className="bi bi-exclamation-triangle me-1"></i>Perlu perhatian</div>
                    </div>
                </Col>

                <Col md={3} sm={6}>
                    <div
                        className="stat-card"
                        style={{ "--card-accent": "#ef4444" }}
                        onClick={() => handleCardClick("expired")}
                    >
                        <div className="stat-card-icon-container" style={{ "--icon-bg": "#fef2f2", "--icon-color": "#ef4444" }}>
                            <XCircleFill size={22} />
                        </div>
                        <div className="stat-card-title">Telah Kedaluwarsa</div>
                        <div className="stat-card-value text-danger">{stats.expired}</div>
                        <div className="stat-card-desc text-danger"><i className="bi bi-x-circle me-1"></i>Harus diganti</div>
                    </div>
                </Col>

            </Row>

            {/* Progress Bar Section */}
            <div className="bg-white p-4 rounded-4 border mb-4 shadow-sm">
                <h5 className="fw-bold mb-3" style={{ color: "var(--dark-slate)" }}>
                    Proporsi Status Barang
                </h5>
                {
                    stats.total_barang > 0 ? (
                        <>
                            <ProgressBar style={{ height: "24px" }} className="rounded-3 mb-3">
                                <ProgressBar
                                    striped variant="success"
                                    now={(stats.aman / stats.total_barang) * 100}
                                    key={1}
                                    label={`${Math.round((stats.aman / stats.total_barang) * 100)}% Aman`}
                                />
                                <ProgressBar
                                    striped variant="warning"
                                    now={(stats.warning / stats.total_barang) * 100}
                                    key={2}
                                    label={`${Math.round((stats.warning / stats.total_barang) * 100)}% Warning`}
                                />
                                <ProgressBar
                                    striped variant="danger"
                                    now={(stats.expired / stats.total_barang) * 100}
                                    key={3}
                                    label={`${Math.round((stats.expired / stats.total_barang) * 100)}% Expired`}
                                />
                            </ProgressBar>
                            <div className="d-flex flex-wrap gap-4 text-muted" style={{ fontSize: "0.85rem" }}>
                                <div className="d-flex align-items-center gap-1">
                                    <div style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "3px" }}></div>
                                    <span>Aman: {stats.aman} unit</span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <div style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "3px" }}></div>
                                    <span>Mendekati Expired: {stats.warning} unit</span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <div style={{ width: "12px", height: "12px", background: "#ef4444", borderRadius: "3px" }}></div>
                                    <span>Expired: {stats.expired} unit</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-2 text-muted">Belum ada data barang terdaftar.</div>
                    )
                }
            </div>

            {/* Critical Items Table */}
            <div className="bg-white p-4 rounded-4 border shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h5 className="fw-bold mb-0" style={{ color: "var(--dark-slate)" }}>
                            Barang Perlu Perhatian
                        </h5>
                        <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                            Barang yang sudah kedaluwarsa atau akan kedaluwarsa dalam 30 hari ke depan.
                        </span>
                    </div>
                    <Button variant="outline-primary" size="sm" onClick={() => setMenu && setMenu("expired")}>
                        Lihat Semua Expired
                    </Button>
                </div>

                {
                    loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table responsive className="custom-table">
                            <thead>
                                <tr>
                                    <th>No. Penerimaan</th>
                                    <th>Kode</th>
                                    <th>Nama Produk</th>
                                    <th>Kategori</th>
                                    <th>Jumlah</th>
                                    <th>Tanggal Expired</th>
                                    <th>Sisa Hari</th>
                                    <th>Status</th>
                                    <th>Lokasi</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    criticalList.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="text-center text-muted py-4">
                                                <CheckCircleFill className="text-success me-2" />
                                                Semua barang dalam kondisi baik. Tidak ada yang perlu ditindak.
                                            </td>
                                        </tr>
                                    ) : (
                                        criticalList.slice(0, 10).map((item) => (
                                            <tr key={item.id || item.kode_produk}>
                                                <td>
                                                    <span className="badge-code-in">
                                                        {item.no_penerimaan || "-"}
                                                    </span>
                                                </td>
                                                <td><span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span></td>
                                                <td className="fw-bold">{item.nama_produk}</td>
                                                <td>{item.kategori}</td>
                                                <td>{item.jumlah}</td>
                                                <td>{item.tanggal_expired}</td>
                                                <td>
                                                    {item.sisa_hari < 0 ? (
                                                        <span className="badge bg-danger text-white px-3 py-2 fs-6 fw-bold shadow-sm">
                                                            Lewat {Math.abs(item.sisa_hari)} Hari
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-warning text-dark px-3 py-2 fs-6 fw-bold shadow-sm">
                                                            Tinggal {item.sisa_hari} Hari
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
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
                                                <td><GeoAltFill size={12} className="me-1 text-secondary" />{item.lokasi || "-"}</td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        <Button size="sm" variant="warning" onClick={() => handleEdit(item)}>
                                                            <PencilSquare size={12} />
                                                        </Button>
                                                        <Button size="sm" variant="secondary" onClick={() => handleArsip(item.kode_produk)}>
                                                            <Archive size={12} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                }
                            </tbody>
                        </Table>
                    )
                }
            </div>

            {/* Drilldown Modal */}
            <Modal show={showDrilldown} onHide={() => setShowDrilldown(false)} size="xl" centered scrollable>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <FileEarmarkTextFill className={`text-${drilldownColor}`} />
                        {drilldownTitle}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <Table striped hover className="custom-table m-0">
                        <thead>
                            <tr>
                                <th>No. Penerimaan</th>
                                <th>Kode</th>
                                <th>Nama Produk</th>
                                <th>Kategori</th>
                                <th>Jumlah</th>
                                <th>Expired</th>
                                <th>Sisa Hari</th>
                                <th>Lokasi</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drilldownData.length === 0 ? (
                                <tr><td colSpan="9" className="text-center py-5 text-muted">Tidak ada produk dalam kategori ini.</td></tr>
                            ) : (
                                drilldownData.map((item) => (
                                    <tr key={item.id || item.kode_produk}>
                                        <td>
                                            <span className="badge-code-in">
                                                {item.no_penerimaan || "-"}
                                            </span>
                                        </td>
                                        <td><span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span></td>
                                        <td className="fw-bold">{item.nama_produk}</td>
                                        <td>{item.kategori}</td>
                                        <td>{item.jumlah}</td>
                                        <td>{item.tanggal_expired}</td>
                                        <td>
                                            {item.sisa_hari < 0 ? (
                                                <span className="badge bg-danger text-white px-3 py-2 fs-6 fw-bold shadow-sm">
                                                    Lewat {Math.abs(item.sisa_hari)} Hari
                                                </span>
                                            ) : item.sisa_hari <= 30 ? (
                                                <span className="badge bg-warning text-dark px-3 py-2 fs-6 fw-bold shadow-sm">
                                                    Tinggal {item.sisa_hari} Hari
                                                </span>
                                            ) : (
                                                <span className="badge bg-success text-white px-3 py-2 fs-6 fw-bold shadow-sm">
                                                    Masih {item.sisa_hari} Hari
                                                </span>
                                            )}
                                        </td>
                                        <td>{item.lokasi || "-"}</td>
                                         <td>
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDrilldown(false)}>Tutup</Button>
                </Modal.Footer>
            </Modal>

            {/* CRUD Modal */}
            <ModalBarang
                show={showCRUDModal}
                handleClose={() => setShowCRUDModal(false)}
                editData={editData}
                refreshData={refreshAll}
            />

        </Container>

    );

}

export default Dashboard;