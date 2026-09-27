import { useState } from "react";
import axios from "axios";
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Alert
} from "react-bootstrap";
import {
    DatabaseDown,
    ArrowClockwise,
    CheckCircleFill
} from "react-bootstrap-icons";
import { useSettings } from "../context/SettingsContext";

function KonfigurasiDatabase() {
    const { fetchSettings } = useSettings();
    const [message, setMessage] = useState(null);

    const handleDownloadBackup = async () => {
        try {
            const res = await axios.get("http://localhost:3000/api/barang");
            if (res.data && res.data.success) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
                const downloadAnchor = document.createElement("a");
                downloadAnchor.setAttribute("href", dataStr);
                const filename = `Backup_Inventaris_GedungAgung_${new Date().toISOString().slice(0, 10)}.json`;
                downloadAnchor.setAttribute("download", filename);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                setMessage({ type: "success", text: "File backup data inventaris (.json) berhasil diunduh!" });
                setTimeout(() => setMessage(null), 4000);
            }
        } catch (err) {
            console.error(err);
            alert("Gagal mengunduh backup data.");
        }
    };

    const handleRefreshSettings = async () => {
        try {
            await fetchSettings();
            setMessage({ type: "info", text: "Konfigurasi sistem berhasil disinkronisasi ulang!" });
        } catch (err) {
            console.error(err);
            alert("Gagal memuat ulang konfigurasi.");
        }
    };

    const handleResetAll = async () => {
        if (!window.confirm("PERHATIAN: Apakah Anda yakin ingin MENGOSONGKAN SELURUH ISIAN TABEL TRANSAKSI & DATA BARANG? Tindakan ini tidak dapat dibatalkan!")) return;
        try {
            const res = await axios.post("http://localhost:3000/api/data/reset-all");
            if (res.data?.success) {
                setMessage({ type: "warning", text: res.data.message });
                setTimeout(() => setMessage(null), 5000);
            }
        } catch (err) {
            console.error(err);
            alert("Gagal mengosongkan isian tabel.");
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="bg-white p-4 rounded-4 border shadow-sm">
                
                {/* Header Section */}
                <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-success bg-opacity-10 p-2.5 rounded-3 text-success">
                            <DatabaseDown size={24} />
                        </div>
                        <div>
                            <h5 className="fw-bold mb-1 text-dark">
                                Backup &amp; Pemeliharaan Database
                            </h5>
                            <p className="text-muted mb-0 small">
                                Pengamanan cadangan data inventaris serta re-sinkronisasi cache sistem.
                            </p>
                        </div>
                    </div>
                </div>

                {message && (
                    <Alert variant={message.type} className="d-flex align-items-center gap-2 mb-3 py-2 px-3 fw-semibold shadow-sm">
                        <CheckCircleFill size={18} /> {message.text}
                    </Alert>
                )}

                <Row className="g-4">
                    <Col md={4}>
                        <Card className="border p-4 rounded-3 bg-light shadow-sm h-100">
                            <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                                <DatabaseDown size={18} className="text-success" /> Cadangan Data Inventaris (JSON)
                            </h6>
                            <p className="text-muted small mb-3">
                                Unduh seluruh data stok barang aktif dan histori penerimaan dalam format JSON terstruktur untuk pengamanan data.
                            </p>
                            <Button
                                variant="success"
                                className="fw-bold d-inline-flex align-items-center gap-2 mt-auto"
                                onClick={handleDownloadBackup}
                            >
                                <DatabaseDown size={18} /> Unduh Backup (.json)
                            </Button>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="border p-4 rounded-3 bg-light shadow-sm h-100">
                            <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                                <ArrowClockwise size={18} className="text-primary" /> Refresh &amp; Re-Sync Cache
                            </h6>
                            <p className="text-muted small mb-3">
                                Muat ulang konfigurasi dari database untuk memastikan seluruh variabel sistem telah diperbarui secara sempurna.
                            </p>
                            <Button
                                variant="outline-primary"
                                className="fw-bold d-inline-flex align-items-center gap-2 mt-auto"
                                onClick={handleRefreshSettings}
                            >
                                <ArrowClockwise size={18} /> Re-Sync Konfigurasi
                            </Button>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="border p-4 rounded-3 bg-danger-subtle shadow-sm h-100">
                            <h6 className="fw-bold text-danger mb-2 d-flex align-items-center gap-2">
                                <ArrowClockwise size={18} className="text-danger" /> Clear Semua Isian Tabel
                            </h6>
                            <p className="text-muted small mb-3">
                                Kosongkan seluruh data dummy/transaksi barang masuk, pemakaian, stok, dan sub-kategori agar siap digunakan secara bersih.
                            </p>
                            <Button
                                variant="danger"
                                className="fw-bold d-inline-flex align-items-center gap-2 mt-auto"
                                onClick={handleResetAll}
                            >
                                <ArrowClockwise size={18} /> Clear Semua Isian Tabel
                            </Button>
                        </Card>
                    </Col>
                </Row>
            </div>
        </Container>
    );
}

export default KonfigurasiDatabase;
