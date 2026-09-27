import { useState, useEffect } from "react";
import axios from "axios";
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button,
    Spinner,
    Alert,
    InputGroup
} from "react-bootstrap";
import {
    ExclamationTriangle,
    Save,
    CheckCircleFill,
    Eye
} from "react-bootstrap-icons";
import { useSettings, DEFAULT_EXPIRED_SETTINGS } from "../context/SettingsContext";

const COLOR_PRESETS = [
    { name: "Merah", hex: "#dc3545" },
    { name: "Orange", hex: "#fd7e14" },
    { name: "Kuning", hex: "#ffc107" },
    { name: "Hijau", hex: "#198754" },
    { name: "Teal", hex: "#20c997" },
    { name: "Cyan", hex: "#0dcaf0" },
    { name: "Biru", hex: "#0d6efd" },
    { name: "Ungu", hex: "#6f42c1" },
    { name: "Pink", hex: "#d63384" },
    { name: "Hitam", hex: "#212529" }
];

function KonfigurasiExpired() {
    const { settings: globalSettings, fetchSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [form, setForm] = useState({
        ...DEFAULT_EXPIRED_SETTINGS
    });

    useEffect(() => {
        if (globalSettings && Object.keys(globalSettings).length > 0) {
            setForm(prev => ({ ...prev, ...globalSettings }));
        }
    }, [globalSettings]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        try {
            setSaving(true);
            setMessage(null);
            const res = await axios.post("http://localhost:3000/api/settings", form);
            if (res.data && res.data.success) {
                await fetchSettings();
                setMessage({ type: "success", text: "Pengaturan Kedaluwarsa & Warna Status berhasil disimpan!" });
                setTimeout(() => setMessage(null), 4000);
            }
        } catch (err) {
            console.error("Gagal menyimpan konfigurasi expired:", err);
            setMessage({ type: "danger", text: "Gagal menyimpan konfigurasi sistem." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="bg-white p-4 rounded-4 border shadow-sm">
                
                {/* Header Section */}
                <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-warning bg-opacity-10 p-2.5 rounded-3 text-warning">
                            <ExclamationTriangle size={24} />
                        </div>
                        <div>
                            <h5 className="fw-bold mb-1 text-dark">
                                Pengaturan Kedaluwarsa &amp; Warna Status
                            </h5>
                            <p className="text-muted mb-0 small">
                                Atur ambang batas hari (threshold) serta warna badge indikator status expired di seluruh sistem.
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        className="fw-bold px-4 py-2 shadow-sm d-inline-flex align-items-center gap-2"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <Spinner animation="border" size="sm" /> : <Save size={16} />}
                        Simpan Pengaturan Expired
                    </Button>
                </div>

                {message && (
                    <Alert variant={message.type} className="d-flex align-items-center gap-2 mb-3 py-2 px-3 fw-semibold shadow-sm">
                        <CheckCircleFill size={18} /> {message.text}
                    </Alert>
                )}

                <Form onSubmit={handleSave}>
                    <Row className="g-4">
                        {/* Left Column: 5 Status Cards */}
                        <Col lg={7}>
                            <div className="d-flex flex-column gap-3">
                                
                                {/* Card 1: Sudah Expired */}
                                <Card className="border-danger border-opacity-25 rounded-3 p-3 bg-white shadow-sm">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2">
                                            <span className="badge bg-danger">1</span> Status Sudah Expired (&lt; 0 hari)
                                        </h6>
                                    </div>
                                    <Row className="g-3 align-items-center">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Teks Label Status:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="label_expired"
                                                    value={form.label_expired}
                                                    onChange={handleChange}
                                                    className="fw-bold"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Warna Badge (Hex / Preset):</Form.Label>
                                                <InputGroup className="mb-1">
                                                    <Form.Control
                                                        type="color"
                                                        name="color_expired"
                                                        value={form.color_expired}
                                                        onChange={handleChange}
                                                        style={{ width: "45px", height: "38px" }}
                                                    />
                                                    <Form.Control
                                                        type="text"
                                                        name="color_expired"
                                                        value={form.color_expired}
                                                        onChange={handleChange}
                                                        className="fw-bold font-monospace"
                                                    />
                                                </InputGroup>
                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                    {COLOR_PRESETS.map(p => (
                                                        <button
                                                            key={p.hex}
                                                            type="button"
                                                            className="btn btn-sm p-0 rounded-circle"
                                                            style={{ backgroundColor: p.hex, width: "20px", height: "20px", border: form.color_expired === p.hex ? "2px solid #000" : "1px solid #ccc" }}
                                                            onClick={() => setForm(prev => ({ ...prev, color_expired: p.hex }))}
                                                            title={p.name}
                                                        />
                                                    ))}
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Card 2: Segera Expired / Kritis */}
                                <Card className="border-warning border-opacity-50 rounded-3 p-3 bg-white shadow-sm">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="fw-bold text-warning text-darken mb-0 d-flex align-items-center gap-2">
                                            <span className="badge bg-warning text-dark">2</span> Status Segera Expired (Kritis)
                                        </h6>
                                    </div>
                                    <Row className="g-3">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Batas Tenggat (Hari):</Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text className="bg-light fw-bold">&le;</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        name="threshold_kritis"
                                                        value={form.threshold_kritis}
                                                        onChange={handleChange}
                                                        className="fw-bold text-center"
                                                    />
                                                    <InputGroup.Text className="bg-light small">Hari</InputGroup.Text>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={8}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Teks Label Status:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="label_kritis"
                                                    value={form.label_kritis}
                                                    onChange={handleChange}
                                                    className="fw-bold"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Warna Badge (Hex / Preset):</Form.Label>
                                                <InputGroup className="mb-1">
                                                    <Form.Control
                                                        type="color"
                                                        name="color_kritis"
                                                        value={form.color_kritis}
                                                        onChange={handleChange}
                                                        style={{ width: "45px", height: "38px" }}
                                                    />
                                                    <Form.Control
                                                        type="text"
                                                        name="color_kritis"
                                                        value={form.color_kritis}
                                                        onChange={handleChange}
                                                        className="fw-bold font-monospace"
                                                    />
                                                </InputGroup>
                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                    {COLOR_PRESETS.map(p => (
                                                        <button
                                                            key={p.hex}
                                                            type="button"
                                                            className="btn btn-sm p-0 rounded-circle"
                                                            style={{ backgroundColor: p.hex, width: "20px", height: "20px", border: form.color_kritis === p.hex ? "2px solid #000" : "1px solid #ccc" }}
                                                            onClick={() => setForm(prev => ({ ...prev, color_kritis: p.hex }))}
                                                            title={p.name}
                                                        />
                                                    ))}
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Card 3: Peringatan Awal / Diperhatikan */}
                                <Card className="border-info border-opacity-50 rounded-3 p-3 bg-white shadow-sm">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="fw-bold text-info text-darken mb-0 d-flex align-items-center gap-2">
                                            <span className="badge bg-info text-dark">3</span> Status Peringatan Awal (Diperhatikan)
                                        </h6>
                                    </div>
                                    <Row className="g-3">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Batas Tenggat (Hari):</Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text className="bg-light fw-bold">&le;</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        name="threshold_diperhatikan"
                                                        value={form.threshold_diperhatikan}
                                                        onChange={handleChange}
                                                        className="fw-bold text-center"
                                                    />
                                                    <InputGroup.Text className="bg-light small">Hari</InputGroup.Text>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={8}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Teks Label Status:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="label_diperhatikan"
                                                    value={form.label_diperhatikan}
                                                    onChange={handleChange}
                                                    className="fw-bold"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Warna Badge (Hex / Preset):</Form.Label>
                                                <InputGroup className="mb-1">
                                                    <Form.Control
                                                        type="color"
                                                        name="color_diperhatikan"
                                                        value={form.color_diperhatikan}
                                                        onChange={handleChange}
                                                        style={{ width: "45px", height: "38px" }}
                                                    />
                                                    <Form.Control
                                                        type="text"
                                                        name="color_diperhatikan"
                                                        value={form.color_diperhatikan}
                                                        onChange={handleChange}
                                                        className="fw-bold font-monospace"
                                                    />
                                                </InputGroup>
                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                    {COLOR_PRESETS.map(p => (
                                                        <button
                                                            key={p.hex}
                                                            type="button"
                                                            className="btn btn-sm p-0 rounded-circle"
                                                            style={{ backgroundColor: p.hex, width: "20px", height: "20px", border: form.color_diperhatikan === p.hex ? "2px solid #000" : "1px solid #ccc" }}
                                                            onClick={() => setForm(prev => ({ ...prev, color_diperhatikan: p.hex }))}
                                                            title={p.name}
                                                        />
                                                    ))}
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>

                                 {/* Card 4: Stok Aman */}
                                <Card className="border-success border-opacity-50 rounded-3 p-3 bg-white shadow-sm">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
                                            <span className="badge bg-success">4</span> Status Stok Aman (&gt; {form.threshold_aman || form.threshold_diperhatikan || 60} hari)
                                        </h6>
                                    </div>
                                    <Row className="g-3">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Batas Minimal Aman:</Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text className="bg-light fw-bold">&gt;</InputGroup.Text>
                                                    <Form.Control
                                                        type="number"
                                                        name="threshold_aman"
                                                        value={form.threshold_aman !== undefined ? form.threshold_aman : (form.threshold_diperhatikan || 60)}
                                                        onChange={handleChange}
                                                        className="fw-bold text-center"
                                                    />
                                                    <InputGroup.Text className="bg-light small">Hari</InputGroup.Text>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={8}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Teks Label Status:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="label_aman"
                                                    value={form.label_aman}
                                                    onChange={handleChange}
                                                    className="fw-bold"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Warna Badge (Hex / Preset):</Form.Label>
                                                <InputGroup className="mb-1">
                                                    <Form.Control
                                                        type="color"
                                                        name="color_aman"
                                                        value={form.color_aman}
                                                        onChange={handleChange}
                                                        style={{ width: "45px", height: "38px" }}
                                                    />
                                                    <Form.Control
                                                        type="text"
                                                        name="color_aman"
                                                        value={form.color_aman}
                                                        onChange={handleChange}
                                                        className="fw-bold font-monospace"
                                                    />
                                                </InputGroup>
                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                    {COLOR_PRESETS.map(p => (
                                                        <button
                                                            key={p.hex}
                                                            type="button"
                                                            className="btn btn-sm p-0 rounded-circle"
                                                            style={{ backgroundColor: p.hex, width: "20px", height: "20px", border: form.color_aman === p.hex ? "2px solid #000" : "1px solid #ccc" }}
                                                            onClick={() => setForm(prev => ({ ...prev, color_aman: p.hex }))}
                                                            title={p.name}
                                                        />
                                                    ))}
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Card 5: Non-Expired */}
                                <Card className="border-secondary border-opacity-50 rounded-3 p-3 bg-white shadow-sm">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <h6 className="fw-bold text-secondary mb-0 d-flex align-items-center gap-2">
                                            <span className="badge bg-secondary">5</span> Status Non-Expired (Bahan Pakai)
                                        </h6>
                                    </div>
                                    <Row className="g-3">
                                        <Col md={4}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Estimasi Masa Awet:</Form.Label>
                                                <InputGroup>
                                                    <Form.Control
                                                        type="number"
                                                        name="tahun_non_expired"
                                                        value={form.tahun_non_expired !== undefined ? form.tahun_non_expired : 5}
                                                        onChange={handleChange}
                                                        className="fw-bold text-center"
                                                    />
                                                    <InputGroup.Text className="bg-light small">Tahun</InputGroup.Text>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                        <Col md={8}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Teks Label Status:</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="label_non_expired"
                                                    value={form.label_non_expired}
                                                    onChange={handleChange}
                                                    className="fw-bold"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Warna Badge (Hex / Preset):</Form.Label>
                                                <InputGroup className="mb-1">
                                                    <Form.Control
                                                        type="color"
                                                        name="color_non_expired"
                                                        value={form.color_non_expired}
                                                        onChange={handleChange}
                                                        style={{ width: "45px", height: "38px" }}
                                                    />
                                                    <Form.Control
                                                        type="text"
                                                        name="color_non_expired"
                                                        value={form.color_non_expired}
                                                        onChange={handleChange}
                                                        className="fw-bold font-monospace"
                                                    />
                                                </InputGroup>
                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                    {COLOR_PRESETS.map(p => (
                                                        <button
                                                            key={p.hex}
                                                            type="button"
                                                            className="btn btn-sm p-0 rounded-circle"
                                                            style={{ backgroundColor: p.hex, width: "20px", height: "20px", border: form.color_non_expired === p.hex ? "2px solid #000" : "1px solid #ccc" }}
                                                            onClick={() => setForm(prev => ({ ...prev, color_non_expired: p.hex }))}
                                                            title={p.name}
                                                        />
                                                    ))}
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>

                            </div>
                        </Col>

                        {/* Right Column: Live Badge Preview Side Card */}
                        <Col lg={5}>
                            <div className="sticky-top" style={{ top: "80px" }}>
                                <Card className="border shadow-sm rounded-4 bg-light overflow-hidden">
                                    <Card.Header className="bg-primary text-white fw-bold py-2.5 px-3 fs-6 d-flex align-items-center gap-2">
                                        <Eye size={18} />
                                        Live Preview Badge Status di Seluruh Halaman
                                    </Card.Header>
                                    <Card.Body className="p-4 bg-white">
                                        <p className="text-muted small mb-3">
                                            Badge di bawah ini memperlihatkan tampilan langsung warna dan teks status yang akan tampil di halaman Dashboard, Penerimaan, Data Barang, &amp; Excel Export:
                                        </p>

                                        <div className="d-flex flex-column gap-3">
                                            <div className="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="fw-bold text-dark mb-0">Sudah Expired</div>
                                                    <div className="small text-muted">&lt; 0 hari</div>
                                                </div>
                                                <span
                                                    className="badge px-3 py-2 fs-6 fw-bold shadow-sm"
                                                    style={{ backgroundColor: form.color_expired, color: "#ffffff" }}
                                                >
                                                    {form.label_expired}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="fw-bold text-dark mb-0">Segera Expired (Kritis)</div>
                                                    <div className="small text-muted">&le; {form.threshold_kritis} hari</div>
                                                </div>
                                                <span
                                                    className="badge px-3 py-2 fs-6 fw-bold shadow-sm"
                                                    style={{ backgroundColor: form.color_kritis, color: "#000000" }}
                                                >
                                                    {form.label_kritis}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="fw-bold text-dark mb-0">Peringatan Awal</div>
                                                    <div className="small text-muted">&le; {form.threshold_diperhatikan} hari</div>
                                                </div>
                                                <span
                                                    className="badge px-3 py-2 fs-6 fw-bold shadow-sm border"
                                                    style={{ backgroundColor: form.color_diperhatikan, color: "#ffffff" }}
                                                >
                                                    {form.label_diperhatikan}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="fw-bold text-dark mb-0">Stok Aman</div>
                                                    <div className="small text-muted">&gt; {form.threshold_diperhatikan} hari</div>
                                                </div>
                                                <span
                                                    className="badge px-3 py-2 fs-6 fw-bold shadow-sm"
                                                    style={{ backgroundColor: form.color_aman, color: "#ffffff" }}
                                                >
                                                    {form.label_aman}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-light rounded-3 border d-flex align-items-center justify-content-between">
                                                <div>
                                                    <div className="fw-bold text-dark mb-0">Bahan Pakai</div>
                                                    <div className="small text-muted">Tanpa Expired</div>
                                                </div>
                                                <span
                                                    className="badge px-3 py-2 fs-6 fw-bold shadow-sm"
                                                    style={{ backgroundColor: form.color_non_expired, color: "#000000" }}
                                                >
                                                    {form.label_non_expired}
                                                </span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </div>
                        </Col>
                    </Row>
                </Form>
            </div>
        </Container>
    );
}

export default KonfigurasiExpired;
