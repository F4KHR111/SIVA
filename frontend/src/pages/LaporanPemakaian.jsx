import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import {
    Container,
    Row,
    Col,
    Card,
    Table,
    Button,
    Form,
    Spinner,
    Badge,
    Modal,
    Nav,
    Dropdown,
    InputGroup
} from "react-bootstrap";
import {
    BarChartLine,
    Search,
    Download,
    Printer,
    BoxSeam,
    PersonFill,
    Receipt,
    EyeFill,
    ArrowRepeat,
    LayersFill
} from "react-bootstrap-icons";
import { formatKodeProduk } from "../utils";
import { useAuth } from "../context/AuthContext";

const API_PEMAKAIAN = "http://localhost:3000/api/pemakaian";
const API_KATEGORI = "http://localhost:3000/api/kategori";
const API_BARANG = "http://localhost:3000/api/barang";
const API_NAMA_BARANG = "http://localhost:3000/api/nama-barang";

const getTodayFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const getFirstDayOfMonthFormatted = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
};

const getThreeMonthsAgoFormatted = () => {
    const today = new Date();
    today.setMonth(today.getMonth() - 3);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
};

// Helper Format Angka Kolom Excel (misal: A1, B1, Z1, AA1)
function getColumnLetter(colIndex) {
    let temp, letter = '';
    while (colIndex > 0) {
        temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(65 + temp) + letter;
        colIndex = (colIndex - temp - 1) / 26;
    }
    return letter;
}

