import { useState, useEffect } from "react";
import {
    House,
    Boxes,
    BoxSeam,
    ExclamationTriangle,
    ExclamationTriangleFill,
    Archive,
    Tags,
    People,
    Gear,
    ChevronDown,
    ChevronRight,
    DatabaseDown,
    Printer,
    BarChartLine,
    FileEarmarkText,
    BoxArrowRight,
    ShieldLockFill
} from "react-bootstrap-icons";
import logoGedung from "../src/assets/logogedung.png";
import { useAuth } from "../src/context/AuthContext";

function Sidebar({ menu, setMenu }) {
    const { user, logout, isMenuVisible } = useAuth();

    const isKonfigActive = Boolean(menu && (menu === "konfigurasi" || menu.startsWith("konfigurasi-")));
    const [openSubmenu, setOpenSubmenu] = useState(isKonfigActive);

    const isLaporanActive = Boolean(menu && (menu === "laporan" || menu.startsWith("laporan-")));
    const [openLaporanSubmenu, setOpenLaporanSubmenu] = useState(isLaporanActive);

    const isDataBarangActive = Boolean(menu && (menu === "data-barang" || menu === "kartu-stok"));
    const [openDataBarangSubmenu, setOpenDataBarangSubmenu] = useState(isDataBarangActive);

    const isExpiredActive = Boolean(menu && (menu === "expired" || menu === "pemantauan-expired"));
    const [openExpiredSubmenu, setOpenExpiredSubmenu] = useState(isExpiredActive);

    const isUsersActive = Boolean(menu && (menu === "users" || menu.startsWith("users-")));
    const [openUsersSubmenu, setOpenUsersSubmenu] = useState(isUsersActive);

    useEffect(() => {
        setOpenSubmenu(isKonfigActive);
        setOpenLaporanSubmenu(isLaporanActive);
        setOpenDataBarangSubmenu(isDataBarangActive);
        setOpenExpiredSubmenu(isExpiredActive);
        setOpenUsersSubmenu(isUsersActive);
    }, [menu, isKonfigActive, isLaporanActive, isDataBarangActive, isExpiredActive, isUsersActive]);

    const toggleUsers = () => {
        if (!openUsersSubmenu) {
            setOpenUsersSubmenu(true);
            setOpenSubmenu(false);
            setOpenLaporanSubmenu(false);
            setOpenDataBarangSubmenu(false);
            setOpenExpiredSubmenu(false);
            if (!isUsersActive) {
                setMenu("users-daftar");
            }
        } else {
            setOpenUsersSubmenu(false);
        }
    };

    const toggleKonfig = () => {
        if (!openSubmenu) {
            setOpenSubmenu(true);
            setOpenLaporanSubmenu(false);
            setOpenDataBarangSubmenu(false);
            setOpenExpiredSubmenu(false);
            if (!isKonfigActive) {
                setMenu("konfigurasi-expired");
            }
        } else {
            setOpenSubmenu(false);
        }
    };

    const toggleLaporan = () => {
        if (!openLaporanSubmenu) {
            setOpenLaporanSubmenu(true);
            setOpenDataBarangSubmenu(false);
            setOpenSubmenu(false);
            setOpenExpiredSubmenu(false);
            if (!isLaporanActive) {
                setMenu("laporan-penerimaan");
            }
        } else {
            setOpenLaporanSubmenu(false);
        }
    };

    const toggleDataBarang = () => {
        if (!openDataBarangSubmenu) {
            setOpenDataBarangSubmenu(true);
            setOpenLaporanSubmenu(false);
            setOpenSubmenu(false);
            setOpenExpiredSubmenu(false);
            if (!isDataBarangActive) {
                setMenu("data-barang");
            }
        } else {
            setOpenDataBarangSubmenu(false);
        }
    };

    const toggleExpired = () => {
        if (!openExpiredSubmenu) {
            setOpenExpiredSubmenu(true);
            setOpenDataBarangSubmenu(false);
            setOpenLaporanSubmenu(false);
            setOpenSubmenu(false);
            if (!isExpiredActive) {
                setMenu("pemantauan-expired");
            }
        } else {
            setOpenExpiredSubmenu(false);
        }
    };

    const getRoleBadgeLabel = (role) => {
        switch (role) {
            case "ADMIN": return "ADMIN";
            case "OPERATOR_INVENTARIS": return "OP. INVENTARIS";
            case "OPERATOR_POLIKLINIK": return "OP. POLIKLINIK";
            default: return role || "PENGGUNA";
        }
    };

    return (
        <div className="sidebar-container">
            <div>
                <div className="sidebar-header">
                    <img
                        src={logoGedung}
                        alt="Logo Gedung Agung"
                        className="sidebar-logo"
                    />
                    <h4 className="sidebar-title-main">
                        Gedung Agung
                    </h4>
                    <div className="sidebar-title-sub">
                        Istana Kepresidenan Yogyakarta
                    </div>
                </div>

                <div className="d-flex flex-column">
                    {/* 1. Dashboard Utama */}
                    {isMenuVisible("dashboard") && (
                        <a
                            className={`sidebar-link ${menu === "dashboard" ? "active" : ""}`}
                            onClick={() => setMenu("dashboard")}
                        >
                            <House className="me-3" size={18} />
                            Dashboard
                        </a>
                    )}

                    {/* 2. Penerimaan Barang */}
                    {isMenuVisible("penerimaan") && (
                        <a
                            className={`sidebar-link ${menu === "barang" ? "active" : ""}`}
                            onClick={() => setMenu("barang")}
                        >
                            <Boxes className="me-3" size={18} />
                            Penerimaan Barang
                        </a>
                    )}

                    {/* 3. Pemakaian Barang */}
                    {isMenuVisible("pemakaian") && (
                        <a
                            className={`sidebar-link ${menu === "pemakaian" ? "active" : ""}`}
                            onClick={() => setMenu("pemakaian")}
                        >
                            <BoxSeam className="me-3" size={18} />
                            Pemakaian Barang
                        </a>
                    )}

                    {/* 4. Master Data Barang & Submenu Kartu Stok */}
                    {isMenuVisible("master_barang") && (
                        <>
                            <a
                                className={`sidebar-link d-flex align-items-center justify-content-between ${menu === "data-barang" || menu === "kartu-stok" ? "active" : ""}`}
                                onClick={toggleDataBarang}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="d-flex align-items-center">
                                    <BoxSeam className="me-3" size={18} />
                                    Data Barang
                                </div>
                                {openDataBarangSubmenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </a>

                            {openDataBarangSubmenu && (
                                <div className="ps-4 ms-2 border-start border-white border-opacity-25 d-flex flex-column my-1 gap-1">
                                    <a
                                        className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "data-barang" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                        onClick={() => setMenu("data-barang")}
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        <BoxSeam size={14} className="text-info" />
                                        Master Stok Barang
                                    </a>

                                    <a
                                        className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "kartu-stok" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                        onClick={() => setMenu("kartu-stok")}
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        <FileEarmarkText size={14} className="text-warning" />
                                        Kartu Stok (Mutasi)
                                    </a>
                                </div>
                            )}

                            <a
                                className={`sidebar-link ${menu === "kategori-lokasi" ? "active" : ""}`}
                                onClick={() => setMenu("kategori-lokasi")}
                            >
                                <Tags className="me-3" size={18} />
                                Kategori &amp; Lokasi
                            </a>
                        </>
                    )}

                    {/* 5. Menu Laporan dengan Sub-Menu Dropdown Collapsible */}
                    {isMenuVisible("laporan") && (
                        <>
                            <a
                                className={`sidebar-link d-flex align-items-center justify-content-between ${isLaporanActive ? "active" : ""}`}
                                onClick={toggleLaporan}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="d-flex align-items-center">
                                    <BarChartLine className="me-3" size={18} />
                                    Laporan
                                </div>
                                {openLaporanSubmenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </a>

                            {openLaporanSubmenu && (
                                <div className="ps-4 ms-2 border-start border-white border-opacity-25 d-flex flex-column my-1 gap-1">
                                    {isMenuVisible("rekap_penerimaan") && (
                                        <a
                                            className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "laporan-penerimaan" || menu === "laporan" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                            onClick={() => setMenu("laporan-penerimaan")}
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            <FileEarmarkText size={14} className="text-info" />
                                            Rekap Penerimaan Barang
                                        </a>
                                    )}

                                    {isMenuVisible("rekap_pemakaian") && (
                                        <a
                                            className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "laporan-pemakaian" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                            onClick={() => setMenu("laporan-pemakaian")}
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            <FileEarmarkText size={14} className="text-success" />
                                            Rekap Pemakaian Barang
                                        </a>
                                    )}

                                    {isMenuVisible("laporan_expired") && (
                                        <a
                                            className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "laporan-expired" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                            onClick={() => setMenu("laporan-expired")}
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            <FileEarmarkText size={14} className="text-danger" />
                                            Rekap Audit Kadaluwarsa
                                        </a>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* 6. Menu Kedaluwarsa */}
                    {isMenuVisible("expired") && (
                        <>
                            <a
                                className={`sidebar-link d-flex align-items-center justify-content-between ${isExpiredActive ? "active" : ""}`}
                                onClick={toggleExpired}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="d-flex align-items-center">
                                    <ExclamationTriangle className="me-3" size={18} />
                                    Kedaluwarsa
                                </div>
                                {openExpiredSubmenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </a>

                            {openExpiredSubmenu && (
                                <div className="ps-4 ms-2 border-start border-white border-opacity-25 d-flex flex-column my-1 gap-1">
                                    {isMenuVisible("pemantauan_expired") && (
                                        <a
                                            className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "pemantauan-expired" || menu === "expired" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                            onClick={() => setMenu("pemantauan-expired")}
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            <BarChartLine size={14} className="text-warning" />
                                            Pemantauan (Semua Barang)
                                        </a>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* 7. Data Terarsip */}
                    {isMenuVisible("arsip") && (
                        <a
                            className={`sidebar-link ${menu === "arsip" ? "active" : ""}`}
                            onClick={() => setMenu("arsip")}
                        >
                            <Archive className="me-3" size={18} />
                            Arsip Penerimaan
                        </a>
                    )}

                    {/* 8. Kontrol Pengguna & Hak Akses */}
                    {isMenuVisible("kelola_pengguna") && (
                        <>
                            <a
                                className={`sidebar-link d-flex align-items-center justify-content-between ${isUsersActive ? "active" : ""}`}
                                onClick={toggleUsers}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="d-flex align-items-center">
                                    <People className="me-3" size={18} />
                                    Pengguna &amp; Akses
                                </div>
                                {openUsersSubmenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </a>

                            {openUsersSubmenu && (
                                <div className="ps-4 ms-2 border-start border-white border-opacity-25 d-flex flex-column my-1 gap-1">
                                    <a
                                        className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "users" || menu === "users-daftar" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                        onClick={() => setMenu("users-daftar")}
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        <People size={14} className="text-info" />
                                        Daftar Akun Pengguna
                                    </a>

                                    <a
                                        className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "users-permissions" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                        onClick={() => setMenu("users-permissions")}
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        <ShieldLockFill size={14} className="text-warning" />
                                        Matriks Hak Akses Menu
                                    </a>
                                </div>
                            )}
                        </>
                    )}

                    {/* 9. Konfigurasi Sistem */}
                    {isMenuVisible("pengaturan") && (
                        <>
                            <a
                                className={`sidebar-link d-flex align-items-center justify-content-between ${isKonfigActive ? "active" : ""}`}
                                onClick={toggleKonfig}
                                style={{ cursor: "pointer" }}
                            >
                                <div className="d-flex align-items-center">
                                    <Gear className="me-3" size={18} />
                                    Konfigurasi
                                </div>
                                {openSubmenu ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </a>

                            {openSubmenu && (
                                <div className="ps-4 ms-2 border-start border-white border-opacity-25 d-flex flex-column my-1 gap-1">
                                    <a
                                        className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "konfigurasi-expired" || menu === "konfigurasi" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                        onClick={() => setMenu("konfigurasi-expired")}
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        <ExclamationTriangle size={14} className="text-warning" />
                                        Pengaturan Expired
                                    </a>

                                    <a
                                        className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "konfigurasi-print" || menu === "konfigurasi-instansi" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                        onClick={() => setMenu("konfigurasi-print")}
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        <Printer size={14} className="text-info" />
                                        Kontrol Print Pemakaian
                                    </a>

                                    <a
                                        className={`sidebar-link py-1.5 px-3 fs-6 d-flex align-items-center gap-2 ${menu === "konfigurasi-database" ? "active bg-white bg-opacity-10 rounded" : "opacity-75"}`}
                                        onClick={() => setMenu("konfigurasi-database")}
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        <DatabaseDown size={14} className="text-success" />
                                        Backup &amp; Database
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="sidebar-footer">
                <div className="sidebar-footer-line">Istana Kepresidenan Yogyakarta</div>
                <div style={{ fontSize: '0.6rem', marginTop: '3px', opacity: 0.5 }}>
                    &copy; {new Date().getFullYear()} Gedung Agung
                </div>
            </div>
        </div>
    );
}

export default Sidebar;