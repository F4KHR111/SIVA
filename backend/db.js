const mysql = require("mysql2");

// Konfigurasi MySQL
const dbConfig = {
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "Keluarga123",
    database: "inventaris_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Buat database jika belum ada menggunakan sync/async connection awal
const initConn = mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
});

initConn.on("error", (err) => {
    console.error("MySQL Init Connection Error:", err.message);
});

initConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``, (err) => {
    if (err) {
        console.error("Gagal membuat/memeriksa database inventaris_db:", err.message);
    } else {
        console.log(`Database MySQL "${dbConfig.database}" siap digunakan.`);
    }
    initConn.end();
});

// Pool koneksi MySQL
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Helper untuk mentranslasikan kueri SQLite ke MySQL secara otomatis
function convertSqliteToMysql(sql) {
    if (!sql || typeof sql !== "string") return sql;
    return sql
        .replace(/PRAGMA\s+table_info\(([^)]+)\)/gi, "SHOW COLUMNS FROM $1")
        .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT IGNORE INTO")
        .replace(/DATE\('now'\)/gi, "CURDATE()")
        .replace(/strftime\('%Y-%m',\s*COALESCE\(([^,]+),\s*([^)]+)\)\)/gi, "DATE_FORMAT(COALESCE($1, $2), '%Y-%m')")
        .replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "DATE_FORMAT($1, '%Y-%m')")
        .replace(/MAX\(\s*0\s*,/gi, "GREATEST(0,");
}

// Wrapper kompatibel SQLite → MySQL
const db = {
    pool: promisePool,
    rawPool: pool,

    // db.all(sql, [params], callback)
    all(sql, params, callback) {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];
        const convertedSql = convertSqliteToMysql(sql);

        promisePool.query(convertedSql, params)
            .then(([rows]) => {
                if (typeof callback === "function") {
                    callback(null, rows);
                }
            })
            .catch((err) => {
                if (err && err.code === "ER_DUP_ENTRY") {
                    err.message = (err.message || "") + " UNIQUE constraint failed";
                }
                console.error("Error SQL (all):", err.message, "| SQL:", convertedSql);
                if (typeof callback === "function") {
                    callback(err, []);
                }
            });
    },

    // db.get(sql, [params], callback)
    get(sql, params, callback) {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];
        const convertedSql = convertSqliteToMysql(sql);

        promisePool.query(convertedSql, params)
            .then(([rows]) => {
                const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
                if (typeof callback === "function") {
                    callback(null, row);
                }
            })
            .catch((err) => {
                if (err && err.code === "ER_DUP_ENTRY") {
                    err.message = (err.message || "") + " UNIQUE constraint failed";
                }
                console.error("Error SQL (get):", err.message, "| SQL:", convertedSql);
                if (typeof callback === "function") {
                    callback(err, null);
                }
            });
    },

    // db.run(sql, [params], callback)
    run(sql, params, callback) {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }
        params = params || [];
        const convertedSql = convertSqliteToMysql(sql);

        promisePool.query(convertedSql, params)
            .then(([result]) => {
                const context = {
                    lastID: result ? result.insertId : 0,
                    changes: result ? result.affectedRows : 0
                };
                if (typeof callback === "function") {
                    callback.call(context, null);
                }
            })
            .catch((err) => {
                if (err && err.code === "ER_DUP_ENTRY") {
                    err.message = (err.message || "") + " UNIQUE constraint failed";
                }
                console.error("Error SQL (run):", err.message, "| SQL:", convertedSql);
                if (typeof callback === "function") {
                    callback.call({ lastID: 0, changes: 0 }, err);
                }
            });
    },

    // db.serialize(fn)
    serialize(fn) {
        if (typeof fn === "function") {
            fn();
        }
    }
};

module.exports = db;