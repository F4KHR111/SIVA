import { useEffect, useState, useMemo } from "react";
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
    Pagination
} from "react-bootstrap";
import {
    ExclamationTriangleFill,
    Search,
    PencilSquare,
    Archive,
    Trash,
    GeoAltFill,
    XCircleFill,
    Download
} from "react-bootstrap-icons";

import ModalBarang from "../../components/ModalBarang";
import { formatKodeProduk } from "../utils";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

const getTodayFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

function getColumnLetter(colIndex) {
    let temp, letter = '';
    while (colIndex > 0) {
        temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(65 + temp) + letter;
        colIndex = (colIndex - temp - 1) / 26;
    }
    return letter;
}

function BarangExpired({ mode = "only-expired" }) {
    const isMonitoringMode = mode === "all-monitoring";
    const { isCategoryAllowed } = useAuth();
    const { settings, getExpiredInfo, getEffectiveSisaHari } = useSettings();
    const [barang, setBarang] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [tglDari, setTglDari] = useState("");
    const [tglSampai, setTglSampai] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categories, setCategories] = useState([]);

    const limitKritis = Number(settings?.threshold_kritis || 30);
    const limitDiperhatikan = Number(settings?.threshold_diperhatikan || 60);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);

    const API_BARANG = "http://localhost:3000/api/barang";
    const API_KATEGORI = "http://localhost:3000/api/kategori";

    const loadCategories = async () => {
        try {
            const res = await axios.get(API_KATEGORI);
            if (res.data && res.data.success) {
                setCategories(res.data.data || []);
            }
        } catch (err) {
            console.error("Gagal memuat kategori:", err);
        }
    };

    // Load Expired Barang Data
    const loadData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (keyword.trim()) params.set("q", keyword.trim());
            if (tglDari) params.set("tgl_dari_exp", tglDari);
            if (tglSampai) params.set("tgl_sampai_exp", tglSampai);
            if (kategoriFilter) params.set("kategori", kategoriFilter);

            const qs = params.toString();
            const endpoint = isMonitoringMode ? API_BARANG : `${API_BARANG}/expired`;
            const url = qs ? `${endpoint}?${qs}` : endpoint;

            const res = await axios.get(url);
            if (res.data && res.data.success) {
                setBarang(res.data.data || []);
            }
        } catch (err) {
            console.error("Gagal memuat data expired:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        loadCategories();
    }, [keyword, tglDari, tglSampai, kategoriFilter, isMonitoringMode]);

    // Helper dapatkan info status item tersinkronisasi 100% dengan DB Settings
    const getInfoForItem = (item) => getExpiredInfo(item.sisa_hari, item.is_no_expired, item);

    // Hanya kelola/pantau barang yang MASIH ADA STOKNYA
    // barang.jumlah sekarang real-time (dikurangi otomatis saat pemakaian dicatat)
    const activeBarang = useMemo(() => {
        return barang.filter(b => {
            if (!isCategoryAllowed(b.kategori)) return false;
            return (b.stok_sisa !== undefined ? Number(b.stok_sisa) : Number(b.jumlah)) > 0;
        });
    }, [barang, isCategoryAllowed]);

    const filteredBarang = useMemo(() => {
        return activeBarang.filter(item => {
            const info = getInfoForItem(item);
            if (!isMonitoringMode) {
                return info.key === "expired";
            }

            if (statusFilter === "expired") return info.key === "expired";
            if (statusFilter === "kritis") return info.key === "kritis";
            if (statusFilter === "warning" || statusFilter === "diperhatikan") return info.key === "diperhatikan";
            if (statusFilter === "aman") return info.key === "aman";
            if (statusFilter === "non-expired" || statusFilter === "no-expired") return info.key === "non_expired";

            return true;
        }).sort((a, b) => {
            const sisaA = Number(a.is_no_expired) === 1 ? 99999 : (a.sisa_hari ?? 9999);
            const sisaB = Number(b.is_no_expired) === 1 ? 99999 : (b.sisa_hari ?? 9999);
            return sisaA - sisaB;
        });
    }, [activeBarang, isMonitoringMode, statusFilter, settings, getExpiredInfo]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredBarang.length]);

    const totalPages = Math.ceil(filteredBarang.length / itemsPerPage);
    const paginatedBarang = filteredBarang.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleEdit = (item) => {
        setEditData(item);
        setShowModal(true);
    };

    const handleHapus = async (kode) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${kode}" secara permanen?`)) {
            try {
                const res = await axios.delete(`${API_BARANG}/${kode}`);
                alert(res.data.message || "Barang berhasil dihapus.");
                loadData();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal menghapus barang.");
            }
        }
    };

    const handleArsip = async (kode) => {
        if (window.confirm(`Apakah Anda yakin ingin mengarsipkan produk "${kode}"?`)) {
            try {
                const res = await axios.put(`${API_BARANG}/arsip/${kode}`);
                alert(res.data.message || "Barang berhasil diarsipkan.");
                loadData();
            } catch (err) {
                alert(err.response?.data?.message || "Gagal mengarsipkan barang.");
            }
        }
    };

    // Helper: Buat Sheet Excel Berformat Rapi dengan ExcelJS sesuai data terfilter di layar
    const buildExcelSheet = (workbook, sheetName, title, subtitle, headers, rowsData, totalRowData) => {
        const sheet = workbook.addWorksheet(sheetName);
        const colCount = headers.length;
        const lastColLetter = getColumnLetter(colCount);

        // 1. Judul Utama (Row 1 - Merged, Bold 13pt, Center, Fill Gray Light)
        sheet.mergeCells(`A1:${lastColLetter}1`);
        const titleRow = sheet.getRow(1);
        titleRow.height = 32;
        const cellTitle = titleRow.getCell(1);
        cellTitle.value = title.toUpperCase();
        cellTitle.font = { name: "Arial", bold: true, size: 13, color: { argb: "FF0F172A" } };
        cellTitle.alignment = { horizontal: "center", vertical: "middle" };
        cellTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

        // 2. Subtitle Instansi (Row 2 - Merged, Bold 10pt, Center)
        sheet.mergeCells(`A2:${lastColLetter}2`);
        const subRow = sheet.getRow(2);
        subRow.height = 24;
        const cellSub = subRow.getCell(1);
        cellSub.value = subtitle.toUpperCase();
        cellSub.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF334155" } };
        cellSub.alignment = { horizontal: "center", vertical: "middle" };
        cellSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

        // 3. Info Filter & Tanggal Export (Row 3)
        sheet.mergeCells(`A3:${lastColLetter}3`);
        const infoRow = sheet.getRow(3);
        infoRow.height = 20;
        const cellInfo = infoRow.getCell(1);
        const periodeText = `${tglDari || 'Semua Tanggal'} s.d. ${tglSampai || 'Semua Tanggal'}`;
        const kategoriText = kategoriFilter ? `Kategori: ${kategoriFilter}` : "Semua Kategori";
        const statusText = statusFilter !== "all" ? `Filter Status: ${statusFilter.toUpperCase()}` : "Semua Status";
        cellInfo.value = `Periode Expired: ${periodeText}   |   ${kategoriText}   |   ${statusText}   |   Tanggal Unduh: ${getTodayFormatted()}`;
        cellInfo.font = { name: "Arial", italic: true, size: 9, color: { argb: "FF64748B" } };
        cellInfo.alignment = { horizontal: "center", vertical: "middle" };
        cellInfo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

        // Row 4: Empty Gap
        sheet.getRow(4).height = 10;

        // 4. Header Tabel (Row 5 - Dark Green Fill #15803D, White Text, Bold, Center)
        const headerRow = sheet.getRow(5);
        headerRow.height = 26;
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
            cell.border = {
                top: { style: "medium", color: { argb: "FF14532D" } },
                bottom: { style: "medium", color: { argb: "FF14532D" } },
                left: { style: "thin", color: { argb: "FF166534" } },
                right: { style: "thin", color: { argb: "FF166534" } }
            };
        });

        // 5. Data Rows
        rowsData.forEach((r, rIdx) => {
            const rowNumber = 6 + rIdx;
            const row = sheet.getRow(rowNumber);
            row.height = 22;
            const isAlt = rIdx % 2 === 1;

            r.forEach((val, cIdx) => {
                const cell = row.getCell(cIdx + 1);
                cell.value = val;
                cell.font = { name: "Arial", size: 10, color: { argb: "FF1E293B" } };
                
                const isNumber = typeof val === "number";
                if (cIdx === 0) {
                    cell.alignment = { horizontal: "center", vertical: "middle" };
                } else if (isNumber) {
                    cell.alignment = { horizontal: "right", vertical: "middle" };
                } else {
                    cell.alignment = { horizontal: "left", vertical: "middle" };
                }

                if (isAlt) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
                }

                cell.border = {
                    top: { style: "thin", color: { argb: "FFE2E8F0" } },
                    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                    left: { style: "thin", color: { argb: "FFE2E8F0" } },
                    right: { style: "thin", color: { argb: "FFE2E8F0" } }
                };
            });
        });

        // 6. Summary Total Row (Light Green #DCFCE7 Fill, Bold Text, Thick Green Border)
        if (totalRowData) {
            const totalRowNumber = 6 + rowsData.length + 1;
            const totalRow = sheet.getRow(totalRowNumber);
            totalRow.height = 25;

            totalRowData.forEach((val, cIdx) => {
                const cell = totalRow.getCell(cIdx + 1);
                cell.value = val;
                cell.font = { name: "Arial", bold: true, size: 10, color: { argb: "FF166534" } };
                
                const isNumber = typeof val === "number";
                if (isNumber) {
                    cell.alignment = { horizontal: "right", vertical: "middle" };
                } else {
                    cell.alignment = { horizontal: "left", vertical: "middle" };
                }

                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
                cell.border = {
                    top: { style: "medium", color: { argb: "FF16A34A" } },
                    bottom: { style: "medium", color: { argb: "FF16A34A" } },
                    left: { style: "thin", color: { argb: "FF86EFAC" } },
                    right: { style: "thin", color: { argb: "FF86EFAC" } }
                };
            });
        }

        // Set Lebar Kolom Otomatis
        headers.forEach((h, colIdx) => {
            let maxLen = h.length;
            rowsData.forEach(r => {
                const valStr = r[colIdx] !== null && r[colIdx] !== undefined ? String(r[colIdx]) : "";
                if (valStr.length > maxLen) maxLen = valStr.length;
            });
            sheet.getColumn(colIdx + 1).width = Math.min(Math.max(maxLen + 4, 12), 48);
        });
    };

    // Export Excel Presisi Sesuai Data Terfilter di Layar (filteredBarang)
    const handleExport = async () => {
        if (!filteredBarang || filteredBarang.length === 0) {
            alert("Tidak ada data barang pada filter ini untuk diexport.");
            return;
        }

        const todayStr = getTodayFormatted();
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Gedung Agung";
        workbook.created = new Date();

        const titleText = isMonitoringMode
            ? "LAPORAN PEMANTAUAN MASA KADALUWARSA BARANG"
            : "LAPORAN BARANG KADALUWARSA (EXPIRED)";
        const subtitleText = "ISTANA KEPRESIDENAN YOGYAKARTA - GEDUNG AGUNG";

        const headers = ["NO.", "NO. PENERIMAAN", "KODE PRODUK", "NAMA PRODUK", "KATEGORI", "SUB KATEGORI", "SATUAN", "JUMLAH STOK", "TANGGAL MASUK", "TANGGAL EXPIRED", "SISA HARI", "STATUS", "LOKASI"];

        const rowsData = filteredBarang.map((item, idx) => {
            const info = getInfoForItem(item);
            const sisaText = Number(item.is_no_expired) === 1
                ? `Sisa ${getEffectiveSisaHari(item)} Hari (${settings?.tahun_non_expired || 5} Thn)`
                : item.sisa_hari < 0
                    ? `Lewat ${Math.abs(item.sisa_hari)} Hari`
                    : `Sisa ${item.sisa_hari} Hari`;

            return [
                idx + 1,
                item.no_penerimaan || "-",
                formatKodeProduk(item.kode_produk),
                item.nama_produk || "-",
                item.kategori || "-",
                item.sub_kategori || "-",
                item.satuan || "-",
                parseInt(item.jumlah, 10) || 0,
                item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "-"),
                Number(item.is_no_expired) === 1 ? "Non-Expired" : (item.tanggal_expired || "-"),
                sisaText,
                info.label,
                item.lokasi || "-"
            ];
        });

        const totalStokUnit = filteredBarang.reduce((acc, curr) => acc + (parseInt(curr.jumlah, 10) || 0), 0);
        const totalRowData = ["", "", "", "", "", "", "TOTAL AKUMULASI STOK", totalStokUnit, "", "", "", `${filteredBarang.length} Item`, ""];

        const sheetName = isMonitoringMode ? "Pemantauan Expired" : "Barang Expired";
        buildExcelSheet(workbook, sheetName, titleText, subtitleText, headers, rowsData, totalRowData);

        const fileName = isMonitoringMode ? `Laporan_Pemantauan_Expired_${todayStr}.xlsx` : `Laporan_Barang_Expired_${todayStr}.xlsx`;

        // Download Excel File directly in browser using ExcelJS Buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <Container fluid className="p-4">
            <div className="bg-white p-4 rounded-4 border shadow-sm">
                <Row className="mb-4 align-items-center">
                    <Col md={6}>
                        <h3 className={`fw-bold mb-1 d-flex align-items-center gap-2 ${isMonitoringMode ? "text-dark" : "text-danger"}`}>
                            <ExclamationTriangleFill size={28} className={isMonitoringMode ? "text-warning" : "text-danger"} />
                            {isMonitoringMode ? "Pemantauan Masa Kadaluwarsa (Semua Barang)" : "Barang Kadaluwarsa (Telah Expired)"}
                        </h3>
                        <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                            {isMonitoringMode
                                ? "Daftar seluruh stok barang gudang beserta hitungan sisa hari menuju tanggal kadaluwarsa."
                                : "Daftar batch barang yang sudah melewati tanggal kadaluwarsa (Telah Expired)."
                            }
                        </p>
                    </Col>

                    <Col md={6} className="text-md-end mt-3 mt-md-0">
                        <div className="d-flex gap-2 justify-content-md-end">
                            <InputGroup style={{ maxWidth: "300px" }}>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <Search className="text-muted" size={14} />
                                </InputGroup.Text>
                                <Form.Control
                                    className="border-start-0 ps-0"
                                    placeholder="Cari produk..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                            </InputGroup>
                            <Button variant="outline-danger" className="d-flex align-items-center gap-1 fw-bold shadow-sm" size="sm" onClick={handleExport}>
                                <Download size={14} /> Export Excel
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Filter Bar Universal: Date Range Expired, Kategori, Status Pill, Reset */}
                <div className="bg-light p-3 rounded-3 border mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-secondary d-flex align-items-center gap-1" style={{ fontSize: "0.875rem" }}>
                                Expired Dari:
                            </span>
                            <Form.Control
                                type="date"
                                size="sm"
                                style={{ width: "150px" }}
                                value={tglDari}
                                onChange={(e) => setTglDari(e.target.value)}
                            />
                            <span className="text-muted small">s.d.</span>
                            <Form.Control
                                type="date"
                                size="sm"
                                style={{ width: "150px" }}
                                value={tglSampai}
                                onChange={(e) => setTglSampai(e.target.value)}
                            />
                        </div>

                        {/* Filter Kategori */}
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-secondary" style={{ fontSize: "0.875rem" }}>Kategori:</span>
                            <Form.Select
                                size="sm"
                                style={{ width: "160px" }}
                                value={kategoriFilter}
                                onChange={(e) => setKategoriFilter(e.target.value)}
                            >
                                <option value="">Semua Kategori</option>
                                {categories.map(c => {
                                    const catName = typeof c === "string" ? c : (c.nama_kategori || c.nama || "");
                                    if (!catName) return null;
                                    return (
                                        <option key={c.id || catName} value={catName}>
                                            {catName}
                                        </option>
                                    );
                                })}
                            </Form.Select>
                        </div>
                    </div>

                    {isMonitoringMode && (
                        <div className="d-flex align-items-center gap-1 flex-wrap w-100 mt-2 pt-2 border-top">
                            <span className="fw-semibold text-secondary me-2" style={{ fontSize: "0.825rem" }}>Filter Status:</span>
                            
                            <Button
                                variant={statusFilter === "all" ? "primary" : "outline-secondary"}
                                size="sm"
                                className="py-0.5 px-2.5 fw-semibold"
                                style={{ fontSize: "0.78rem" }}
                                onClick={() => setStatusFilter("all")}
                            >
                                Semua ({activeBarang.length})
                            </Button>

                            <Button
                                variant={statusFilter === "expired" ? "danger" : "outline-danger"}
                                size="sm"
                                className="py-0.5 px-2.5 fw-semibold"
                                style={{ fontSize: "0.78rem" }}
                                onClick={() => setStatusFilter("expired")}
                            >
                                {settings?.label_expired || "Expired"} ({activeBarang.filter(b => getInfoForItem(b).key === "expired").length})
                            </Button>

                            <Button
                                variant={statusFilter === "kritis" ? "warning" : "outline-warning"}
                                size="sm"
                                className="py-0.5 px-2.5 fw-semibold text-dark"
                                style={{ fontSize: "0.78rem" }}
                                onClick={() => setStatusFilter("kritis")}
                            >
                                {settings?.label_kritis || "Segera Expired"} ≤{limitKritis}hr ({activeBarang.filter(b => getInfoForItem(b).key === "kritis").length})
                            </Button>

                            <Button
                                variant={statusFilter === "warning" ? "secondary" : "outline-secondary"}
                                size="sm"
                                className="py-0.5 px-2.5 fw-semibold"
                                style={{ fontSize: "0.78rem" }}
                                onClick={() => setStatusFilter("warning")}
                            >
                                {settings?.label_diperhatikan || "Diperhatikan"} {limitKritis + 1}-{limitDiperhatikan}hr ({activeBarang.filter(b => getInfoForItem(b).key === "diperhatikan").length})
                            </Button>

                            <Button
                                variant={statusFilter === "aman" ? "success" : "outline-success"}
                                size="sm"
                                className="py-0.5 px-2.5 fw-semibold"
                                style={{ fontSize: "0.78rem" }}
                                onClick={() => setStatusFilter("aman")}
                            >
                                {settings?.label_aman || "Aman"} &gt;{limitDiperhatikan}hr ({activeBarang.filter(b => getInfoForItem(b).key === "aman").length})
                            </Button>

                            <Button
                                variant={statusFilter === "non-expired" ? "info" : "outline-info"}
                                size="sm"
                                className="py-0.5 px-2.5 fw-semibold text-dark"
                                style={{ fontSize: "0.78rem" }}
                                onClick={() => setStatusFilter("non-expired")}
                            >
                                {settings?.label_non_expired || `Non-Expired (${settings?.tahun_non_expired || 5} Thn)`} ({activeBarang.filter(b => getInfoForItem(b).key === "non_expired").length})
                            </Button>
                        </div>
                    )}

                    {(tglDari || tglSampai || kategoriFilter || keyword || statusFilter !== "all") && (
                        <Button
                            variant="link"
                            size="sm"
                            className="text-danger p-0 text-decoration-none fw-bold"
                            onClick={() => {
                                setTglDari("");
                                setTglSampai("");
                                setKategoriFilter("");
                                setKeyword("");
                                setStatusFilter("all");
                            }}
                        >
                            Reset Filter
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="danger" />
                        <div className="mt-2 text-muted small">Memuat data kadaluwarsa...</div>
                    </div>
                ) : (
                    <>
                    <Table responsive hover className="custom-table border rounded-3">
                        <thead>
                            <tr>
                                <th>No. Penerimaan</th>
                                <th>Kode Produk</th>
                                <th>Nama Produk</th>
                                <th>Kategori</th>
                                <th>Satuan</th>
                                <th>Jumlah</th>
                                <th>Tgl Masuk</th>
                                <th>Expired</th>
                                <th>Sisa Hari</th>
                                <th>Status</th>
                                <th>Lokasi</th>
                                <th width="220" className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBarang.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="text-center text-muted py-5">
                                        <div className="mb-2"><XCircleFill size={40} className="text-danger opacity-50" /></div>
                                        {isMonitoringMode
                                            ? "Tidak ada data barang pada filter ini."
                                            : "Tidak ada data barang yang telah kadaluwarsa (Expired)."
                                        }
                                    </td>
                                </tr>
                            ) : (
                                paginatedBarang.map((item, idx) => (
                                    <tr key={item.id || item.kode_produk}>
                                        <td><span className="badge-code-in">{item.no_penerimaan || "-"}</span></td>
                                        <td><span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span></td>
                                        <td className="fw-bold">{item.nama_produk}</td>
                                        <td>
                                            <span>{item.kategori || "-"}</span>
                                            {item.sub_kategori && (
                                                <span className="badge bg-info bg-opacity-10 text-info border border-info-subtle ms-1">
                                                    {item.sub_kategori}
                                                </span>
                                            )}
                                        </td>
                                        <td>{item.satuan}</td>
                                        <td>{item.jumlah}</td>
                                        <td className="small font-monospace">{item.tanggal_masuk || (item.created_at ? String(item.created_at).slice(0, 10) : "-")}</td>
                                        <td>{Number(item.is_no_expired) === 1 ? "-" : (item.tanggal_expired || "-")}</td>
                                        <td>
                                            {(() => {
                                                const info = getInfoForItem(item);
                                                const sisaText = Number(item.is_no_expired) === 1
                                                    ? `Sisa ${getEffectiveSisaHari(item)} Hari (${settings?.tahun_non_expired || 5} Thn)`
                                                    : item.sisa_hari < 0
                                                        ? `Lewat ${Math.abs(item.sisa_hari)} Hari`
                                                        : `Sisa ${item.sisa_hari} Hari`;
                                                return (
                                                    <span
                                                        className="badge px-2.5 py-1.5 fs-6 fw-bold shadow-sm"
                                                        style={{ backgroundColor: info.color, color: info.textColor }}
                                                    >
                                                        {sisaText}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const info = getInfoForItem(item);
                                                return (
                                                    <span
                                                        className="badge px-2.5 py-1.5 fs-6 fw-bold shadow-sm"
                                                        style={{ backgroundColor: info.color, color: info.textColor }}
                                                    >
                                                        {info.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <span className="text-muted">
                                                <GeoAltFill size={12} className="me-1 text-secondary" />
                                                {item.lokasi || "-"}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex gap-1 justify-content-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    onClick={() => handleEdit(item)}
                                                    title="Edit / Sesuaikan Stok"
                                                >
                                                    <PencilSquare size={13} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-warning"
                                                    onClick={() => handleArsip(item.kode_produk)}
                                                    title="Arsipkan Barang Ini"
                                                >
                                                    <Archive size={13} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => handleHapus(item.kode_produk)}
                                                    title="Hapus Permanen"
                                                >
                                                    <Trash size={13} />
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
                        <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2 border-top no-print">
                            <div className="small text-muted fw-semibold">
                                Menampilkan <span className="text-dark fw-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-dark fw-bold">{Math.min(currentPage * 10, filteredBarang.length)}</span> dari <span className="text-dark fw-bold">{filteredBarang.length}</span> item (Hal. {currentPage}/{totalPages})
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
                    </>
                )}
            </div>

            {/* Modal Edit Barang */}
            <ModalBarang
                show={showModal}
                onHide={() => {
                    setShowModal(false);
                    setEditData(null);
                }}
                editData={editData}
                onSuccess={loadData}
            />
        </Container>
    );
}

export default BarangExpired;
