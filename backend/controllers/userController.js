const bcrypt = require("bcryptjs");
const db = require("../db");

// Ambil semua user
const getUser = (req, res) => {
    const { role } = req.query;
    let sql = "SELECT id, username, email, nama, role, status, is_2fa_enabled, created_at FROM users";
    let params = [];
    if (role) {
        sql += " WHERE LOWER(role) = LOWER(?)";
        params.push(role);
    }
    sql += " ORDER BY nama ASC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
};

// Tambah user login baru dengan enkripsi password Bcrypt & Email
const createUser = (req, res) => {
    const { username, email, password, nama, role, status } = req.body;
    
    if (!nama || nama.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama wajib diisi." });
    }
    if (!username || username.trim() === "") {
        return res.status(400).json({ success: false, message: "Username wajib diisi." });
    }
    if (!password || password.trim() === "") {
        return res.status(400).json({ success: false, message: "Password wajib diisi." });
    }

    const userRole = (role || "OPERATOR_INVENTARIS").toUpperCase();
    const userStatus = status || "active";
    const userUsername = username.trim().toLowerCase();
    const userEmail = (email || "").trim().toLowerCase();
    // Enkripsi password menggunakan Bcrypt
    const hashedPassword = bcrypt.hashSync(password.trim(), 10);

    db.run(
        "INSERT INTO users (username, email, password, nama, role, status) VALUES (?, ?, ?, ?, ?, ?)",
        [userUsername, userEmail, hashedPassword, nama.trim(), userRole, userStatus],
        function (err) {
            if (err) {
                if (err.message.includes("UNIQUE") || err.message.includes("Duplicate")) {
                    return res.status(400).json({ success: false, message: "Username sudah terdaftar. Gunakan username lain." });
                }
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({
                success: true,
                message: "Akun pengguna berhasil ditambahkan dengan keamanan terenkripsi.",
                data: { id: this.lastID, username: userUsername, email: userEmail, nama: nama.trim(), role: userRole, status: userStatus }
            });
        }
    );
};

// Update user login (username, email, password optional, nama, role, status)
const updateUser = (req, res) => {
    const { id } = req.params;
    const { username, email, password, nama, role, status } = req.body;

    if (!nama || nama.trim() === "") {
        return res.status(400).json({ success: false, message: "Nama wajib diisi." });
    }
    if (!username || username.trim() === "") {
        return res.status(400).json({ success: false, message: "Username wajib diisi." });
    }

    const userRole = (role || "OPERATOR_INVENTARIS").toUpperCase();
    const userStatus = status || "active";
    const userUsername = username.trim().toLowerCase();
    const userEmail = (email || "").trim().toLowerCase();

    if (password && password.trim() !== "") {
        // Enkripsi password baru menggunakan Bcrypt
        const hashedPassword = bcrypt.hashSync(password.trim(), 10);
        db.run(
            "UPDATE users SET username = ?, email = ?, password = ?, nama = ?, role = ?, status = ? WHERE id = ?",
            [userUsername, userEmail, hashedPassword, nama.trim(), userRole, userStatus, id],
            function (err) {
                if (err) {
                    if (err.message.includes("UNIQUE") || err.message.includes("Duplicate")) {
                        return res.status(400).json({ success: false, message: "Username sudah digunakan oleh pengguna lain." });
                    }
                    return res.status(500).json({ success: false, message: err.message });
                }
                if (this.changes === 0) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
                res.json({ success: true, message: "Akun pengguna & password berhasil diperbarui dengan enkripsi aman." });
            }
        );
    } else {
        db.run(
            "UPDATE users SET username = ?, email = ?, nama = ?, role = ?, status = ? WHERE id = ?",
            [userUsername, userEmail, nama.trim(), userRole, userStatus, id],
            function (err) {
                if (err) {
                    if (err.message.includes("UNIQUE") || err.message.includes("Duplicate")) {
                        return res.status(400).json({ success: false, message: "Username sudah digunakan oleh pengguna lain." });
                    }
                    return res.status(500).json({ success: false, message: err.message });
                }
                if (this.changes === 0) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
                res.json({ success: true, message: "Akun pengguna berhasil diperbarui." });
            }
        );
    }
};

// Reset Microsoft Authenticator 2FA untuk user tertentu (oleh Admin)
const resetUser2FA = (req, res) => {
    const { id } = req.params;
    db.run("UPDATE users SET is_2fa_enabled = 0, totp_secret = NULL WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
        res.json({ success: true, message: "Microsoft Authenticator (2FA) berhasil direset untuk pengguna ini." });
    });
};

