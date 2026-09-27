import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import {
    Container,
    Row,
    Col,
    Table,
    Button,
    Form,
    InputGroup,
    Spinner,
    Badge,
    Card,
    Pagination
} from "react-bootstrap";
import {
    ExclamationTriangleFill,
    Search,
    Download,
    Printer,
    CalendarEvent,
    BuildingCheck,
    GeoAltFill
} from "react-bootstrap-icons";
import { formatKodeProduk } from "../utils";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import logoGedung from "../assets/logogedung.png";

function LaporanExpired() {
    const { isCategoryAllowed } = useAuth();
    const { settings, getExpiredInfo } = useSettings();
    const [barang, setBarang] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);

    // Product Autocomplete State
    const [productList, setProductList] = useState([]);
    const [selectedKode, setSelectedKode] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Search & Filter state (Default: EXPIRED = Sudah Expired < 0 hari)
    const [keyword, setKeyword] = useState("");
    const [tglDari, setTglDari] = useState("");
    const [tglSampai, setTglSampai] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [lokasiFilter, setLokasiFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // Default ALL (Berisiko <= 60 hari)

    const API_BARANG = "http://localhost:3000/api/barang";
    const API_KATEGORI = "http://localhost:3000/api/kategori";
    const API_LOKASI = "http://localhost:3000/api/lokasi";
    const API_NAMA_BARANG = "http://localhost:3000/api/nama-barang";

    const loadData = async () => {
        try {
            setLoading(true);
            const [resBarang, resKat, resLok, resNama] = await Promise.all([
                axios.get(`${API_BARANG}?tgl_expired_all=1`),
                axios.get(API_KATEGORI),
                axios.get(API_LOKASI),
                axios.get(API_NAMA_BARANG)
            ]);
            if (resBarang.data?.success) setBarang(resBarang.data.data || []);
            if (resKat.data?.success) setCategories(resKat.data.data || []);
            if (resLok.data?.success) setLocations(resLok.data.data || []);
            if (resNama.data?.success) setProductList(resNama.data.data || []);
        } catch (err) {
            console.error("Gagal memuat data laporan audit kadaluwarsa:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Listener click outside untuk dropdown pencarian produk
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedProductObj = useMemo(() => {
        if (!selectedKode) return null;
        return productList.find(p => p.kode === selectedKode) || null;
    }, [selectedKode, productList]);

    const isExactSelectedText = useMemo(() => {
        if (!selectedProductObj || !productSearch) return false;
        const formatted = `[${formatKodeProduk(selectedProductObj.kode)}] ${selectedProductObj.nama}`;
        return productSearch === formatted || productSearch === selectedProductObj.nama;
    }, [selectedProductObj, productSearch]);

    // Filter Items untuk Audit Kadaluwarsa
    const filteredItems = useMemo(() => {
        return barang.filter(item => {
            // Filter pembatasan hak akses kategori per role
            if (!isCategoryAllowed(item.kategori)) return false;

            // Abaikan barang non-expired untuk audit kadaluwarsa
            if (Number(item.is_no_expired) === 1) return false;

            // Abaikan barang yang sisa stok fisiknya sudah habis (stok_sisa <= 0)
            const sisaStok = item.stok_sisa !== undefined ? Number(item.stok_sisa) : Number(item.jumlah);
            if (sisaStok <= 0) return false;

            // Filter Spesifik Produk
            if (selectedKode && item.kode_produk !== selectedKode) return false;

            const sisa = item.sisa_hari !== undefined ? item.sisa_hari : 999;
            const expDate = item.tanggal_expired || "";

            // Filter Status Kadaluwarsa
            if (statusFilter === "EXPIRED" && sisa >= 0) return false;
            if (statusFilter === "SEGERA" && (sisa < 0 || sisa > 30)) return false;
            if (statusFilter === "DIPERHATIKAN" && (sisa <= 30 || sisa > 60)) return false;
            if (statusFilter === "ALL" && sisa > 60) return false; // Fokus pada yang expired & warning

            // Filter Rentang Tanggal Expired
            if (tglDari && expDate && expDate < tglDari) return false;
            if (tglSampai && expDate && expDate > tglSampai) return false;

            // Filter Kategori
            if (kategoriFilter && item.kategori !== kategoriFilter) return false;

            // Filter Lokasi
            if (lokasiFilter && item.lokasi !== lokasiFilter) return false;

            // Filter Keyword Search
            if (keyword.trim() !== "") {
                const kw = keyword.toLowerCase().trim();
                const matchKode = item.kode_produk && item.kode_produk.toLowerCase().includes(kw);
                const matchNama = item.nama_produk && item.nama_produk.toLowerCase().includes(kw);
                const matchKategori = item.kategori && item.kategori.toLowerCase().includes(kw);
                const matchSub = item.sub_kategori && item.sub_kategori.toLowerCase().includes(kw);
                const matchLokasi = item.lokasi && item.lokasi.toLowerCase().includes(kw);
                if (!matchKode && !matchNama && !matchKategori && !matchSub && !matchLokasi) return false;
            }

            return true;
        });
    }, [barang, selectedKode, statusFilter, tglDari, tglSampai, kategoriFilter, lokasiFilter, keyword]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredItems.length]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Ringkasan Statistik Audit
    const stats = useMemo(() => {
        let countExpired = 0;
        let unitExpired = 0;
        let countSegera = 0;
        let unitSegera = 0;

        filteredItems.forEach(it => {
            const sisa = it.sisa_hari !== undefined ? it.sisa_hari : 999;
            const qty = parseInt(it.jumlah, 10) || 0;
            if (sisa < 0) {
                countExpired++;
                unitExpired += qty;
            } else if (sisa <= 30) {
                countSegera++;
                unitSegera += qty;
            }
        });

        return { countExpired, unitExpired, countSegera, unitSegera, totalItems: filteredItems.length };
    }, [filteredItems]);

    // Cetak Laporan Audit (Print Direct)
    const handlePrint = () => {
        window.print();
    };

    // Export Excel Laporan Audit Presisi Sesuai yang Tampil di Layar
    const handleExport = async () => {
        try {
            if (!filteredItems || filteredItems.length === 0) {
                alert("Tidak ada data barang dalam laporan audit yang ditampilkan untuk diexport.");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Sistem Inventaris - Gedung Agung";
            workbook.created = new Date();

            const sheet = workbook.addWorksheet("Laporan Audit Kadaluwarsa");

            // Row 1: Judul
            sheet.mergeCells("A1:L1");
            const tRow = sheet.getRow(1);
            const instansiText = (settings?.nama_instansi && settings?.sub_instansi)
                ? `${settings.nama_instansi.toUpperCase()} - ${settings.sub_instansi.toUpperCase()}`
                : "ISTANA KEPRESIDENAN YOGYAKARTA";
            tRow.getCell(1).value = `LAPORAN REKAPITULASI AUDIT BARANG KEDALUWARSA - ${instansiText}`;
            tRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
            tRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            tRow.height = 30;

            // Row 2: Subtitle Info
            sheet.mergeCells("A2:L2");
            const infoRow = sheet.getRow(2);
            const statusLabelMap = {
                EXPIRED: "Sudah Expired (< 0 Hari)",
                SEGERA: "Segera Expired (<= 30 Hari)",
                DIPERHATIKAN: "Diperhatikan (31-60 Hari)",
                ALL: "Semua Berisiko"
            };
            const statLabel = statusLabelMap[statusFilter] || "Semua Berisiko";
            const katLabel = kategoriFilter ? `Kategori: ${kategoriFilter}` : "Semua Kategori";
            const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

            infoRow.getCell(1).value = `Status Filter: ${statLabel}   |   ${katLabel}   |   Total Terperiksa: ${filteredItems.length} Item   |   Dicetak: ${todayStr}`;
            infoRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF475569" } };
            infoRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            infoRow.height = 20;

            // Row 3: Summary Box
            sheet.mergeCells("A3:L3");
            const summaryRow = sheet.getRow(3);
            summaryRow.getCell(1).value = `Ringkasan Laporan Audit:  [ Sudah Expired: ${stats.countExpired} Jenis (${stats.unitExpired} Unit) ]  -  [ Segera Expired (H-30): ${stats.countSegera} Jenis (${stats.unitSegera} Unit) ]  -  [ Total Item: ${filteredItems.length} ]`;
            summaryRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF991B1B" } };
            summaryRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
            summaryRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
            summaryRow.height = 25;

            // Row 4: Spacer
            sheet.getRow(4).height = 12;

            // Header Cols
            const headers = [
                { name: "No.", width: 6 },
                { name: "Kode Produk", width: 18 },
                { name: "Nama Produk", width: 30 },
                { name: "Kategori", width: 18 },
                { name: "Sub Kategori", width: 18 },
                { name: "Satuan", width: 12 },
                { name: "Jumlah Qty", width: 14 },
                { name: "Tanggal Masuk", width: 16 },
                { name: "Tanggal Expired", width: 18 },
                { name: "Status Kadaluwarsa", width: 24 },
                { name: "Sisa Hari", width: 14 },
                { name: "Lokasi Simpan", width: 20 }
            ];

            const headerRow = sheet.getRow(5);
            headerRow.height = 26;
            headers.forEach((col, idx) => {
                const cell = headerRow.getCell(idx + 1);
                cell.value = col.name;
                cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.border = {
                    top: { style: "thin", color: { argb: "FFCBD5E1" } },
                    left: { style: "thin", color: { argb: "FFCBD5E1" } },
                    bottom: { style: "medium", color: { argb: "FF7F1D1D" } },
                    right: { style: "thin", color: { argb: "FFCBD5E1" } }
                };
                sheet.getColumn(idx + 1).width = col.width;
            });

            // Fill rows from filteredItems (EXACT MATCH to screen)
            let startRow = 6;
            filteredItems.forEach((item, index) => {
                const row = sheet.getRow(startRow);
                row.height = 22;

                const info = getExpiredInfo(item.sisa_hari, item.is_no_expired);
                const tglMasukStr = item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "-");
                const sisaText = item.sisa_hari < 0 ? `Lewat ${Math.abs(item.sisa_hari)} Hari` : `Sisa ${item.sisa_hari} Hari`;

                const rowValues = [
                    index + 1,
                    formatKodeProduk(item.kode_produk),
                    item.nama_produk || "-",
                    item.kategori || "-",
                    item.sub_kategori || "-",
                    item.satuan || "Pcs",
                    Number(item.jumlah) || 0,
                    tglMasukStr,
                    item.tanggal_expired || "-",
                    info.label,
                    sisaText,
                    item.lokasi || "Gudang Utama"
                ];

                rowValues.forEach((val, cIdx) => {
                    const cell = row.getCell(cIdx + 1);
                    cell.value = val;
                    cell.alignment = {
                        vertical: "middle",
                        horizontal: (cIdx === 0 || cIdx === 1 || cIdx === 5 || cIdx === 6 || cIdx === 7 || cIdx === 8 || cIdx === 9 || cIdx === 10) ? "center" : "left"
                    };
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        left: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                        right: { style: "thin", color: { argb: "FFE2E8F0" } }
                    };
                });

                // Style status cell with dynamic color from SettingsContext
                const statusCell = row.getCell(10);
                if (info && info.color) {
                    const cleanHex = info.color.replace("#", "").toUpperCase();
                    statusCell.font = { bold: true, color: { argb: info.textColor === "#000000" ? "FF000000" : "FFFFFFFF" } };
                    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + cleanHex } };
                }

                startRow++;
            });

            // Signature block footer
            startRow += 3;
            const ftRow1 = sheet.getRow(startRow);
            ftRow1.getCell(2).value = "Mengetahui,";
            ftRow1.getCell(2).font = { bold: true };
            ftRow1.getCell(10).value = `Yogyakarta, ${todayStr}`;
            ftRow1.getCell(10).font = { bold: true };

            startRow++;
            const ftRow2 = sheet.getRow(startRow);
            ftRow2.getCell(2).value = settings?.jabatan_penanggung_jawab || "Kepala Subbagian Rumah Tangga & Perlengkapan";
            ftRow2.getCell(10).value = "Petugas Pemeriksa / Pengurus Barang";

            startRow += 4;
            const ftRow3 = sheet.getRow(startRow);
            ftRow3.getCell(2).value = `(${settings?.penanggung_jawab || "........................................................"})`;
            ftRow3.getCell(2).font = { bold: true };
            ftRow3.getCell(10).value = "(........................................................)";
            ftRow3.getCell(10).font = { bold: true };

            // Download file directly in browser
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            const ymd = new Date().toISOString().slice(0, 10);
            link.setAttribute("download", `Laporan_Audit_Kadaluwarsa_${ymd}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            alert("Gagal mengunduh file Excel laporan audit.");
            console.error(err);
        }
    };

    const resetFilters = () => {
        setSelectedKode("");
        setProductSearch("");
        setShowProductDropdown(false);
        setKeyword("");
        setTglDari("");
        setTglSampai("");
        setKategoriFilter("");
        setLokasiFilter("");
        setStatusFilter("ALL");
    };

    return (
        <Container fluid className="p-4">
            {/* CSS Cetak Khusus Print Audit */}
            <style>{`
                @media print {
                    body { background: white !important; font-size: 11pt !important; color: black !important; }
                    .no-print, .sidebar-container, .topbar, .btn, nav { display: none !important; }
                    .main-content { margin-left: 0 !important; padding: 0 !important; }
                    .print-only { display: block !important; }
                    .card, .border { border: none !important; box-shadow: none !important; }
                    .custom-table { width: 100% !important; border-collapse: collapse !important; }
                    .custom-table th, .custom-table td { border: 1px solid #000 !important; padding: 6px 8px !important; }
                    .page-break { page-break-after: always; }
                }
                .print-only { display: none; }
            `}</style>

            {/* AREA DOKUMEN CETAK RESMI (Terlihat Saat Print) */}
            <div className="print-only mb-4 text-center">
                <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
                    <img src={logoGedung} alt="Logo" style={{ height: "65px" }} />
                    <div>
                        <h4 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: "1px" }}>
                            {settings?.nama_instansi || "ISTANA KEPRESIDENAN YOGYAKARTA"}
                        </h4>
                        <h6 className="fw-bold mb-0 text-secondary text-uppercase">
                            {settings?.sub_instansi || "SUBBAGIAN RUMAH TANGGA & PERLENGKAPAN"}
                        </h6>
                        <small className="text-muted">Jl. Ahmad Yani No. 3, Yogyakarta 55122 &bull; Telp. (0274) 512005</small>
                    </div>
                </div>
                <hr style={{ borderTop: "2px solid #000", opacity: 1, margin: "10px 0" }} />
                <h5 className="fw-bold mt-3 text-uppercase text-decoration-underline">
                    LAPORAN REKAPITULASI AUDIT BARANG KEDALUWARSA
                </h5>
                <p className="small text-muted mb-3">
                    Periode Pemeriksaan: {tglDari ? tglDari : "Awal"} s.d. {tglSampai ? tglSampai : "Saat Ini"} | Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
            </div>

            <div className="bg-white p-4 rounded-4 border shadow-sm">
                {/* Top Header & Actions */}
                <Row className="mb-4 align-items-center no-print">
                    <Col md={6}>
                        <h3 className="fw-bold mb-1 text-danger d-flex align-items-center gap-2">
                            <ExclamationTriangleFill size={28} />
                            Rekap Audit Kadaluwarsa
                        </h3>
                        <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                            Laporan resmi pemeriksaan fisik barang kedaluwarsa &amp; berisiko tinggi untuk diajukan ke atasan / audit.
                        </p>
                    </Col>

                    <Col md={6} className="text-md-end mt-3 mt-md-0">
                        <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                            <Button variant="outline-danger" className="d-flex align-items-center gap-1.5 fw-bold" size="sm" onClick={handleExport}>
                                <Download size={14} /> Export Excel Audit
                            </Button>
                            <Button variant="danger" className="d-flex align-items-center gap-1.5 fw-bold shadow-sm" size="sm" onClick={handlePrint}>
                                <Printer size={14} /> Cetak Laporan Audit
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Executive Summary Cards */}
                <Row className="g-3 mb-4 no-print">
                    <Col md={4}>
                        <Card className="border-0 bg-danger bg-opacity-10 text-danger rounded-3 shadow-sm h-100">
                            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="text-muted small fw-semibold">SUDAH KADALUWARSA</div>
                                    <h3 className="fw-bold mb-0">{stats.countExpired} <span className="fs-6 fw-normal text-dark">Jenis ({stats.unitExpired} Unit)</span></h3>
                                </div>
                                <ExclamationTriangleFill size={32} className="opacity-75" />
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="border-0 bg-warning bg-opacity-10 text-dark rounded-3 shadow-sm h-100">
                            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="text-muted small fw-semibold">SEGERA EXPIRED (H-30 HARI)</div>
                                    <h3 className="fw-bold mb-0">{stats.countSegera} <span className="fs-6 fw-normal text-dark">Jenis ({stats.unitSegera} Unit)</span></h3>
                                </div>
                                <CalendarEvent size={32} className="text-warning opacity-75" />
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="border-0 bg-light text-dark rounded-3 border shadow-sm h-100">
                            <Card.Body className="p-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="text-muted small fw-semibold">TOTAL BARANG TERPERIKSA</div>
                                    <h3 className="fw-bold mb-0">{stats.totalItems} <span className="fs-6 fw-normal text-muted">Item Dalam Laporan</span></h3>
                                </div>
                                <BuildingCheck size={32} className="text-primary opacity-75" />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Filter Section Simple (Status Kadaluwarsa & Kategori) */}
                <Card className="shadow-sm border-0 mb-4 bg-light no-print">
                    <Card.Body className="p-3">
                        <Row className="g-2 align-items-end">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Pencarian Kata Kunci:</Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white border-end-0">
                                            <Search className="text-muted" size={13} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            className="border-start-0 ps-0 fw-semibold"
                                            placeholder="Cari Nama / Kode / Lokasi..."
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Status Kadaluarsa:</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="fw-semibold text-dark"
                                    >
                                        <option value="ALL">Semua Berisiko (≤ 60 hari)</option>
                                        <option value="SEMUA_BARANG">Seluruh Barang (Semua Status)</option>
                                        <option value="EXPIRED">Sudah Expired (&lt; 0 hari)</option>
                                        <option value="SEGERA">Segera Expired (&lt;= 30 hari)</option>
                                        <option value="DIPERHATIKAN">Diperhatikan (31-60 hari)</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Kategori Barang:</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={kategoriFilter}
                                        onChange={(e) => setKategoriFilter(e.target.value)}
                                        className="fw-semibold text-dark"
                                    >
                                        <option value="">Semua Kategori</option>
                                        {categories.map(c => (
                                            <option key={c.id || c.nama_kategori} value={c.nama_kategori}>{c.nama_kategori}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={2} className="text-end">
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={resetFilters}
                                    disabled={!keyword && !kategoriFilter && statusFilter === "ALL"}
                                    className="w-100 fw-bold d-flex align-items-center justify-content-center"
                                    style={{ height: "31px" }}
                                    title="Reset Filter"
                                >
                                    Reset Filter
                                </Button>
                            </Col>
                        </Row>

                        <div className="d-flex align-items-center justify-content-between pt-2 mt-2 border-top">
                            <span className="small fw-semibold text-secondary">
                                Menampilkan filter barang berisiko kadaluarsa berdasarkan kriteria yang dipilih.
                            </span>
                            <div className="small fw-semibold text-muted">
                                Total Hasil Audit: <Badge bg="danger" className="fs-6 px-2.5 ms-1">{filteredItems.length}</Badge> Item
                            </div>
                        </div>
                    </Card.Body>
                </Card>

                {/* Tabel Laporan Audit */}
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="danger" />
                        <div className="mt-2 text-muted small">Memuat data rekapitulasi audit...</div>
                    </div>
                ) : (
                    <>
                        <Table responsive hover className="custom-table border mt-2 align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th style={{ width: "40px" }} className="text-center">#</th>
                                    <th>Kode Barang</th>
                                    <th>Nama Barang</th>
                                    <th>Kategori &amp; Sub</th>
                                    <th className="text-center">Qty Unit</th>
                                    <th className="text-center">Tanggal Masuk</th>
                                    <th className="text-center">Tanggal Expired</th>
                                    <th className="text-center">Sisa Hari / Status</th>
                                    <th>Lokasi Simpan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-4 text-muted fw-semibold">
                                            Tidak ada data barang kadaluwarsa/berisiko yang sesuai dengan kriteria filter audit.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedItems.map((item, idx) => {
                                        const info = getExpiredInfo(item.sisa_hari, item.is_no_expired);
                                        const tglMasukStr = item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "-");
                                        return (
                                            <tr key={item.id || idx}>
                                                <td className="text-center fw-semibold text-muted">{idx + 1}</td>
                                                <td className="fw-bold font-monospace text-primary">{formatKodeProduk(item.kode_produk)}</td>
                                                <td className="fw-bold text-dark">{item.nama_produk}</td>
                                                <td>
                                                    <span className="fw-semibold text-secondary">{item.kategori || "-"}</span>
                                                    {item.sub_kategori && <div className="small text-muted">Sub: {item.sub_kategori}</div>}
                                                </td>
                                                <td className="text-center fw-bold fs-6">
                                                    <Badge bg="secondary" className="px-2.5 py-1">
                                                        {item.jumlah} {item.satuan || "Pcs"}
                                                    </Badge>
                                                </td>
                                                <td className="text-center font-monospace fw-semibold text-secondary">
                                                    {tglMasukStr}
                                                </td>
                                                <td className="text-center font-monospace fw-bold text-danger">
                                                    {item.tanggal_expired || "-"}
                                                </td>
                                                <td className="text-center">
                                                    <span
                                                        className="badge px-3 py-1.5 fw-bold shadow-sm"
                                                        style={{ backgroundColor: info.color, color: info.textColor }}
                                                    >
                                                        {info.label} ({item.sisa_hari < 0 ? `Lewat ${Math.abs(item.sisa_hari)} Hari` : `Sisa ${item.sisa_hari} Hari`})
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border border-secondary-subtle px-2 py-1">
                                                        <GeoAltFill size={11} className="text-danger me-1" />
                                                        {item.lokasi || "Gudang Utama"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </Table>

                        {/* Pagination Controls (no-print) */}
                        {totalPages > 1 && (
                            <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top no-print">
                                <div className="small text-muted fw-semibold">
                                    Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-dark fw-bold">{Math.min(currentPage * 10, filteredItems.length)}</span> dari <span className="text-dark fw-bold">{filteredItems.length}</span> item (Hal. {currentPage}/{totalPages})
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <Button variant="outline-danger" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="fw-bold">&laquo; Prev</Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                        .map((p, i, arr) => (
                                            <span key={p} className="d-flex align-items-center">
                                                {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-muted">...</span>}
                                                <Button variant={p === currentPage ? "danger" : "outline-secondary"} size="sm" onClick={() => setCurrentPage(p)} style={{ minWidth: "32px" }} className="fw-bold">{p}</Button>
                                            </span>
                                        ))
                                    }
                                    <Button variant="outline-danger" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="fw-bold">Next &raquo;</Button>
                                </div>
                            </div>
                        )}

                        {/* Footer Tanda Tangan Resmi Audit */}
                        <div className="mt-5 pt-4">
                            <Row className="justify-content-between text-center" style={{ fontSize: "0.9rem" }}>
                                <Col md={5} className="mb-4">
                                    <p className="mb-1 fw-bold">Mengetahui,</p>
                                    <p className="fw-semibold text-secondary mb-5">
                                        {settings?.jabatan_penanggung_jawab || "Kepala Subbagian Rumah Tangga & Perlengkapan"}
                                    </p>
                                    <div className="fw-bold text-decoration-underline mt-4">
                                        ({settings?.penanggung_jawab || "........................................................"})
                                    </div>
                                    <small className="text-muted d-block">NIP. ........................................................</small>
                                </Col>

                                <Col md={5} className="mb-4">
                                    <p className="mb-1">Yogyakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                    <p className="fw-semibold text-secondary mb-5">Petugas Pemeriksa / Pengurus Barang</p>
                                    <div className="fw-bold text-decoration-underline mt-4">
                                        (........................................................)
                                    </div>
                                    <small className="text-muted d-block">NIP. ........................................................</small>
                                </Col>
                            </Row>
                        </div>
                    </>
                )}
            </div>
        </Container>
    );
}

export default LaporanExpired;
