import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import { PersonFill, BoxArrowRight, ExclamationTriangleFill } from "react-bootstrap-icons";
import Sidebar from "../components/Sidebar";
import Dashboard from "./pages/Dashboard";
import SemuaBarang from "./pages/SemuaBarang";
import PemakaianBarang from "./pages/PemakaianBarang";
import BarangExpired from "./pages/BarangExpired";
import ArsipBarang from "./pages/ArsipBarang";
import KategoriLokasi from "./pages/KategoriLokasi";
import DataBarang from "./pages/DataBarang";
import KartuStok from "./pages/KartuStok";
import KelolaPengguna from "./pages/KelolaPengguna";
import MatriksHakAkses from "./pages/MatriksHakAkses";
import LaporanPenerimaan from "./pages/LaporanPenerimaan";
import LaporanPemakaian from "./pages/LaporanPemakaian";
import LaporanExpired from "./pages/LaporanExpired";
import KonfigurasiExpired from "./pages/KonfigurasiExpired";
import KonfigurasiPrint from "./pages/KonfigurasiPrint";
import KonfigurasiDatabase from "./pages/KonfigurasiDatabase";
import Login from "./pages/Login";
import logoGedung from "./assets/logogedung.png";
import { SettingsProvider } from "./context/SettingsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

function MainLayout() {
  const { user, isLoggedIn, logout, isMenuVisible, isPageDirty, setIsPageDirty, savePageChanges } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace(/^\//, "");
  const menuKey = currentPath || "dashboard";

  // State for Navigation Interception Modal Pop-Up
  const [showNavConfirmModal, setShowNavConfirmModal] = useState(false);
  const [targetNavKey, setTargetNavKey] = useState(null);
  const [savingNav, setSavingNav] = useState(false);

  const handleNavigate = (key) => {
    if (!key) return;
    const cleanKey = key.startsWith("/") ? key : `/${key}`;

    // If active page has unsaved changes and target route is different: Intercept & Show Pop-Up Modal!
    if (isPageDirty && location.pathname !== cleanKey) {
      setTargetNavKey(cleanKey);
      setShowNavConfirmModal(true);
      return;
    }

    navigate(cleanKey);
  };

  const handleLogoutWithCheck = () => {
    if (isPageDirty) {
      setTargetNavKey("__LOGOUT__");
      setShowNavConfirmModal(true);
      return;
    }
    logout();
  };

  const handleConfirmDiscardAndNavigate = () => {
    setIsPageDirty(false);
    setShowNavConfirmModal(false);
    if (targetNavKey === "__LOGOUT__") {
      logout();
    } else if (targetNavKey) {
      navigate(targetNavKey);
      setTargetNavKey(null);
    }
  };

  const handleSaveAndNavigate = async () => {
    setSavingNav(true);
    try {
      await savePageChanges();
    } catch (err) {
      console.error("Gagal menyimpan data sebelum pindah:", err);
    } finally {
      setSavingNav(false);
    }
    setIsPageDirty(false);
    setShowNavConfirmModal(false);
    if (targetNavKey === "__LOGOUT__") {
      logout();
    } else if (targetNavKey) {
      navigate(targetNavKey);
      setTargetNavKey(null);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const menuOrder = [
      { route: "dashboard", perm: "dashboard" },
      { route: "data-barang", perm: "master_barang" },
      { route: "penerimaan", perm: "penerimaan" },
      { route: "pemakaian", perm: "pemakaian" },
      { route: "laporan-penerimaan", perm: "rekap_penerimaan" },
      { route: "laporan-pemakaian", perm: "rekap_pemakaian" },
      { route: "laporan-expired", perm: "laporan_expired" },
      { route: "pemantauan-expired", perm: "pemantauan_expired" },
      { route: "arsip", perm: "arsip" },
      { route: "konfigurasi-expired", perm: "pengaturan" },
      { route: "users-daftar", perm: "kelola_pengguna" }
    ];

    if (location.pathname === "/" || location.pathname === "/login") {
      const firstAllowed = menuOrder.find(item => isMenuVisible(item.perm));
      if (firstAllowed) {
        navigate(`/${firstAllowed.route}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isLoggedIn, user?.username, location.pathname, isMenuVisible, navigate]);

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case "ADMIN": return "Super Admin";
      case "OPERATOR_INVENTARIS": return "Operator Inventaris";
      case "OPERATOR_POLIKLINIK": return "Operator Poliklinik";
      default: return role;
    }
  };

  return (
    <div className="app-container">
      <Sidebar menu={menuKey} setMenu={handleNavigate} />

      <div className="main-content">
        {/* Top Navigation Bar */}
        <div className="topbar">
          <div className="topbar-left">
            <img
              src={logoGedung}
              alt="Logo Gedung Agung"
              className="topbar-logo"
            />
            <div>
              <h5 className="topbar-title mb-0">Sistem Inventaris Barang</h5>
              <span className="topbar-subtitle">Gedung Agung &mdash; Yogyakarta</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center gap-2 px-3 py-1.5 bg-white rounded-pill border shadow-sm me-1">
              <span className="fw-bold text-dark fs-6 d-flex align-items-center gap-1.5">
                <PersonFill className="text-primary" size={16} /> {user?.nama}
              </span>
              <span className="badge bg-primary rounded-pill px-2.5 py-1 font-monospace" style={{ fontSize: "0.75rem" }}>
                {getRoleLabel(user?.role)}
              </span>
            </div>

            <button
              onClick={handleLogoutWithCheck}
              className="btn btn-danger btn-sm fw-bold px-3 py-1.5 rounded-pill shadow-sm d-flex align-items-center gap-1.5"
              title="Keluar dari akun"
            >
              <BoxArrowRight size={15} /> Logout
            </button>
          </div>
        </div>

        {/* Pop-Up Modal Validasi Pindah Menu Saat Ada Unsaved Changes */}
        <Modal show={showNavConfirmModal} onHide={() => setShowNavConfirmModal(false)} centered backdrop="static">
          <Modal.Header closeButton className="bg-light py-2.5">
            <Modal.Title className="fw-bold fs-6 text-dark">
              Perubahan Belum Disimpan
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="py-3 px-4">
            <p className="mb-0 text-dark fw-medium" style={{ fontSize: "0.9rem" }}>
              Ada perubahan yang belum disimpan. Simpan perubahan sebelum berpindah menu?
            </p>
          </Modal.Body>
          <Modal.Footer className="bg-light py-2.5 px-4 d-flex align-items-center justify-content-between">
            <Button
              variant="secondary"
              className="fw-semibold px-3 py-2 border-0"
              style={{ fontSize: "0.875rem", borderRadius: "6px", minWidth: "90px" }}
              onClick={() => setShowNavConfirmModal(false)}
              disabled={savingNav}
            >
              Batal
            </Button>
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-danger"
                className="fw-semibold px-3 py-2"
                style={{ fontSize: "0.875rem", borderRadius: "6px" }}
                onClick={handleConfirmDiscardAndNavigate}
                disabled={savingNav}
              >
                Pindah Tanpa Simpan
              </Button>
              <Button
                variant="primary"
                className="fw-semibold px-3 py-2 border-0"
                style={{ fontSize: "0.875rem", borderRadius: "6px" }}
                onClick={handleSaveAndNavigate}
                disabled={savingNav}
              >
                {savingNav ? "Menyimpan..." : "Simpan & Pindah"}
              </Button>
            </div>
          </Modal.Footer>
        </Modal>

        {/* Page Content Routes */}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard setMenu={handleNavigate} />} />

          <Route path="/barang" element={<SemuaBarang />} />
          <Route path="/penerimaan" element={<SemuaBarang />} />

          <Route path="/pemakaian" element={<PemakaianBarang />} />

          <Route path="/data-barang" element={<DataBarang />} />
          <Route path="/kartu-stok" element={<KartuStok />} />
          <Route path="/kategori-lokasi" element={<KategoriLokasi />} />

          <Route path="/laporan" element={<LaporanPenerimaan />} />
          <Route path="/laporan-penerimaan" element={<LaporanPenerimaan />} />
          <Route path="/laporan-pemakaian" element={<LaporanPemakaian />} />
          <Route path="/laporan-expired" element={<LaporanExpired />} />

          <Route path="/expired" element={<BarangExpired mode="only-expired" />} />
          <Route path="/pemantauan-expired" element={<BarangExpired mode="all-monitoring" />} />

          <Route path="/arsip" element={<ArsipBarang />} />

          <Route path="/users" element={<KelolaPengguna />} />
          <Route path="/users-daftar" element={<KelolaPengguna />} />
          <Route path="/users-permissions" element={<MatriksHakAkses />} />

          <Route path="/konfigurasi" element={<KonfigurasiExpired />} />
          <Route path="/konfigurasi-expired" element={<KonfigurasiExpired />} />
          <Route path="/konfigurasi-print" element={<KonfigurasiPrint />} />
          <Route path="/konfigurasi-instansi" element={<KonfigurasiPrint />} />
          <Route path="/konfigurasi-database" element={<KonfigurasiDatabase />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <MainLayout />
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;