// Hapus user
const deleteUser = (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
        res.json({ success: true, message: "Pengguna berhasil dihapus." });
    });
};

// Ambil matriks hak akses menu & sub-menu
const getRolePermissions = (req, res) => {
    db.all("SELECT role, menu_key, is_visible FROM role_permissions", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        const matrix = {};
        rows.forEach(r => {
            if (!matrix[r.role]) matrix[r.role] = {};
            matrix[r.role][r.menu_key] = Number(r.is_visible) === 1;
        });

        res.json({ success: true, data: matrix });
    });
};

// Update matriks hak akses menu untuk role tertentu
const updateRolePermissions = (req, res) => {
    const { role, permissions } = req.body;
    if (!role || !permissions) {
        return res.status(400).json({ success: false, message: "Role dan permissions wajib dikirim." });
    }

    const roleName = role.toUpperCase();
    const keys = Object.keys(permissions);

    db.run("DELETE FROM role_permissions WHERE role = ?", [roleName], (errDel) => {
        if (errDel) {
            console.error("Error delete role permissions:", errDel.message);
            return res.status(500).json({ success: false, message: errDel.message });
        }

        if (keys.length === 0) {
            return res.json({ success: true, message: `Hak akses menu untuk role ${roleName} berhasil diperbarui!` });
        }

        let completed = 0;
        let hasError = false;

        keys.forEach(menuKey => {
            const isVisible = permissions[menuKey] ? 1 : 0;
            db.run(
                `INSERT INTO role_permissions (role, menu_key, is_visible) VALUES (?, ?, ?)`,
                [roleName, menuKey, isVisible],
                (errIns) => {
                    completed++;
                    if (errIns) {
                        hasError = true;
                        console.error("Error insert role permission:", errIns.message);
                    }
                    if (completed === keys.length) {
                        if (hasError) {
                            return res.status(500).json({ success: false, message: "Beberapa hak akses gagal disimpan." });
                        }
                        res.json({ success: true, message: `Hak akses menu untuk role ${roleName} berhasil diperbarui!` });
                    }
                }
            );
        });
    });
};

// Ambil matriks pembatasan kategori per role
const getRoleCategoryPermissions = (req, res) => {
    db.all("SELECT role, nama_kategori FROM role_categories", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        const matrix = {};
        rows.forEach(r => {
            if (!matrix[r.role]) matrix[r.role] = [];
            matrix[r.role].push(r.nama_kategori);
        });

        res.json({ success: true, data: matrix });
    });
};

// Update pembatasan kategori untuk role tertentu
const updateRoleCategoryPermissions = (req, res) => {
    const { role, categories } = req.body;
    if (!role) {
        return res.status(400).json({ success: false, message: "Role wajib dikirim." });
    }

    const roleName = role.toUpperCase();
    const categoriesArray = Array.isArray(categories) ? categories : [];

    db.run("DELETE FROM role_categories WHERE role = ?", [roleName], (errDel) => {
        if (errDel) {
            return res.status(500).json({ success: false, message: errDel.message });
        }

        if (categoriesArray.length === 0) {
            return res.json({ success: true, message: `Role ${roleName} diizinkan mengakses seluruh kategori (tanpa batasan).` });
        }

        let completed = 0;
        let hasError = false;

        categoriesArray.forEach(kat => {
            db.run(
                "INSERT INTO role_categories (role, nama_kategori) VALUES (?, ?)",
                [roleName, kat],
                (errIns) => {
                    completed++;
                    if (errIns) {
                        hasError = true;
                        console.error("Error insert role_category:", errIns.message);
                    }
                    if (completed === categoriesArray.length) {
                        if (hasError) {
                            return res.status(500).json({ success: false, message: "Beberapa kategori gagal disimpan." });
                        }
                        res.json({ success: true, message: `Akses kategori barang untuk role ${roleName} berhasil diperbarui!` });
                    }
                }
            );
        });
    });
};

module.exports = {
    getUser,
    createUser,
    updateUser,
    deleteUser,
    resetUser2FA,
    getRolePermissions,
    updateRolePermissions,
    getRoleCategoryPermissions,
    updateRoleCategoryPermissions
};
