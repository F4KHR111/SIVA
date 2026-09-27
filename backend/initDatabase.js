const bcrypt = require("bcryptjs");
const db = require("./db");

db.serialize(() => {
    // 1. Tabel Barang
    db.run(`
        CREATE TABLE IF NOT EXISTS barang (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kode_produk VARCHAR(255) NOT NULL,
            nama_produk VARCHAR(255) NOT NULL,
            kategori VARCHAR(255) NOT NULL,
            sub_kategori VARCHAR(255) DEFAULT '',
            satuan VARCHAR(255) NOT NULL,
            jumlah INT NOT NULL,
            tanggal_expired VARCHAR(255) NOT NULL,
            tanggal_masuk VARCHAR(255),
            lokasi VARCHAR(255),
            penerima VARCHAR(255) DEFAULT '',
            is_no_expired TINYINT DEFAULT 0,
            is_arsip TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel barang:", err.message);
        } else {
            console.log("Tabel barang siap digunakan.");
        }
    });

    // 2. Tabel Kategori
    db.run(`
        CREATE TABLE IF NOT EXISTS kategori (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_kategori VARCHAR(255) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel kategori:", err.message);
        } else {
            console.log("Tabel kategori siap digunakan.");
        }
    });

    // 3. Tabel Lokasi
    db.run(`
        CREATE TABLE IF NOT EXISTS lokasi (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_lokasi VARCHAR(255) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel lokasi:", err.message);
        } else {
            console.log("Tabel lokasi siap digunakan.");
        }
    });

    // 4. Tabel Satuan
    db.run(`
        CREATE TABLE IF NOT EXISTS satuan (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_satuan VARCHAR(255) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel satuan:", err.message);
        } else {
            console.log("Tabel satuan siap digunakan.");
        }
    });

    // 5. Tabel Users Login & Pengguna
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) DEFAULT '',
            password VARCHAR(255) NOT NULL,
            nama VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'OPERATOR_INVENTARIS',
            status VARCHAR(20) DEFAULT 'active',
            totp_secret VARCHAR(255) DEFAULT NULL,
            is_2fa_enabled TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel users:", err.message);
        } else {
            console.log("Tabel users siap digunakan.");
        }
    });

    // 6. Tabel Nama Barang (master nama produk & default metadata)
    db.run(`
        CREATE TABLE IF NOT EXISTS nama_barang (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kode VARCHAR(255) DEFAULT '',
            nama VARCHAR(255) NOT NULL UNIQUE,
            kategori VARCHAR(255) DEFAULT '',
            sub_kategori VARCHAR(255) DEFAULT '',
            satuan VARCHAR(255) DEFAULT '',
            lokasi VARCHAR(255) DEFAULT ''
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel nama_barang:", err.message);
        } else {
            console.log("Tabel nama_barang siap digunakan.");
        }
    });

    // 7. Tabel Pemakaian Barang
    db.run(`
        CREATE TABLE IF NOT EXISTS pemakaian (
            id INT AUTO_INCREMENT PRIMARY KEY,
            no_order VARCHAR(255) DEFAULT '',
            kode_produk VARCHAR(255) NOT NULL,
            nama_produk VARCHAR(255) NOT NULL,
            jumlah INT NOT NULL,
            tanggal_pemakaian VARCHAR(255) NOT NULL,
            penerima VARCHAR(255) DEFAULT '',
            keterangan TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel pemakaian:", err.message);
        } else {
            console.log("Tabel pemakaian siap digunakan.");
        }
    });

    // 8. Tabel Sub Kategori
    db.run(`
        CREATE TABLE IF NOT EXISTS sub_kategori (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kategori_id INT NOT NULL,
            nama_sub_kategori VARCHAR(255) NOT NULL,
            UNIQUE KEY unique_kategori_sub (kategori_id, nama_sub_kategori)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel sub_kategori:", err.message);
        } else {
            console.log("Tabel sub_kategori siap digunakan.");
        }
    });

    db.run(`ALTER TABLE barang ADD COLUMN is_no_expired TINYINT DEFAULT 0`, (err) => {
        if (err && !err.message.includes("Duplicate column name")) {
            console.log("Error SQL (run):", err.message);
        }
    });

    db.run(`ALTER TABLE barang ADD COLUMN no_penerimaan VARCHAR(255) DEFAULT ''`, (err) => {
        if (err && !err.message.includes("Duplicate column name")) {
            console.log("Error SQL (run):", err.message);
        } else {
            console.log("Kolom no_penerimaan siap di tabel barang.");
        }
    });

    // 9. Tabel Pengaturan / Konfigurasi
    db.run(`
        CREATE TABLE IF NOT EXISTS pengaturan (
            key_name VARCHAR(255) PRIMARY KEY,
            value_text TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel pengaturan:", err.message);
        } else {
            console.log("Tabel pengaturan siap digunakan.");
        }
    });

    // 10. Tabel Role Menu Permissions (Matriks Hak Akses Menu & Sub-Menu)
    db.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role VARCHAR(50) NOT NULL,
            menu_key VARCHAR(100) NOT NULL,
            is_visible TINYINT DEFAULT 1,
            UNIQUE KEY unique_role_menu (role, menu_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel role_permissions:", err.message);
        } else {
            console.log("Tabel role_permissions siap digunakan.");
        }
    });

    // 11. Tabel Role Category Permissions (Hak Akses Kategori Barang per Role)
    db.run(`
        CREATE TABLE IF NOT EXISTS role_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role VARCHAR(50) NOT NULL,
            nama_kategori VARCHAR(255) NOT NULL,
            UNIQUE KEY unique_role_kat (role, nama_kategori)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => {
        if (err) {
            console.log("Gagal membuat tabel role_categories:", err.message);
        } else {
            console.log("Tabel role_categories siap digunakan.");
        }
    });

    // Migrasi kolom jika tabel users lama sudah ada
    db.run(`ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE`, (err) => { });
    db.run(`ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT ''`, (err) => { });
    db.run(`ALTER TABLE users ADD COLUMN password VARCHAR(255) DEFAULT '123456'`, (err) => { });
    db.run(`ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'`, (err) => { });
    db.run(`ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255) DEFAULT NULL`, (err) => { });
    db.run(`ALTER TABLE users ADD COLUMN is_2fa_enabled TINYINT DEFAULT 0`, (err) => { });

    // Seed default admin and operator accounts with encrypted Bcrypt passwords & emails
    const adminHash = bcrypt.hashSync("admin123", 10);
    const operatorHash = bcrypt.hashSync("operator123", 10);

    db.run(`
        INSERT IGNORE INTO users (username, email, password, nama, role, status) VALUES
        ('admin', 'admin@gedungagung.id', '${adminHash}', 'Administrator Sistem', 'ADMIN', 'active'),
        ('operator_inv', 'inventaris@gedungagung.id', '${operatorHash}', 'Petugas Inventaris', 'OPERATOR_INVENTARIS', 'active'),
        ('operator_poli', 'poliklinik@gedungagung.id', '${operatorHash}', 'Petugas Poliklinik', 'OPERATOR_POLIKLINIK', 'active')
    `, (err) => {
        if (err && !err.message.includes("UNIQUE")) {
            console.log("Seed users note:", err.message);
        } else {
            console.log("Seed user login accounts siap.");
        }
    });

    // Isi email default untuk akun bawaan jika masih kosong
    db.run(`UPDATE users SET email = 'admin@gedungagung.id' WHERE username = 'admin' AND (email IS NULL OR email = '')`);
    db.run(`UPDATE users SET email = 'inventaris@gedungagung.id' WHERE username = 'operator_inv' AND (email IS NULL OR email = '')`);
    db.run(`UPDATE users SET email = 'poliklinik@gedungagung.id' WHERE username = 'operator_poli' AND (email IS NULL OR email = '')`);

    // Auto-enkripsi password pengguna lama yang masih berupa teks polos
    db.all("SELECT id, username, password FROM users", [], (errUsers, userRows) => {
        if (!errUsers && userRows && userRows.length > 0) {
            userRows.forEach(u => {
                if (u.password && !u.password.startsWith("$2a$") && !u.password.startsWith("$2b$") && !u.password.startsWith("$2y$")) {
                    const encrypted = bcrypt.hashSync(u.password.trim(), 10);
                    db.run("UPDATE users SET password = ? WHERE id = ?", [encrypted, u.id], (errUp) => {
                        if (!errUp) {
                            console.log(`[Security] Password pengguna '${u.username}' berhasil diamankan dengan enkripsi Bcrypt.`);
                        }
                    });
                }
            });
        }
    });

    // Seed default role menu permissions
    const defaultPermissions = [
        // ADMIN: all visible
        ['ADMIN', 'dashboard', 1],
        ['ADMIN', 'master_barang', 1],
        ['ADMIN', 'penerimaan', 1],
        ['ADMIN', 'pemakaian', 1],
        ['ADMIN', 'laporan', 1],
        ['ADMIN', 'laporan_expired', 1],
        ['ADMIN', 'rekap_penerimaan', 1],
        ['ADMIN', 'rekap_pemakaian', 1],
        ['ADMIN', 'arsip', 1],
        ['ADMIN', 'pengaturan', 1],
        ['ADMIN', 'kelola_pengguna', 1],

        // OPERATOR_INVENTARIS: full inventory, no settings & user control
        ['OPERATOR_INVENTARIS', 'dashboard', 1],
        ['OPERATOR_INVENTARIS', 'master_barang', 1],
        ['OPERATOR_INVENTARIS', 'penerimaan', 1],
        ['OPERATOR_INVENTARIS', 'pemakaian', 1],
        ['OPERATOR_INVENTARIS', 'laporan', 1],
        ['OPERATOR_INVENTARIS', 'laporan_expired', 1],
        ['OPERATOR_INVENTARIS', 'rekap_penerimaan', 1],
        ['OPERATOR_INVENTARIS', 'rekap_pemakaian', 1],
        ['OPERATOR_INVENTARIS', 'arsip', 1],
        ['OPERATOR_INVENTARIS', 'pengaturan', 0],
        ['OPERATOR_INVENTARIS', 'kelola_pengguna', 0],

        // OPERATOR_POLIKLINIK: poliklinik pemakaian & rekap pemakaian ONLY
        ['OPERATOR_POLIKLINIK', 'dashboard', 1],
        ['OPERATOR_POLIKLINIK', 'master_barang', 0],
        ['OPERATOR_POLIKLINIK', 'penerimaan', 0],
        ['OPERATOR_POLIKLINIK', 'pemakaian', 1],
        ['OPERATOR_POLIKLINIK', 'laporan', 1],
        ['OPERATOR_POLIKLINIK', 'laporan_expired', 0],
        ['OPERATOR_POLIKLINIK', 'rekap_penerimaan', 0],
        ['OPERATOR_POLIKLINIK', 'arsip', 0],
        ['OPERATOR_POLIKLINIK', 'pengaturan', 0],
        ['OPERATOR_POLIKLINIK', 'kelola_pengguna', 0],

        // PEMAKAI: pemakaian & rekap pemakaian ONLY
        ['PEMAKAI', 'dashboard', 1],
        ['PEMAKAI', 'master_barang', 0],
        ['PEMAKAI', 'penerimaan', 0],
        ['PEMAKAI', 'pemakaian', 1],
        ['PEMAKAI', 'laporan', 1],
        ['PEMAKAI', 'laporan_expired', 0],
        ['PEMAKAI', 'rekap_penerimaan', 0],
        ['PEMAKAI', 'rekap_pemakaian', 1],
        ['PEMAKAI', 'arsip', 0],
        ['PEMAKAI', 'pengaturan', 0],
        ['PEMAKAI', 'kelola_pengguna', 0],
    ];

    defaultPermissions.forEach(([role, menu_key, is_visible]) => {
        db.run(
            `INSERT IGNORE INTO role_permissions (role, menu_key, is_visible) VALUES (?, ?, ?)`,
            [role, menu_key, is_visible],
            () => { }
        );
    });
});