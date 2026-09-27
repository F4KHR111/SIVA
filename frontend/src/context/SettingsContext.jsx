import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const SettingsContext = createContext();

export const DEFAULT_EXPIRED_SETTINGS = {
    threshold_kritis: 30,
    threshold_diperhatikan: 60,
    threshold_aman: 60,
    tahun_non_expired: 5,

    label_expired: "Expired",
    label_kritis: "Segera Expired",
    label_diperhatikan: "Diperhatikan",
    label_aman: "Aman",
    label_non_expired: "Non-Expired (5 Thn)",

    color_expired: "#dc3545",
    color_kritis: "#ffc107",
    color_diperhatikan: "#fd7e14",
    color_aman: "#198754",
    color_non_expired: "#0dcaf0",

    // Print Pemakaian Settings
    print_kop_1: "SEKRETARIAT PRESIDEN",
    print_kop_2: "ISTANA KEPRESIDENAN YOGYAKARTA",
    print_judul_dokumen: "BON BARANG",
    print_font_size: "12px",
    print_space_signature: "50px",
    print_label_ttd_kiri: "Penerima",
    print_label_ttd_kanan: "Petugas Persediaan",
    print_nama_petugas: "",
    print_nip_petugas: "",
    print_show_line: "1",
    print_catatan_kaki: ""
};

function getContrastTextColor(hexColor) {
    if (!hexColor || typeof hexColor !== 'string') return "#ffffff";
    const hex = hexColor.replace("#", "");
    if (hex.length !== 6) return "#ffffff";
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 160 ? "#000000" : "#ffffff";
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_EXPIRED_SETTINGS);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get("http://localhost:3000/api/settings");
            if (res.data && res.data.success && res.data.data) {
                setSettings(res.data.data);
            }
        } catch (err) {
            console.error("Gagal memuat pengaturan global:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Hitung Sisa Hari Otomatis untuk Barang Non-Expired dari Konfigurasi (Tahun)
    const getEffectiveSisaHari = useCallback((item) => {
        if (!item) return 0;
        if (Number(item.is_no_expired) !== 1 && item.sisa_hari !== undefined && item.sisa_hari !== null) {
            return Number(item.sisa_hari);
        }
        
        const tahun = Number(settings.tahun_non_expired || 5);
        const tglMasukStr = item.tanggal_masuk || item.created_at;
        const entryDate = tglMasukStr ? new Date(tglMasukStr) : new Date();
        if (isNaN(entryDate.getTime())) return Math.round(tahun * 365);

        const expiryDate = new Date(entryDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + tahun);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : Math.round(tahun * 365);
    }, [settings]);

    const getExpiredInfo = useCallback((sisa_hari, is_no_expired, item = null) => {
        if (Number(is_no_expired) === 1) {
            const color = settings.color_non_expired || "#0dcaf0";
            const thn = settings.tahun_non_expired || 5;
            const effectiveSisa = item ? getEffectiveSisaHari(item) : (sisa_hari !== undefined && sisa_hari !== 99999 && sisa_hari !== 999 ? sisa_hari : Math.round(thn * 365));
            return {
                key: "non_expired",
                label: settings.label_non_expired || `Non-Expired (${thn} Thn)`,
                color: color,
                textColor: getContrastTextColor(color),
                sisa_hari: effectiveSisa
            };
        }

        const sisa = Number(sisa_hari !== undefined && sisa_hari !== null ? sisa_hari : 999);
        const limitKritis = Number(settings.threshold_kritis || 30);
        const limitDiperhatikan = Number(settings.threshold_diperhatikan || 60);

        if (sisa < 0) {
            const color = settings.color_expired || "#dc3545";
            return {
                key: "expired",
                label: settings.label_expired || "Expired",
                color: color,
                textColor: getContrastTextColor(color),
                sisa_hari: sisa
            };
        }

        if (sisa <= limitKritis) {
            const color = settings.color_kritis || "#ffc107";
            return {
                key: "kritis",
                label: settings.label_kritis || "Segera Expired",
                color: color,
                textColor: getContrastTextColor(color),
                sisa_hari: sisa
            };
        }

        if (sisa <= limitDiperhatikan) {
            const color = settings.color_diperhatikan || "#fd7e14";
            return {
                key: "diperhatikan",
                label: settings.label_diperhatikan || "Diperhatikan",
                color: color,
                textColor: getContrastTextColor(color),
                sisa_hari: sisa
            };
        }

        const color = settings.color_aman || "#198754";
        return {
            key: "aman",
            label: settings.label_aman || "Aman",
            color: color,
            textColor: getContrastTextColor(color),
            sisa_hari: sisa
        };
    }, [settings, getEffectiveSisaHari]);

    return (
        <SettingsContext.Provider value={{ settings, setSettings, fetchSettings, getExpiredInfo, getEffectiveSisaHari, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}