function LaporanPemakaian() {
    const { isCategoryAllowed } = useAuth();
    const [pemakaianList, setPemakaianList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [barangMap, setBarangMap] = useState({});
    const [loading, setLoading] = useState(false);

    // Master Product List for Autocomplete Search
    const [productList, setProductList] = useState([]);
    const [selectedKode, setSelectedKode] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [tglDari, setTglDari] = useState(""); // Default Semua Tanggal
    const [tglSampai, setTglSampai] = useState("");
    const [kategoriFilter, setKategoriFilter] = useState(""); // Default "" (Semua Kategori)
    const [sortOrder, setSortOrder] = useState("terbaru");
    const [activeTab, setActiveTab] = useState("per-order"); // "per-order" | "per-barang" | "per-penerima"

    // Detail Order Modal State
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Close product dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load Kategori dan Master Barang untuk Sinkronisasi Kategori & Satuan
    const loadMasterData = async () => {
        try {
            const [resCat, resBarang, resNamaBarang] = await Promise.all([
                axios.get(API_KATEGORI),
                axios.get(API_BARANG),
                axios.get(API_NAMA_BARANG)
            ]);

            if (resCat.data?.success) {
                setCategories(resCat.data.data || []);
            }

            if (resNamaBarang.data?.success) {
                setProductList(resNamaBarang.data.data || []);
            }

            if (resBarang.data?.success && Array.isArray(resBarang.data.data)) {
                const map = {};
                resBarang.data.data.forEach(b => {
                    if (b.kode_produk) {
                        map[b.kode_produk.trim()] = {
                            kategori: b.kategori,
                            sub_kategori: b.sub_kategori,
                            satuan: b.satuan,
                            nama_produk: b.nama_produk
                        };
                    }
                    if (b.nama_produk) {
                        map[b.nama_produk.trim().toLowerCase()] = {
                            kategori: b.kategori,
                            sub_kategori: b.sub_kategori,
                            satuan: b.satuan,
                            nama_produk: b.nama_produk
                        };
                    }
                });
                setBarangMap(map);
            }
        } catch (err) {
            console.error("Gagal memuat data master:", err);
        }
    };

    // Load Data Pemakaian (Instant Trigger on State Change)
    const loadData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm.trim()) params.set("q", searchTerm.trim());
            if (tglDari) params.set("tgl_dari", tglDari);
            if (tglSampai) params.set("tgl_sampai", tglSampai);
            if (selectedKode) params.set("kode_produk", selectedKode);
            if (kategoriFilter) params.set("kategori", kategoriFilter);
            if (sortOrder) params.set("sort", sortOrder);

            const qs = params.toString();
            const url = qs ? `${API_PEMAKAIAN}?${qs}` : API_PEMAKAIAN;

            const res = await axios.get(url);
            if (res.data?.success) {
                setPemakaianList(res.data.data || []);
            }
        } catch (err) {
            console.error("Gagal memuat data pemakaian:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMasterData();
    }, []);

    // Instant Filter Effect: triggers immediately when any filter state changes
    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 200); // 200ms smooth debounce
        return () => clearTimeout(timer);
    }, [searchTerm, tglDari, tglSampai, selectedKode, kategoriFilter, sortOrder]);

    const selectedProductObj = useMemo(() => {
        return productList.find(p => p.kode === selectedKode) || null;
    }, [productList, selectedKode]);

    const isExactSelectedText = useMemo(() => {
        if (!selectedProductObj) return false;
        const expected = `[${formatKodeProduk(selectedProductObj.kode)}] ${selectedProductObj.nama}`;
        return productSearch === expected;
    }, [selectedProductObj, productSearch]);

    // Enrich Pemakaian Data with Master Barang (Synchronize Category, Sub Category, Unit)
    const enrichedPemakaianList = useMemo(() => {
        return pemakaianList.map(item => {
            const kodeKey = item.kode_produk ? item.kode_produk.trim() : "";
            const namaKey = item.nama_produk ? item.nama_produk.trim().toLowerCase() : "";

            const master = barangMap[kodeKey] || barangMap[namaKey] || {};

            return {
                ...item,
                kategori: item.kategori || master.kategori || "Umum",
                sub_kategori: item.sub_kategori || master.sub_kategori || "-",
                satuan: item.satuan || master.satuan || "Unit"
            };
        });
    }, [pemakaianList, barangMap]);

    // Client-side Multi Filter & Sort
    const activePemakaianList = useMemo(() => {
        let result = enrichedPemakaianList.filter(item => isCategoryAllowed(item.kategori));

        if (selectedKode) {
            result = result.filter(item => item.kode_produk === selectedKode);
        }

        if (kategoriFilter && kategoriFilter !== "") {
            const target = kategoriFilter.toLowerCase().trim();
            result = result.filter(item => (item.kategori || "").toLowerCase().trim() === target);
        }

        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            result = result.filter(item =>
                (item.no_order && item.no_order.toLowerCase().includes(q)) ||
                (item.kode_produk && item.kode_produk.toLowerCase().includes(q)) ||
                (item.nama_produk && item.nama_produk.toLowerCase().includes(q)) ||
                (item.penerima && item.penerima.toLowerCase().includes(q)) ||
                (item.kategori && item.kategori.toLowerCase().includes(q)) ||
                (item.keterangan && item.keterangan.toLowerCase().includes(q))
            );
        }

        result.sort((a, b) => {
            const tA = new Date(a.tanggal_pemakaian || a.created_at || 0).getTime();
            const tB = new Date(b.tanggal_pemakaian || a.created_at || 0).getTime();
            return sortOrder === "terbaru" ? tB - tA : tA - tB;
        });

        return result;
    }, [enrichedPemakaianList, selectedKode, kategoriFilter, searchTerm, sortOrder]);

    const resetFilters = () => {
        setSelectedKode("");
        setProductSearch("");
        setShowProductDropdown(false);
        setSearchTerm("");
        setKategoriFilter("");
        setTglDari("");
        setTglSampai("");
        setSortOrder("terbaru");
    };

    // 1. Grouping Per Order / Bon Pemakaian
    const rekapOrder = useMemo(() => {
        const map = new Map();
        activePemakaianList.forEach(item => {
            const key = (item.no_order && item.no_order.trim() !== "") ? item.no_order.trim() : `ID-${item.id}`;
            if (!map.has(key)) {
                map.set(key, {
                    no_order: item.no_order || key,
                    tanggal_pemakaian: item.tanggal_pemakaian,
                    penerima: item.penerima,
                    keterangan: item.keterangan,
                    items: [],
                    total_unit: 0
                });
            }
            const group = map.get(key);
            group.items.push(item);
            group.total_unit += parseInt(item.jumlah, 10) || 0;
        });
        return Array.from(map.values());
    }, [activePemakaianList]);

    // 2. Grouping Per Nama Barang (Akumulasi Item)
    const rekapBarang = useMemo(() => {
        const map = new Map();
        activePemakaianList.forEach(item => {
            const key = (item.kode_produk && item.kode_produk.trim() !== "")
                ? item.kode_produk.trim()
                : (item.nama_produk || "Lainnya");

            if (!map.has(key)) {
                map.set(key, {
                    kode_produk: item.kode_produk || "-",
                    nama_produk: item.nama_produk || "-",
                    kategori: item.kategori || "-",
                    sub_kategori: item.sub_kategori || "-",
                    satuan: item.satuan || "-",
                    total_jumlah: 0,
                    frekuensi: 0,
                    transaksi: []
                });
            }
            const group = map.get(key);
            group.total_jumlah += parseInt(item.jumlah, 10) || 0;
            group.frekuensi += 1;
            group.transaksi.push(item);
        });
        return Array.from(map.values()).sort((a, b) => b.total_jumlah - a.total_jumlah);
    }, [activePemakaianList]);

    // 3. Grouping Per Penerima
    const rekapPenerima = useMemo(() => {
        const map = new Map();
        activePemakaianList.forEach(item => {
            const key = (item.penerima && item.penerima.trim() !== "") ? item.penerima.trim() : "Tanpa Penerima";
            if (!map.has(key)) {
                map.set(key, {
                    penerima: key,
                    total_unit: 0,
                    frekuensi_order: new Set(),
                    items: []
                });
            }
            const group = map.get(key);
            group.total_unit += parseInt(item.jumlah, 10) || 0;
            if (item.no_order) group.frekuensi_order.add(item.no_order);
            group.items.push(item);
        });
        return Array.from(map.values()).map(g => ({
            ...g,
            jumlah_order: g.frekuensi_order.size || g.items.length
        })).sort((a, b) => b.total_unit - a.total_unit);
    }, [activePemakaianList]);

    // Total Ringkasan Statistik
    const totalUnitKeluar = useMemo(() => activePemakaianList.reduce((acc, curr) => acc + (parseInt(curr.jumlah, 10) || 0), 0), [activePemakaianList]);
    const totalTransaksiBon = rekapOrder.length;
    const totalPihakPenerima = rekapPenerima.length;

    // Helper: Buat Sheet Excel Berformat Rapi dengan ExcelJS
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
        const periodeText = `${tglDari || 'Semua'} s.d. ${tglSampai || 'Semua'}`;
        const kategoriText = kategoriFilter ? `Kategori: ${kategoriFilter}` : "Semua Kategori";
        cellInfo.value = `Periode: ${periodeText}   |   ${kategoriText}   |   Tanggal Unduh: ${getTodayFormatted()}`;
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

    // Export Handler using ExcelJS with formatting
    const handleExportExcelMode = async (exportMode) => {
        const todayStr = getTodayFormatted();
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Gedung Agung";
        workbook.created = new Date();

        const subtitle = "ISTANA KEPRESIDENAN YOGYAKARTA - GEDUNG AGUNG";

        if (exportMode === "per-order" || exportMode === "semua") {
            const title = "LAPORAN REKAPITULASI PEMAKAIAN BARANG - PER BON ORDER";
            const headers = ["NO.", "NO. ORDER / BON", "TANGGAL KELUAR", "PENERIMA / UNIT KERJA", "KODE BARANG", "NAMA BARANG", "KATEGORI", "SUB KATEGORI", "JUMLAH", "SATUAN", "KETERANGAN"];
            const rowsData = [];
            let noRow = 1;

            rekapOrder.forEach((order) => {
                order.items.forEach((it) => {
                    rowsData.push([
                        noRow++,
                        order.no_order,
                        order.tanggal_pemakaian || "-",
                        order.penerima || "-",
                        formatKodeProduk(it.kode_produk),
                        it.nama_produk,
                        it.kategori || "-",
                        it.sub_kategori || "-",
                        parseInt(it.jumlah, 10) || 0,
                        it.satuan || "-",
                        order.keterangan || "-"
                    ]);
                });
            });
            const totalRowData = ["", "", "", "", "", "TOTAL BARANG KELUAR", "", "", totalUnitKeluar, "UNIT", ""];
            buildExcelSheet(workbook, "Rekap Per Bon Order", title, subtitle, headers, rowsData, totalRowData);
        }

        if (exportMode === "per-barang" || exportMode === "semua") {
            const title = "LAPORAN REKAPITULASI PEMAKAIAN BARANG - PER NAMA BARANG";
            const headers = ["NO.", "KODE BARANG", "NAMA BARANG", "KATEGORI", "SUB KATEGORI", "SATUAN", "TOTAL KELUAR (UNIT)", "FREKUENSI TRANSAKSI"];
            const rowsData = rekapBarang.map((b, idx) => [
                idx + 1,
                formatKodeProduk(b.kode_produk),
                b.nama_produk,
                b.kategori,
                b.sub_kategori,
                b.satuan,
                b.total_jumlah,
                `${b.frekuensi} kali`
            ]);
            const totalRowData = ["", "", "", "", "", "TOTAL AKUMULASI UNIT", totalUnitKeluar, ""];
            buildExcelSheet(workbook, "Rekap Per Nama Barang", title, subtitle, headers, rowsData, totalRowData);
        }

        if (exportMode === "per-penerima" || exportMode === "semua") {
            const title = "LAPORAN REKAPITULASI PEMAKAIAN BARANG - PER PENERIMA";
            const headers = ["NO.", "NAMA PENERIMA / UNIT KERJA", "JUMLAH BON ORDER", "TOTAL BARANG DIAMBIL (UNIT)"];
            const rowsData = rekapPenerima.map((p, idx) => [
                idx + 1,
                p.penerima,
                `${p.jumlah_order} Bon`,
                p.total_unit
            ]);
            const totalRowData = ["", "", "TOTAL BARANG DIAMBIL", totalUnitKeluar];
            buildExcelSheet(workbook, "Rekap Per Penerima", title, subtitle, headers, rowsData, totalRowData);
        }

        let fileName = `Rekap_Pemakaian_Per_BonOrder_${todayStr}.xlsx`;
        if (exportMode === "per-barang") fileName = `Rekap_Pemakaian_Per_Barang_${todayStr}.xlsx`;
        if (exportMode === "per-penerima") fileName = `Rekap_Pemakaian_Per_Penerima_${todayStr}.xlsx`;
        if (exportMode === "semua") fileName = `Laporan_Lengkap_Pemakaian_Barang_${todayStr}.xlsx`;

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

    const handlePrint = () => {
        window.print();
    };

    return (
        <Container fluid className="p-4">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="bg-white p-4 rounded-4 border shadow-sm print-area">
                
                {/* Header Section */}
                <Row className="mb-4 align-items-center no-print">
                    <Col md={6}>
                        <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                            <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success d-inline-flex">
                                <BarChartLine size={24} />
                            </div>
                            Rekap Pemakaian Barang
                        </h4>
                        <p className="text-muted mb-0 small">
                            Laporan rekapitulasi data barang keluar (pemakaian gudang).
                        </p>
                    </Col>
                    <Col md={6} className="text-md-end mt-3 mt-md-0">
                        <div className="d-flex gap-2 justify-content-md-end flex-wrap align-items-center">
                            <Button
                                variant="outline-secondary"
                                onClick={loadData}
                                className="d-flex align-items-center gap-1 fw-semibold"
                                size="sm"
                            >
                                <ArrowRepeat size={15} /> Refresh
                            </Button>

                            {/* Dropdown 3 Pilihan Export Excel */}
                            <Dropdown align="end">
                                <Dropdown.Toggle variant="success" size="sm" id="dropdown-export-pemakaian" className="fw-bold shadow-sm d-flex align-items-center gap-1">
                                    <Download size={15} /> Export Excel
                                </Dropdown.Toggle>

                                <Dropdown.Menu className="shadow border-0 rounded-3 p-2" style={{ minWidth: "260px" }}>
                                    <Dropdown.Header className="fw-bold text-uppercase small text-muted px-2 py-1">
                                        Pilihan Format Rekap Excel:
                                    </Dropdown.Header>
                                    
                                    <Dropdown.Item
                                        onClick={() => handleExportExcelMode("per-order")}
                                        className="d-flex align-items-center gap-2.5 py-2 rounded-2"
                                    >
                                        <Receipt className="text-primary" size={17} />
                                        <div>
                                            <div className="fw-bold text-dark small">1. Rekap Per Bon Order</div>
                                            <div className="text-muted" style={{ fontSize: "0.725rem" }}>Tabel rincian per surat bon keluar</div>
                                        </div>
                                    </Dropdown.Item>

                                    <Dropdown.Item
                                        onClick={() => handleExportExcelMode("per-barang")}
                                        className="d-flex align-items-center gap-2.5 py-2 rounded-2"
                                    >
                                        <BoxSeam className="text-success" size={17} />
                                        <div>
                                            <div className="fw-bold text-dark small">2. Rekap Per Nama Barang</div>
                                            <div className="text-muted" style={{ fontSize: "0.725rem" }}>Total akumulasi keluar per nama produk</div>
                                        </div>
                                    </Dropdown.Item>

                                    <Dropdown.Item
                                        onClick={() => handleExportExcelMode("per-penerima")}
                                        className="d-flex align-items-center gap-2.5 py-2 rounded-2"
                                    >
                                        <PersonFill className="text-warning text-darken" size={17} />
                                        <div>
                                            <div className="fw-bold text-dark small">3. Rekap Per Penerima</div>
                                            <div className="text-muted" style={{ fontSize: "0.725rem" }}>Total barang diambil per unit kerja</div>
                                        </div>
                                    </Dropdown.Item>

                                    <Dropdown.Divider className="my-1" />

                                    <Dropdown.Item
                                        onClick={() => handleExportExcelMode("semua")}
                                        className="d-flex align-items-center gap-2.5 py-2 rounded-2 bg-success bg-opacity-10 text-success fw-bold"
                                    >
                                        <LayersFill size={17} />
                                        <div>
                                            <div className="small">Export Semua Rekap (3 Sheet)</div>
                                            <div className="text-muted font-normal" style={{ fontSize: "0.725rem" }}>Gabungkan ke 1 file Excel multi-sheet</div>
                                        </div>
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>

                            <Button
                                variant="outline-dark"
                                onClick={handlePrint}
                                className="d-flex align-items-center gap-1 fw-bold shadow-sm"
                                size="sm"
                            >
                                <Printer size={15} /> Cetak Laporan (PDF)
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Header khusus Tampilan Print / PDF */}
                <div className="d-none d-print-block mb-4 text-center border-bottom pb-3">
                    <h3 className="fw-bold mb-1">LAPORAN REKAPITULASI PEMAKAIAN BARANG</h3>
                    <p className="mb-0 text-secondary small">ISTANA KEPRESIDENAN YOGYAKARTA - GEDUNG AGUNG</p>
                    <div className="small text-muted mt-1">
                        Periode: {tglDari || "Semua"} s.d. {tglSampai || "Semua"} | Kategori: {kategoriFilter || "Semua Kategori"} | Cetak: {getTodayFormatted()}
                    </div>
                </div>

                {/* Summary Cards */}
                <Row className="g-3 mb-4 no-print">
                    <Col md={4}>
                        <Card className="border-0 bg-success bg-opacity-10 rounded-3 p-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-success text-white p-2.5 rounded-3">
                                    <BoxSeam size={22} />
                                </div>
                                <div>
                                    <div className="text-muted small fw-semibold">Total Unit Barang Keluar</div>
                                    <h4 className="fw-bold text-success mb-0">{totalUnitKeluar.toLocaleString("id-ID")} <span className="fs-6 fw-normal">Unit</span></h4>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="border-0 bg-primary bg-opacity-10 rounded-3 p-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-primary text-white p-2.5 rounded-3">
                                    <Receipt size={22} />
                                </div>
                                <div>
                                    <div className="text-muted small fw-semibold">Total Transaksi Bon Order</div>
                                    <h4 className="fw-bold text-primary mb-0">{totalTransaksiBon} <span className="fs-6 fw-normal">Order</span></h4>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="border-0 bg-warning bg-opacity-10 rounded-3 p-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-warning text-dark p-2.5 rounded-3">
                                    <PersonFill size={22} />
                                </div>
                                <div>
                                    <div className="text-muted small fw-semibold">Jumlah Pihak Penerima</div>
                                    <h4 className="fw-bold text-dark mb-0">{totalPihakPenerima} <span className="fs-6 fw-normal">Penerima</span></h4>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Filter & Search Bar - Instant Reactive Filter (Identik dengan Rekap Penerimaan) */}
                <Card className="shadow-sm border-0 mb-4 bg-light no-print">
                    <Card.Body className="p-3">
                        {/* Baris 1: Pencarian Produk, Keyword & Kategori */}
                        <Row className="g-2 mb-2">
                            <Col md={5} className="position-relative" ref={dropdownRef}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Pilih Barang / Produk:</Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white border-end-0">
                                            <Search size={13} className="text-muted" />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            className="border-start-0 ps-0 fw-semibold text-dark cursor-pointer"
                                            placeholder="Ketik / Pilih Nama Barang..."
                                            value={productSearch}
                                            onFocus={(e) => {
                                                e.target.select();
                                                setShowProductDropdown(true);
                                            }}
                                            onClick={(e) => {
                                                e.target.select();
                                                setShowProductDropdown(true);
                                            }}
                                            onChange={(e) => {
                                                setProductSearch(e.target.value);
                                                setShowProductDropdown(true);
                                                if (selectedKode && e.target.value === "") {
                                                    setSelectedKode("");
                                                }
                                            }}
                                        />
                                        {(selectedKode || productSearch) && (
                                            <Button
                                                variant="light"
                                                size="sm"
                                                className="border border-start-0 text-muted fw-bold"
                                                onClick={() => {
                                                    setSelectedKode("");
                                                    setProductSearch("");
                                                    setShowProductDropdown(false);
                                                }}
                                            >
                                                ✕
                                            </Button>
                                        )}
                                    </InputGroup>

                                    {/* Dropdown Menu Popup Overlay */}
                                    {showProductDropdown && (
                                        <div
                                            className="position-absolute w-100 bg-white border rounded shadow-lg mt-1"
                                            style={{ maxHeight: "250px", overflowY: "auto", zIndex: 1050, left: 0 }}
                                        >
                                            <div
                                                className={`p-2 small border-bottom fw-bold text-primary ${!selectedKode ? "bg-primary text-white" : ""}`}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => {
                                                    setSelectedKode("");
                                                    setProductSearch("");
                                                    setShowProductDropdown(false);
                                                }}
                                            >
                                                -- Semua Produk --
                                            </div>
                                            {productList
                                                .filter(p => {
                                                    if (!productSearch || isExactSelectedText) return true;
                                                    const q = productSearch.toLowerCase();
                                                    return (
                                                        (p.nama && p.nama.toLowerCase().includes(q)) ||
                                                        (p.kode && p.kode.toLowerCase().includes(q))
                                                    );
                                                })
                                                .map(p => (
                                                    <div
                                                        key={p.id || p.kode}
                                                        className={`p-2 small border-bottom d-flex align-items-center justify-content-between ${selectedKode === p.kode ? "bg-primary bg-opacity-10 fw-bold text-primary" : "text-dark"}`}
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => {
                                                            setSelectedKode(p.kode);
                                                            setProductSearch(`[${formatKodeProduk(p.kode)}] ${p.nama}`);
                                                            setShowProductDropdown(false);
                                                        }}
                                                    >
                                                        <span>{p.nama}</span>
                                                        <Badge bg="secondary" className="font-monospace ms-2">
                                                            {formatKodeProduk(p.kode)}
                                                        </Badge>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Pencarian Kata Kunci:</Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white border-end-0">
                                            <Search className="text-muted" size={13} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            className="border-start-0 ps-0 fw-semibold"
                                            placeholder="No Order / Penerima / Produk..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            id="input-search-rekap-pemakaian"
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Kategori Barang:</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={kategoriFilter}
                                        onChange={(e) => setKategoriFilter(e.target.value)}
                                        className="fw-semibold"
                                        id="select-kategori-pemakaian"
                                    >
                                        <option value="">Semua Kategori</option>
                                        {categories.map((c, idx) => {
                                            const catName = typeof c === "string" ? c : (c.nama_kategori || c.nama || "");
                                            if (!catName) return null;
                                            return (
                                                <option key={c.id || idx} value={catName}>
                                                    {catName}
                                                </option>
                                            );
                                        })}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Baris 2: Rentang Tanggal Keluar, Urutan & Reset */}
                        <Row className="g-2 align-items-end mb-2">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Tanggal Keluar (Awal):</Form.Label>
                                    <Form.Control
                                        type="date"
                                        size="sm"
                                        value={tglDari}
                                        onChange={(e) => setTglDari(e.target.value)}
                                        className="fw-semibold"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Tanggal Keluar (Akhir):</Form.Label>
                                    <Form.Control
                                        type="date"
                                        size="sm"
                                        value={tglSampai}
                                        onChange={(e) => setTglSampai(e.target.value)}
                                        className="fw-semibold"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-semibold text-secondary mb-1">Urutan Data:</Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        className="fw-semibold"
                                    >
                                        <option value="terbaru">Terbaru</option>
                                        <option value="terlama">Terlama</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={3} className="text-end">
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={resetFilters}
                                    disabled={!selectedKode && !productSearch && !tglDari && !tglSampai && !kategoriFilter && !searchTerm && sortOrder === "terbaru"}
                                    className="w-100 fw-bold d-flex align-items-center justify-content-center"
                                    style={{ height: "31px" }}
                                    title="Reset Semua Filter"
                                >
                                    Reset Filter
                                </Button>
                            </Col>
                        </Row>

                        {/* Baris 3: Preset Cepat Tanggal */}
                        <Row className="g-2 pt-2 border-top">
                            <Col md={12} className="d-flex align-items-center gap-1 flex-wrap">
                                <span className="fw-semibold text-secondary me-2" style={{ fontSize: "0.8rem" }}>Pilihan Periode:</span>
                                <Button
                                    variant={tglDari === getTodayFormatted() && tglSampai === getTodayFormatted() ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        const today = getTodayFormatted();
                                        setTglDari(today);
                                        setTglSampai(today);
                                    }}
                                >
                                    Hari Ini
                                </Button>
                                <Button
                                    variant={tglDari === getFirstDayOfMonthFormatted() && tglSampai === getTodayFormatted() ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        setTglDari(getFirstDayOfMonthFormatted());
                                        setTglSampai(getTodayFormatted());
                                    }}
                                >
                                    Bulan Ini
                                </Button>
                                <Button
                                    variant={tglDari === getThreeMonthsAgoFormatted() && tglSampai === getTodayFormatted() ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        setTglDari(getThreeMonthsAgoFormatted());
                                        setTglSampai(getTodayFormatted());
                                    }}
                                >
                                    3 Bulan Terakhir
                                </Button>
                                <Button
                                    variant={!tglDari && !tglSampai ? "primary" : "outline-secondary"}
                                    size="sm"
                                    className="py-0.5 px-2.5 fw-semibold"
                                    style={{ fontSize: "0.78rem" }}
                                    onClick={() => {
                                        setTglDari("");
                                        setTglSampai("");
                                    }}
                                >
                                    Semua Tanggal
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Tabbed View Selector */}
                <div className="no-print mb-3 border-bottom">
                    <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                        <Nav.Item>
                            <Nav.Link eventKey="per-order" className="fw-bold d-flex align-items-center gap-2">
                                <Receipt size={16} /> Rekap Per Bon Order ({rekapOrder.length})
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="per-barang" className="fw-bold d-flex align-items-center gap-2">
                                <BoxSeam size={16} /> Rekap Per Nama Barang ({rekapBarang.length})
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="per-penerima" className="fw-bold d-flex align-items-center gap-2">
                                <PersonFill size={16} /> Rekap Per Penerima ({rekapPenerima.length})
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </div>

                {/* Main Content Table Body */}
                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="success" />
                        <div className="mt-2 text-muted small">Memuat laporan rekapitulasi pemakaian...</div>
                    </div>
                ) : (
                    <>
                        {/* TAB 1: Rekap Per Bon Order */}
                        {activeTab === "per-order" && (
                            <Table responsive hover className="custom-table m-0">
                                <thead>
                                    <tr>
                                        <th className="text-center" style={{ width: "50px" }}>No.</th>
                                        <th>No. Order / Bon</th>
                                        <th>Tanggal Keluar</th>
                                        <th>Penerima / Unit</th>
                                        <th>Item Barang Keluar</th>
                                        <th>Total Unit</th>
                                        <th>Keterangan</th>
                                        <th className="text-center no-print">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rekapOrder.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center text-muted py-5">
                                                Tidak ada data pemakaian barang pada filter ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        rekapOrder.map((order, idx) => (
                                            <tr key={order.no_order}>
                                                <td className="text-center text-muted fw-semibold">{idx + 1}</td>
                                                <td><span className="badge-code-out">{order.no_order}</span></td>
                                                <td>{order.tanggal_pemakaian}</td>
                                                <td className="fw-semibold">{order.penerima || "-"}</td>
                                                <td>
                                                    <div className="d-flex flex-column gap-1">
                                                        {order.items.slice(0, 3).map((it, idx) => (
                                                            <div key={idx} className="small d-flex align-items-center gap-2">
                                                                <span className="fw-semibold text-dark">{it.nama_produk}</span>
                                                                <Badge bg="success" className="bg-opacity-10 text-success border border-success-subtle">
                                                                    {it.jumlah} {it.satuan}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                        {order.items.length > 3 && (
                                                            <div className="text-muted small italic">+ {order.items.length - 3} item barang lainnya...</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="fw-bold text-success fs-6">{order.total_unit} Unit</td>
                                                <td className="text-muted small">{order.keterangan || "-"}</td>
                                                <td className="text-center no-print">
                                                    <Button
                                                        variant="outline-info"
                                                        size="sm"
                                                        className="py-1 px-2 fw-semibold"
                                                        onClick={() => {
                                                            setSelectedOrder(order);
                                                            setShowDetailModal(true);
                                                        }}
                                                    >
                                                        <EyeFill size={13} className="me-1" /> Detail
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        )}

                        {/* TAB 2: Rekap Per Nama Barang */}
                        {activeTab === "per-barang" && (
                            <Table responsive hover className="custom-table m-0">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>Kode Produk</th>
                                        <th>Nama Barang</th>
                                        <th>Kategori</th>
                                        <th>Satuan</th>
                                        <th>Total Keluar (Unit)</th>
                                        <th>Frekuensi Diambil</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rekapBarang.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center text-muted py-5">
                                                Tidak ada data barang keluar pada filter ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        rekapBarang.map((item, idx) => (
                                            <tr key={item.kode_produk || idx}>
                                                <td>{idx + 1}</td>
                                                 <td><span className="badge-code-product">{formatKodeProduk(item.kode_produk)}</span></td>
                                                <td className="fw-bold text-dark">{item.nama_produk}</td>
                                                <td>
                                                    <span>{item.kategori}</span>
                                                    {item.sub_kategori && item.sub_kategori !== "-" && (
                                                        <Badge bg="info" className="bg-opacity-10 text-info border border-info-subtle ms-1">
                                                            {item.sub_kategori}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td>{item.satuan}</td>
                                                <td className="fw-bold text-success fs-6">{item.total_jumlah} {item.satuan}</td>
                                                <td>
                                                    <Badge bg="secondary" className="bg-opacity-10 text-dark border border-secondary-subtle px-2 py-1">
                                                        {item.frekuensi} Transaksi
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        )}

                        {/* TAB 3: Rekap Per Penerima */}
                        {activeTab === "per-penerima" && (
                            <Table responsive hover className="custom-table m-0">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>Nama Penerima / Unit Kerja</th>
                                        <th>Jumlah Bon Order</th>
                                        <th>Total Barang Diambil</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rekapPenerima.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted py-5">
                                                Tidak ada data penerima pada filter ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        rekapPenerima.map((p, idx) => (
                                            <tr key={p.penerima || idx}>
                                                <td>{idx + 1}</td>
                                                <td className="fw-bold text-dark">
                                                    <PersonFill className="me-2 text-primary" size={16} />
                                                    {p.penerima}
                                                </td>
                                                <td>
                                                    <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary-subtle px-2 py-1">
                                                        {p.jumlah_order} Bon Order
                                                    </Badge>
                                                </td>
                                                <td className="fw-bold text-success fs-6">{p.total_unit} Unit</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </>
                )}

            </div>

            {/* Modal Detail Bon Order */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold fs-6 d-flex align-items-center gap-2">
                        <Receipt className="text-primary" /> Rincian Bon Order Pemakaian: {selectedOrder?.no_order}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedOrder && (
                        <>
                            <Row className="mb-3 g-2 bg-light p-3 rounded-3 border">
                                <Col md={6}>
                                    <div className="small text-muted">Tanggal Pemakaian:</div>
                                    <div className="fw-bold">{selectedOrder.tanggal_pemakaian}</div>
                                </Col>
                                <Col md={6}>
                                    <div className="small text-muted">Penerima / Pihak Mengambil:</div>
                                    <div className="fw-bold text-primary">{selectedOrder.penerima || "-"}</div>
                                </Col>
                                <Col md={12} className="mt-2 pt-2 border-top">
                                    <div className="small text-muted">Keterangan:</div>
                                    <div>{selectedOrder.keterangan || "-"}</div>
                                </Col>
                            </Row>

                            <h6 className="fw-bold text-dark mb-2">Daftar Item Barang Keluar:</h6>
                            <Table responsive borderless className="custom-table border rounded-3">
                                <thead className="table-light">
                                    <tr>
                                        <th>Kode</th>
                                        <th>Nama Barang</th>
                                        <th>Kategori</th>
                                        <th>Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map((it, idx) => (
                                        <tr key={idx} className="border-bottom">
                                             <td><span className="badge-code-product">{formatKodeProduk(it.kode_produk)}</span></td>
                                            <td className="fw-bold">{it.nama_produk}</td>
                                            <td>{it.kategori || "-"}</td>
                                            <td className="fw-bold text-success">{it.jumlah} {it.satuan}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>
                        Tutup
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default LaporanPemakaian;
