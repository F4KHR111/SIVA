const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateSecret, verifySync, generateURI } = require("../utils/totp");
const qrcode = require("qrcode");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "inventaris_secret_token_secure_key_2026";

// Helper: Bentuk response login lengkap dengan token & hak akses
const sendLoginResponse = (res, user, message = "Login berhasil.") => {
    // Buat Token Keamanan JWT (berlaku 7 hari)
    const token = jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    // Ambil daftar role menu permissions untuk user ini
    db.all(
        "SELECT menu_key, is_visible FROM role_permissions WHERE role = ?",
        [user.role],
        (errPerm, permRows) => {
            const permissions = {};
            if (!errPerm && permRows) {
                permRows.forEach(p => {
                    permissions[p.menu_key] = Number(p.is_visible) === 1;
                });
            }

            // Ambil pembatasan kategori untuk user ini
            db.all(
                "SELECT nama_kategori FROM role_categories WHERE role = ?",
                [user.role],
                (errCat, catRows) => {
                    const allowedCategories = (!errCat && catRows) ? catRows.map(c => c.nama_kategori) : [];

                    res.json({
                        success: true,
                        message,
                        token,
                        data: {
                            id: user.id,
                            username: user.username,
                            email: user.email || "",
                            nama: user.nama,
                            role: user.role,
                            is_2fa_enabled: Number(user.is_2fa_enabled) === 1,
                            token,
                            permissions,
                            allowedCategories
                        }
                    });
                }
            );
        }
    );
};

// 1. Login Endpoint (Mendukung Username atau Email)
const login = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username/Email dan password wajib diisi." });
    }

    const cleanIdentifier = username.trim();
    const cleanPassword = password.trim();

    // Cari user berdasarkan username ATAU email
    db.get(
        "SELECT * FROM users WHERE (LOWER(username) = LOWER(?) OR (email IS NOT NULL AND email != '' AND LOWER(email) = LOWER(?))) AND status = 'active'",
        [cleanIdentifier, cleanIdentifier],
        (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            if (!user) {
                return res.status(401).json({ success: false, message: "Username/Email tidak ditemukan atau akun dinonaktifkan." });
            }

            // Verifikasi password terenkripsi (Bcrypt) dengan fallback auto-upgrade
            let isMatch = false;
            let isLegacyPlain = false;

            if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$"))) {
                try {
                    isMatch = bcrypt.compareSync(cleanPassword, user.password);
                } catch (bcryptErr) {
                    console.error("Bcrypt compare error:", bcryptErr);
                    isMatch = false;
                }
            } else {
                // Legacy plaintext check
                if (user.password === cleanPassword) {
                    isMatch = true;
                    isLegacyPlain = true;
                }
            }

            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Password yang Anda masukkan salah." });
            }

            // Jika masih password lama berbentuk plaintext, otomatis enkripsi ke database
            if (isLegacyPlain) {
                const encryptedHash = bcrypt.hashSync(cleanPassword, 10);
                db.run("UPDATE users SET password = ? WHERE id = ?", [encryptedHash, user.id], (errUp) => {
                    if (errUp) console.error("Auto-encrypt legacy password note:", errUp.message);
                });
            }

            // Periksa status 2FA Microsoft Authenticator
            if (Number(user.is_2fa_enabled) === 1 && user.totp_secret) {
                // Akun sudah mengaktifkan 2FA: minta kode 6 digit verifikasi login
                const tempToken = jwt.sign(
                    { id: user.id, username: user.username, email: user.email, is2FA: true },
                    JWT_SECRET,
                    { expiresIn: "5m" }
                );

                return res.json({
                    success: true,
                    require2FA: true,
                    tempToken,
                    message: "Masukkan 6 digit kode dari aplikasi Microsoft Authenticator Anda.",
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email || "",
                        nama: user.nama
                    }
                });
            }

            // Akun belum pernah setup 2FA: Otomatis buat Secret & QR Code agar pegawai bisa scan mandiri!
            try {
                const secret = generateSecret();
                const issuer = "Inventaris Gedung Agung";
                const accountLabel = user.email && user.email.trim() ? `${user.email} (${user.username})` : user.username;
                const otpauthUri = generateURI({ issuer, label: accountLabel, secret });
                
                qrcode.toDataURL(otpauthUri, {
                    width: 250,
                    margin: 2,
                    color: { dark: "#0f4c81", light: "#ffffff" }
                }).then(qrCodeUrl => {
                    const setupToken = jwt.sign(
                        { id: user.id, username: user.username, email: user.email, secret, is2FASetup: true },
                        JWT_SECRET,
                        { expiresIn: "15m" }
                    );

                    res.json({
                        success: true,
                        require2FASetup: true,
                        setupToken,
                        qrCodeUrl,
                        secret,
                        message: `Halo ${user.nama}, demi keamanan, silakan buka Microsoft Authenticator di HP Anda dan scan QR Code ini.`,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email || "",
                            nama: user.nama
                        }
                    });
                }).catch(qrErr => {
                    console.error("Gagal generate QR Code onboarding:", qrErr);
                    sendLoginResponse(res, user, "Login berhasil.");
                });
            } catch (errGen) {
                console.error("Error generate 2FA secret:", errGen);
                sendLoginResponse(res, user, "Login berhasil.");
            }
        }
    );
};

