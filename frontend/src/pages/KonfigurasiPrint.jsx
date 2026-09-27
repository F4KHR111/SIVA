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
    Alert
} from "react-bootstrap";
import {
    Printer,
    FileEarmarkText,
    Sliders,
    PersonCheck,
    Save,
    CheckCircleFill
} from "react-bootstrap-icons";
import { useSettings, DEFAULT_EXPIRED_SETTINGS } from "../context/SettingsContext";

function KonfigurasiPrint() {
    const { settings: globalSettings, fetchSettings } = useSettings();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const [form, setForm] = useState({
        ...DEFAULT_EXPIRED_SETTINGS,
        nama_instansi: "Gedung Agung",
        sub_instansi: "Istana Kepresidenan Yogyakarta",
        alamat_instansi: "Jl. Ahmad Yani No. 3, Ngupasan, Gondomanan, Kota Yogyakarta",
        nama_penanggung_jawab: "Budi Santoso, S.STP",
        nip_penanggung_jawab: "19850315 200801 1 002",
        jabatan_penanggung_jawab: "Kepala Subbagian Rumah Tangga & Perlengkapan",
        prefix_no_penerimaan: "MASUK"
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
                setMessage({ type: "success", text: "Pengaturan Kontrol Print & Kop Dokumen berhasil disimpan!" });
                setTimeout(() => setMessage(null), 4000);
            }
        } catch (err) {
            console.error("Gagal menyimpan konfigurasi print:", err);
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
                        <div className="bg-info bg-opacity-10 p-2.5 rounded-3 text-info">
                            <Printer size={24} />
                        </div>
                        <div>
                            <h5 className="fw-bold mb-1 text-dark">
                                Kontrol Print Pemakaian &amp; Kop Dokumen
                            </h5>
                            <p className="text-muted mb-0 small">
                                Sesuaikan tata letak cetak nota pemakaian barang, kop instansi, ukuran font, serta area tanda tangan.
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
                        Simpan Kontrol Print
                    </Button>
                </div>

                {message && (
                    <Alert variant={message.type} className="d-flex align-items-center gap-2 mb-3 py-2 px-3 fw-semibold shadow-sm">
                        <CheckCircleFill size={18} /> {message.text}
                    </Alert>
                )}

                <Form onSubmit={handleSave}>
                    <Row className="g-4">
                        <Col lg={6}>
                            <div className="d-flex flex-column gap-3">
                                <Card className="border p-3 rounded-3 bg-white shadow-sm">
                                    <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                                        <FileEarmarkText size={18} /> Kop &amp; Judul Dokumen Cetak
                                    </h6>
                                    <Row className="g-3 mb-2">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Baris Kop 1 (Atas):</Form.Label>
                                                <Form.Control type="text" name="print_kop_1" value={form.print_kop_1} onChange={handleChange} className="fw-bold" />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Baris Kop 2 (Instansi):</Form.Label>
                                                <Form.Control type="text" name="print_kop_2" value={form.print_kop_2} onChange={handleChange} className="fw-bold" />
                                            </Form.Group>
                                        </Col>
                                        <Col md={12}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Judul Dokumen Nota Cetak:</Form.Label>
                                                <Form.Control type="text" name="print_judul_dokumen" value={form.print_judul_dokumen} onChange={handleChange} className="fw-bold" />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>

                                <Card className="border p-3 rounded-3 bg-white shadow-sm">
                                    <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                                        <Sliders size={18} /> Ukuran Font &amp; Spasi Tanda Tangan
                                    </h6>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Ukuran Font Cetak:</Form.Label>
                                                <Form.Select name="print_font_size" value={form.print_font_size} onChange={handleChange} className="fw-bold">
                                                    <option value="10px">10px (Ringkas)</option>
                                                    <option value="11px">11px (Normal Sized)</option>
                                                    <option value="12px">12px (Standar)</option>
                                                    <option value="13px">13px (Besar)</option>
                                                    <option value="14px">14px (Ekstra)</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Spasi Area TTD:</Form.Label>
                                                <Form.Select name="print_space_signature" value={form.print_space_signature} onChange={handleChange} className="fw-bold">
                                                    <option value="30px">30px (Rapat)</option>
                                                    <option value="45px">45px (Standar)</option>
                                                    <option value="60px">60px (Tinggi)</option>
                                                    <option value="75px">75px (Sangat Tinggi)</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>

                                <Card className="border p-3 rounded-3 bg-white shadow-sm">
                                    <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                                        <PersonCheck size={18} /> Tanda Tangan &amp; Pejabat
                                    </h6>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Label TTD Kiri:</Form.Label>
                                                <Form.Control type="text" name="print_label_ttd_kiri" value={form.print_label_ttd_kiri} onChange={handleChange} className="fw-bold" />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Label TTD Kanan:</Form.Label>
                                                <Form.Control type="text" name="print_label_ttd_kanan" value={form.print_label_ttd_kanan} onChange={handleChange} className="fw-bold" />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">Nama Petugas Persediaan (Kanan):</Form.Label>
                                                <Form.Control type="text" name="print_nama_petugas" value={form.print_nama_petugas} onChange={handleChange} placeholder="Nama..." className="fw-bold" />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-semibold text-dark mb-1">NIP Petugas Persediaan (Kanan):</Form.Label>
                                                <Form.Control type="text" name="print_nip_petugas" value={form.print_nip_petugas} onChange={handleChange} placeholder="NIP..." className="fw-bold" />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>
                            </div>
                        </Col>

                        {/* Right Column: Live Print Preview Side Panel */}
                        <Col lg={6}>
                            <div className="sticky-top" style={{ top: "80px" }}>
                                <Card className="border-secondary border-opacity-50 rounded-4 bg-light shadow-sm overflow-hidden">
                                    <Card.Header className="bg-dark text-white fw-bold py-2.5 px-3 fs-6 d-flex align-items-center justify-content-between">
                                        <span className="d-flex align-items-center gap-2">
                                            <Printer size={16} /> Live Preview Nota Cetak Bon Pemakaian
                                        </span>
                                        <span className="badge bg-primary">F4 / 2 Portrait</span>
                                    </Card.Header>
                                    <Card.Body className="p-3 bg-white border" style={{
                                        fontSize: form.print_font_size || "12px",
                                        fontFamily: "Arial, sans-serif",
                                        minHeight: "380px",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between"
                                    }}>
                                        <div>
                                            <div className="text-center mb-2 pb-2 border-bottom">
                                                <div className="fw-bold text-dark" style={{ fontSize: "1.25em", letterSpacing: "1px" }}>
                                                    {form.print_kop_1 || "SEKRETARIAT PRESIDEN"}
                                                </div>
                                                <div className="fw-bold text-dark" style={{ fontSize: "1.25em", letterSpacing: "1px" }}>
                                                    {form.print_kop_2 || "ISTANA KEPRESIDENAN YOGYAKARTA"}
                                                </div>
                                                <div className="fw-bold mt-1 text-primary" style={{ fontSize: "1.5em", letterSpacing: "1.5px" }}>
                                                    {form.print_judul_dokumen || "BON BARANG"}
                                                </div>
                                            </div>

                                            <div className="mb-2 small">
                                                <table style={{ width: "100%", fontSize: "0.95em" }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ width: "80px" }}>No. Order</td>
                                                            <td style={{ width: "10px" }}>:</td>
                                                            <td>ORD-202609-001</td>
                                                        </tr>
                                                        <tr>
                                                            <td>NAMA</td>
                                                            <td>:</td>
                                                            <td>Ahmad Subagio</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            <table className="table table-bordered table-sm mb-2" style={{ fontSize: "0.9em" }}>
                                                <thead>
                                                    <tr className="table-secondary">
                                                        <th style={{ width: "30px" }} className="text-center">No.</th>
                                                        <th>Nama Barang</th>
                                                        <th style={{ width: "70px" }} className="text-end">Banyaknya</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="text-center">1</td>
                                                        <td>Kertas HVS A4 80gr</td>
                                                        <td className="text-end">5 Rim</td>
                                                    </tr>
                                                    <tr className="fw-bold table-light">
                                                        <td colSpan="2">Total Dikeluarkan</td>
                                                        <td className="text-end">5 Unit</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                                            <div className="text-end mb-1" style={{ fontSize: "0.9em" }}>
                                                Yogyakarta, 02-09-2026
                                            </div>
                                            <table style={{ width: "100%", fontSize: "0.9em" }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ width: "50%", textAlign: "left", verticalAlign: "top" }}>
                                                            {form.print_label_ttd_kiri || "Penerima"}
                                                            <div style={{ height: form.print_space_signature || "45px" }}></div>
                                                            <div className="fw-bold">_________________________</div>
                                                            <div className="small text-dark mt-1">Ahmad Subagio</div>
                                                        </td>
                                                        <td style={{ width: "50%", textAlign: "right", verticalAlign: "top" }}>
                                                            {form.print_label_ttd_kanan || "Petugas Persediaan"}
                                                            <div style={{ height: form.print_space_signature || "45px" }}></div>
                                                            <div className="fw-bold">
                                                                {form.print_nama_petugas ? form.print_nama_petugas : "_________________________"}
                                                            </div>
                                                            {form.print_nip_petugas && (
                                                                <div className="small text-muted">NIP. {form.print_nip_petugas}</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
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

export default KonfigurasiPrint;
