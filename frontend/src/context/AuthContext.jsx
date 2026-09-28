import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "../api";

const AuthContext = createContext();

const API_AUTH = `${API_BASE_URL.replace(/\/+$/, "")}/auth`;

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => {
        try {
            return localStorage.getItem("inventaris_token") || null;
        } catch {
            return null;
        }
    });

    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem("inventaris_user");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // Sinkronisasi header Authorization Axios secara global
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            try {
                localStorage.setItem("inventaris_token", token);
            } catch (e) {}
        } else {
            delete axios.defaults.headers.common["Authorization"];
            try {
                localStorage.removeItem("inventaris_token");
            } catch (e) {}
        }
    }, [token]);

    const [rolePermissions, setRolePermissions] = useState(() => {
        try {
            const saved = localStorage.getItem("inventaris_permissions");
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [allowedCategories, setAllowedCategories] = useState(() => {
        try {
            const saved = localStorage.getItem("inventaris_allowed_categories");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [loadingAuth, setLoadingAuth] = useState(false);

    // Helper: Reset all session caches completely
    const clearCacheAndReset = () => {
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (e) {
            console.error("Gagal membersihkan storage:", e);
        }
        setToken(null);
        delete axios.defaults.headers.common["Authorization"];
        setUser(null);
        setRolePermissions({});
        setAllowedCategories([]);
    };

    // Save to localStorage when user state changes
    useEffect(() => {
        if (user) {
            localStorage.setItem("inventaris_user", JSON.stringify(user));
        }
    }, [user]);

    // Refetch user profile & permissions matrix
    const refreshProfile = async () => {
        if (!user?.username) return;
        try {
            const res = await axios.get(`${API_AUTH}/me?username=${encodeURIComponent(user.username)}`);
            if (res.data?.success && res.data.data) {
                const updatedUser = res.data.data;
                setUser(prev => ({ ...prev, ...updatedUser }));
                if (updatedUser.permissions) {
                    setRolePermissions(updatedUser.permissions);
                    localStorage.setItem("inventaris_permissions", JSON.stringify(updatedUser.permissions));
                }
                if (updatedUser.allowedCategories) {
                    setAllowedCategories(updatedUser.allowedCategories);
                    localStorage.setItem("inventaris_allowed_categories", JSON.stringify(updatedUser.allowedCategories));
                }
            }
        } catch (err) {
            console.error("Gagal memperbarui profil pengguna:", err);
        }
    };

    useEffect(() => {
        if (user?.username) {
            refreshProfile();
        }
    }, []);

    // Login Function with automatic cache wipe first
    const login = async (username, password) => {
        setLoadingAuth(true);
        clearCacheAndReset();

        try {
            const res = await axios.post(`${API_AUTH}/login`, { username, password });
            if (res.data?.success) {
                // Jika user belum setup 2FA (Scan Mandiri saat Pertama Login)
                if (res.data?.require2FASetup) {
                    return {
                        success: true,
                        require2FASetup: true,
                        setupToken: res.data.setupToken,
                        qrCodeUrl: res.data.qrCodeUrl,
                        secret: res.data.secret,
                        message: res.data.message,
                        user: res.data.user
                    };
                }

                // Jika user memerlukan verifikasi langkah kedua (Microsoft Authenticator 2FA)
                if (res.data?.require2FA) {
                    return {
                        success: true,
                        require2FA: true,
                        tempToken: res.data.tempToken,
                        message: res.data.message,
                        user: res.data.user
                    };
                }

                const userData = res.data.data;
                const receivedToken = res.data.token || userData?.token;
                if (receivedToken) {
                    setToken(receivedToken);
                    localStorage.setItem("inventaris_token", receivedToken);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
                }
                setUser(userData);
                if (userData.permissions) {
                    setRolePermissions(userData.permissions);
                    localStorage.setItem("inventaris_permissions", JSON.stringify(userData.permissions));
                }
                if (userData.allowedCategories) {
                    setAllowedCategories(userData.allowedCategories);
                    localStorage.setItem("inventaris_allowed_categories", JSON.stringify(userData.allowedCategories));
                }
                localStorage.setItem("inventaris_user", JSON.stringify(userData));
                return { success: true, message: res.data.message, user: userData };
            }
            return { success: false, message: res.data?.message || "Login gagal." };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || "Gagal terhubung ke server login."
            };
        } finally {
            setLoadingAuth(false);
        }
    };

    // Aktivasi Pertama Kali & Langsung Login (Self-Service Onboarding)
    const activateAndLogin2FA = async (setupToken, otpCode) => {
        setLoadingAuth(true);
        try {
            const res = await axios.post(`${API_AUTH}/setup-2fa-activate`, { setupToken, otpCode });
            if (res.data?.success) {
                const userData = res.data.data;
                const receivedToken = res.data.token || userData?.token;
                if (receivedToken) {
                    setToken(receivedToken);
                    localStorage.setItem("inventaris_token", receivedToken);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
                }
                setUser(userData);
                if (userData.permissions) {
                    setRolePermissions(userData.permissions);
                    localStorage.setItem("inventaris_permissions", JSON.stringify(userData.permissions));
                }
                if (userData.allowedCategories) {
                    setAllowedCategories(userData.allowedCategories);
                    localStorage.setItem("inventaris_allowed_categories", JSON.stringify(userData.allowedCategories));
                }
                localStorage.setItem("inventaris_user", JSON.stringify(userData));
                return { success: true, message: res.data.message, user: userData };
            }
            return { success: false, message: res.data?.message || "Aktivasi 2FA gagal." };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || "Kode 6 digit salah atau sesi setup telah kadaluarsa."
            };
        } finally {
            setLoadingAuth(false);
        }
    };

    // Verifikasi 6 Digit Kode Microsoft Authenticator
    const verify2FA = async (tempToken, otpCode) => {
        setLoadingAuth(true);
        try {
            const res = await axios.post(`${API_AUTH}/verify-2fa`, { tempToken, otpCode });
            if (res.data?.success) {
                const userData = res.data.data;
                const receivedToken = res.data.token || userData?.token;
                if (receivedToken) {
                    setToken(receivedToken);
                    localStorage.setItem("inventaris_token", receivedToken);
                    axios.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
                }
                setUser(userData);
                if (userData.permissions) {
                    setRolePermissions(userData.permissions);
                    localStorage.setItem("inventaris_permissions", JSON.stringify(userData.permissions));
                }
                if (userData.allowedCategories) {
                    setAllowedCategories(userData.allowedCategories);
                    localStorage.setItem("inventaris_allowed_categories", JSON.stringify(userData.allowedCategories));
                }
                localStorage.setItem("inventaris_user", JSON.stringify(userData));
                return { success: true, message: res.data.message, user: userData };
            }
            return { success: false, message: res.data?.message || "Verifikasi 2FA gagal." };
        } catch (err) {
            return {
                success: false,
                message: err.response?.data?.message || "Kode 6 digit salah atau sesi kadaluarsa."
            };
        } finally {
            setLoadingAuth(false);
        }
    };

    // Logout Function with full browser reload & cache purge
    const logout = () => {
        clearCacheAndReset();
        window.location.href = "/";
    };

    // Dynamic Permission Checker (Support Parent-Child Rules)
    const isMenuVisible = (menuKey) => {
        if (!user) return true;

        const roleUpper = (user.role || "").toUpperCase();
        // ADMIN always sees everything
        if (roleUpper === "ADMIN") return true;

        // Dynamic Parent-Child Hierarchy map
        const parentMap = {
            laporan_expired: "laporan",
            rekap_penerimaan: "laporan",
            rekap_pemakaian: "laporan"
        };

        const parentKey = parentMap[menuKey];
        if (parentKey) {
            // Check if parent menu is hidden
            const parentAllowed = rolePermissions[parentKey] !== false;
            if (!parentAllowed) return false;
        }

        // Return exact permission setting for this menuKey
        return rolePermissions[menuKey] !== false;
    };

    // Category Scope Checker
    const isCategoryAllowed = (namaKategori) => {
        if (!user) return true;
        const roleUpper = (user.role || "").toUpperCase();
        if (roleUpper === "ADMIN") return true;

        const userAllowed = user.allowedCategories || allowedCategories || [];
        // If no category restrictions set for this role, allow all categories
        if (!userAllowed || userAllowed.length === 0) return true;

        if (!namaKategori) return true;
        return userAllowed.includes(namaKategori);
    };

    // Global Unsaved Changes Guard State
    const [isPageDirty, setIsPageDirtyState] = useState(false);
    const saveHandlerRef = useRef(null);

    const setIsPageDirty = (dirty, saveCallback = null) => {
        setIsPageDirtyState(Boolean(dirty));
        if (typeof saveCallback === "function") {
            saveHandlerRef.current = saveCallback;
        } else if (typeof dirty === "function") {
            saveHandlerRef.current = dirty;
            setIsPageDirtyState(true);
        } else if (!dirty) {
            saveHandlerRef.current = null;
        }
    };

    const savePageChanges = async () => {
        if (saveHandlerRef.current && typeof saveHandlerRef.current === "function") {
            return await saveHandlerRef.current();
        }
        return true;
    };

    const value = useMemo(() => ({
        user,
        token,
        role: user?.role || "",
        isLoggedIn: !!user,
        loadingAuth,
        rolePermissions,
        allowedCategories,
        isPageDirty,
        setIsPageDirty,
        savePageChanges,
        login,
        activateAndLogin2FA,
        verify2FA,
        logout,
        refreshProfile,
        isMenuVisible,
        isCategoryAllowed
    }), [user, token, rolePermissions, allowedCategories, loadingAuth, isPageDirty]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