// 1.1 Aktivasi Pertama Kali & Langsung Login (Self-Service Onboarding)
const activateAndLogin2FA = (req, res) => {
    const { setupToken, otpCode } = req.body;

    if (!setupToken || !otpCode) {
        return res.status(400).json({ success: false, message: "Sesi setup dan kode 6 digit wajib diisi." });
    }

    try {
        const decoded = jwt.verify(setupToken, JWT_SECRET);
        if (!decoded || !decoded.id || !decoded.secret || !decoded.is2FASetup) {
            return res.status(401).json({ success: false, message: "Sesi setup QR Code telah kadaluarsa. Silakan login kembali." });
        }

        const cleanCode = String(otpCode).trim();
        // epochTolerance: 30 memberikan toleransi sinkronisasi waktu dan transisi detik kode
        const verification = verifySync({ token: cleanCode, secret: decoded.secret, epochTolerance: 30 });

        if (!verification || !verification.valid) {
            return res.status(400).json({ success: false, message: "Kode 6 digit salah atau tidak sesuai. Pastikan jam pada smartphone Anda diatur otomatis." });
        }

        // Simpan secret dan tandai 2FA aktif permanen
        db.run(
            "UPDATE users SET totp_secret = ?, is_2fa_enabled = 1 WHERE id = ?",
            [decoded.secret, decoded.id],
            function (err) {
                if (err) {
                    return res.status(500).json({ success: false, message: err.message });
                }

                // Ambil data user lengkap dan langsung masuk
                db.get("SELECT * FROM users WHERE id = ?", [decoded.id], (errU, user) => {
                    if (errU || !user) {
                        return res.status(500).json({ success: false, message: "Gagal memproses data akun." });
                    }
                    sendLoginResponse(res, user, `Selamat! Microsoft Authenticator berhasil terpasang dan Anda telah berhasil login.`);
                });
            }
        );
    } catch (jwtErr) {
        return res.status(401).json({ success: false, message: "Sesi setup QR Code telah kadaluarsa. Silakan ulangi login dari awal." });
    }
};

// 2. Verifikasi 6 Digit Kode Microsoft Authenticator
const verify2FA = (req, res) => {
    const { tempToken, otpCode } = req.body;

    if (!tempToken || !otpCode) {
        return res.status(400).json({ success: false, message: "Token sesi dan 6 digit kode wajib diisi." });
    }

    try {
        const decoded = jwt.verify(tempToken, JWT_SECRET);
        if (!decoded || !decoded.id || !decoded.is2FA) {
            return res.status(401).json({ success: false, message: "Sesi verifikasi tidak valid atau telah kadaluarsa. Silakan login kembali." });
        }

        db.get("SELECT * FROM users WHERE id = ? AND status = 'active'", [decoded.id], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ success: false, message: "Pengguna tidak ditemukan atau dinonaktifkan." });
            }

            if (!user.totp_secret) {
                return res.status(400).json({ success: false, message: "Kunci keamanan Microsoft Authenticator belum dikonfigurasi pada akun ini." });
            }

            // Verifikasi kode OTP TOTP (dengan toleransi sinkronisasi waktu 30 detik)
            const cleanCode = String(otpCode).trim();
            const verification = verifySync({ token: cleanCode, secret: user.totp_secret, epochTolerance: 30 });

            if (!verification || !verification.valid) {
                return res.status(401).json({ success: false, message: "Kode 6 digit Microsoft Authenticator salah atau telah kadaluarsa. Coba kode terbaru di aplikasi HP Anda." });
            }

            // Kode valid! Berikan akses penuh
            sendLoginResponse(res, user, "Autentikasi dua faktor Microsoft Authenticator berhasil.");
        });
    } catch (err) {
        return res.status(401).json({ success: false, message: "Sesi verifikasi kadaluarsa (lebih dari 5 menit). Silakan ulangi login dari awal." });
    }
};

