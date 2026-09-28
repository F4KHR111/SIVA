const bcrypt = require("bcryptjs");

async function initPostgres(pool) {
    console.log("Memulai auto-init PostgreSQL...");
    
    // 1. Buat tabel-tabel satu per satu secara berurutan dan aman
    const tables = [
        `CREATE TABLE IF NOT EXISTS barang (
            id SERIAL PRIMARY KEY,
            kode_produk VARCHAR(255) NOT NULL,
            nama_produk VARCHAR(255) NOT NULL,
            kategori VARCHAR(255) NOT NULL,
            sub_kategori VARCHAR(255) DEFAULT '',
            satuan VARCHAR(255) NOT NULL,
            jumlah INTEGER NOT NULL,
            tanggal_expired VARCHAR(255) NOT NULL,
            tanggal_masuk VARCHAR(255),
            lokasi VARCHAR(255),
            penerima VARCHAR(255) DEFAULT '',
            is_no_expired INTEGER DEFAULT 0,
            is_arsip INTEGER DEFAULT 0,
            no_penerimaan VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS kategori (
            id SERIAL PRIMARY KEY,
            nama_kategori VARCHAR(255) NOT NULL UNIQUE
        )`,
        `CREATE TABLE IF NOT EXISTS lokasi (
            id SERIAL PRIMARY KEY,
            nama_lokasi VARCHAR(255) NOT NULL UNIQUE
        )`,
        `CREATE TABLE IF NOT EXISTS satuan (
            id SERIAL PRIMARY KEY,
            nama_satuan VARCHAR(255) NOT NULL UNIQUE
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) DEFAULT '',
            password VARCHAR(255) NOT NULL,
            nama VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'OPERATOR_INVENTARIS',
            status VARCHAR(20) DEFAULT 'active',
            totp_secret VARCHAR(255),
            is_2fa_enabled INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS nama_barang (
            id SERIAL PRIMARY KEY,
            kode VARCHAR(255) DEFAULT '',
            nama VARCHAR(255) NOT NULL UNIQUE,
            kategori VARCHAR(255) DEFAULT '',
            sub_kategori VARCHAR(255) DEFAULT '',
            satuan VARCHAR(255) DEFAULT '',
            lokasi VARCHAR(255) DEFAULT ''
        )`,
        `CREATE TABLE IF NOT EXISTS pemakaian (
            id SERIAL PRIMARY KEY,
            no_order VARCHAR(255) DEFAULT '',
            kode_produk VARCHAR(255) NOT NULL,
            nama_produk VARCHAR(255) NOT NULL,
            jumlah INTEGER NOT NULL,
            tanggal_pemakaian VARCHAR(255) NOT NULL,
            penerima VARCHAR(255) DEFAULT '',
            keterangan TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS sub_kategori (
            id SERIAL PRIMARY KEY,
            kategori_id INTEGER NOT NULL,
            nama_sub_kategori VARCHAR(255) NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS pengaturan (
            key_name VARCHAR(255) PRIMARY KEY,
            value_text TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role VARCHAR(50) NOT NULL,
            menu_key VARCHAR(100) NOT NULL,
            is_visible INTEGER DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS role_categories (
            id SERIAL PRIMARY KEY,
            role VARCHAR(50) NOT NULL,
            nama_kategori VARCHAR(255) NOT NULL
        )`
    ];

    for (const sql of tables) {
        await pool.query(sql);
    }

    // 2. Cek apakah akun admin sudah terdaftar, jika belum lakukan seeding otomatis
    const userCheck = await pool.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    if (userCheck.rows.length === 0) {
        const adminHash = bcrypt.hashSync("admin123", 10);
        const operatorHash = bcrypt.hashSync("operator123", 10);

        await pool.query(`
            INSERT INTO users (username, email, password, nama, role, status) VALUES
            ('admin', 'admin@gedungagung.id', $1, 'Administrator Sistem', 'ADMIN', 'active'),
            ('operator_inv', 'inventaris@gedungagung.id', $2, 'Petugas Inventaris', 'OPERATOR_INVENTARIS', 'active'),
            ('operator_poli', 'poliklinik@gedungagung.id', $2, 'Petugas Poliklinik', 'OPERATOR_POLIKLINIK', 'active')
            ON CONFLICT (username) DO NOTHING
        `, [adminHash, operatorHash]);
        console.log("PostgreSQL auto-seed akun admin & operator berhasil dibuat!");
    }

    console.log("PostgreSQL schema verification siap.");
    return { success: true, message: "Semua tabel dan akun admin siap." };
}

module.exports = initPostgres;