// 3. Setup Microsoft Authenticator (Generate Secret Key & QR Code)
const setup2FA = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID wajib dikirim." });
    }

    db.get("SELECT id, username, email, nama, is_2fa_enabled FROM users WHERE id = ?", [userId], async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
        }

        try {
            // Generate secret baru
            const secret = generateSecret();
            const issuer = "Inventaris Gedung Agung";
            const accountLabel = user.email && user.email.trim() ? `${user.email} (${user.username})` : user.username;

            // Generate URI standar RFC 6238 TOTP
            const otpauthUri = generateURI({
                issuer,
                label: accountLabel,
                secret
            });

            // Bentuk QR Code sebagai Data URL
            const qrCodeUrl = await qrcode.toDataURL(otpauthUri, {
                width: 260,
                margin: 2,
                color: {
                    dark: "#0f4c81",
                    light: "#ffffff"
                }
            });

            res.json({
                success: true,
                secret,
                qrCodeUrl,
                otpauthUri,
                username: user.username,
                email: user.email || "",
                is_2fa_enabled: Number(user.is_2fa_enabled) === 1
            });
        } catch (setupErr) {
            console.error("Setup 2FA error:", setupErr);
            res.status(500).json({ success: false, message: "Gagal membuat QR Code Microsoft Authenticator." });
        }
    });
};

// 4. Konfirmasi & Aktifkan Microsoft Authenticator
const enable2FA = (req, res) => {
    const { userId, secret, otpCode } = req.body;

    if (!userId || !secret || !otpCode) {
        return res.status(400).json({ success: false, message: "User ID, secret, dan kode verifikasi 6 digit wajib diisi." });
    }

    // Validasi kode dari HP dengan toleransi transisi detik
    const cleanCode = String(otpCode).trim();
    const verification = verifySync({ token: cleanCode, secret: secret.trim(), epochTolerance: 30 });

    if (!verification || !verification.valid) {
        return res.status(400).json({ success: false, message: "Kode verifikasi salah atau tidak sesuai. Pastikan jam pada smartphone Anda diatur otomatis." });
    }

    // Simpan secret dan aktifkan 2FA
    db.run(
        "UPDATE users SET totp_secret = ?, is_2fa_enabled = 1 WHERE id = ?",
        [secret.trim(), userId],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: "Microsoft Authenticator berhasil diaktifkan! Akun Anda kini dilindungi verifikasi 2 langkah."
            });
        }
    );
};

// 5. Nonaktifkan Microsoft Authenticator
const disable2FA = (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID wajib dikirim." });
    }

    db.run(
        "UPDATE users SET totp_secret = NULL, is_2fa_enabled = 0 WHERE id = ?",
        [userId],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: "Microsoft Authenticator berhasil dinonaktifkan dari akun ini."
            });
        }
    );
};

// Ambil Profil Active User (Support JWT Bearer Token & Username)
const getProfile = (req, res) => {
    let targetUsername = req.query.username;

    // Jika ada header Authorization Bearer Token, verifikasi token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.username) {
                targetUsername = decoded.username;
            }
        } catch (jwtErr) {
            if (!targetUsername) {
                return res.status(401).json({ success: false, message: "Sesi token keamanan telah kadaluarsa. Silakan login kembali." });
            }
        }
    }

    if (!targetUsername) {
        return res.status(400).json({ success: false, message: "Username atau token otentikasi wajib dikirim." });
    }

    db.get(
        "SELECT id, username, email, nama, role, status, is_2fa_enabled FROM users WHERE LOWER(username) = LOWER(?)",
        [targetUsername],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
            }

            db.all(
                "SELECT menu_key, is_visible FROM role_permissions WHERE role = ?",
                [user.role],
                (errPerm, permRows) => {
                    const permissions = {};
                    if (!errPerm && permRows) {
                        permRows.forEach(p => {
                            permissions[p.menu_key] = Number(p.is_visible) === 1;
                        });
                    }

                    db.all(
                        "SELECT nama_kategori FROM role_categories WHERE role = ?",
                        [user.role],
                        (errCat, catRows) => {
                            const allowedCategories = (!errCat && catRows) ? catRows.map(c => c.nama_kategori) : [];

                            res.json({
                                success: true,
                                data: {
                                    ...user,
                                    email: user.email || "",
                                    is_2fa_enabled: Number(user.is_2fa_enabled) === 1,
                                    permissions,
                                    allowedCategories
                                }
                            });
                        }
                    );
                }
            );
        }
    );
};

module.exports = {
    login,
    activateAndLogin2FA,
    verify2FA,
    setup2FA,
    enable2FA,
    disable2FA,
    getProfile,
    JWT_SECRET
};
