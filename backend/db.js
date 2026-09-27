const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const isPostgres = Boolean(pgUrl && (pgUrl.startsWith("postgres://") || pgUrl.startsWith("postgresql://")));

let db;

if (isPostgres) {
    // ==============================================================
    // KONFIGURASI POSTGRESQL (Vercel Postgres / Neon / Supabase)
    // ==============================================================
    const { Pool } = require("pg");
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL;

    const pool = new Pool({
        connectionString: pgUrl,
        ssl: pgUrl.includes("sslmode=require") || isProduction
            ? { rejectUnauthorized: false }
            : false,
        max: 10,
        idleTimeoutMillis: 30000
    });

    pool.on("error", (err) => {
        console.error("PostgreSQL Pool Error:", err.message);
    });

    // Helper untuk mentranslasikan query MySQL/SQLite ke PostgreSQL
    function convertSqliteToPostgres(sql) {
        if (!sql || typeof sql !== "string") return sql;
        let paramIndex = 1;
        let s = sql.replace(/\?/g, () => `$${paramIndex++}`);
        s = s.replace(/INSERT\s+(?:OR\s+)?IGNORE\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, "INSERT INTO $1 ($2) VALUES ($3) ON CONFLICT DO NOTHING");
        s = s.replace(/DATE\('now'\)/gi, "CURRENT_DATE");
        s = s.replace(/CURDATE\(\)/gi, "CURRENT_DATE");
        s = s.replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");
        s = s.replace(/MAX\(\s*0\s*,/gi, "GREATEST(0,");
        s = s.replace(/DATE_FORMAT\(([^,]+),\s*['"]%Y-%m['"]\)/gi, "TO_CHAR($1, 'YYYY-MM')");
        s = s.replace(/strftime\('%Y-%m',\s*COALESCE\(([^,]+),\s*([^)]+)\)\)/gi, "TO_CHAR(COALESCE($1, $2), 'YYYY-MM')");
        s = s.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY-MM')");
        return s;
    }

    db = {
        isPostgres: true,
        pool,

        all(sql, params, callback) {
            if (typeof params === "function") {
                callback = params;
                params = [];
            }
            params = params || [];
            const convertedSql = convertSqliteToPostgres(sql);

            pool.query(convertedSql, params)
                .then((res) => {
                    if (typeof callback === "function") {
                        callback(null, res.rows || []);
                    }
                })
                .catch((err) => {
                    if (err && (err.code === "23505" || err.code === "ER_DUP_ENTRY")) {
                        err.message = (err.message || "") + " UNIQUE constraint failed";
                    }
                    console.error("Error SQL Postgres (all):", err.message, "| SQL:", convertedSql);
                    if (typeof callback === "function") {
                        callback(err, []);
                    }
                });
        },

        get(sql, params, callback) {
            if (typeof params === "function") {
                callback = params;
                params = [];
            }
            params = params || [];
            const convertedSql = convertSqliteToPostgres(sql);

            pool.query(convertedSql, params)
                .then((res) => {
                    const row = res.rows && res.rows.length > 0 ? res.rows[0] : null;
                    if (typeof callback === "function") {
                        callback(null, row);
                    }
                })
                .catch((err) => {
                    if (err && (err.code === "23505" || err.code === "ER_DUP_ENTRY")) {
                        err.message = (err.message || "") + " UNIQUE constraint failed";
                    }
                    console.error("Error SQL Postgres (get):", err.message, "| SQL:", convertedSql);
                    if (typeof callback === "function") {
                        callback(err, null);
                    }
                });
        },

        run(sql, params, callback) {
            if (typeof params === "function") {
                callback = params;
                params = [];
            }
            params = params || [];
            let convertedSql = convertSqliteToPostgres(sql);

            // Jika query berupa INSERT dan belum memiliki RETURNING, tambahkan RETURNING id
            const isInsert = /^\s*INSERT\s+INTO/i.test(convertedSql);
            if (isInsert && !/RETURNING/i.test(convertedSql)) {
                convertedSql += " RETURNING id";
            }

            pool.query(convertedSql, params)
                .then((res) => {
                    const lastID = res.rows && res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : 0;
                    const changes = res.rowCount || 0;
                    if (typeof callback === "function") {
                        callback.call({ lastID, changes }, null);
                    }
                })
                .catch((err) => {
                    if (err && (err.code === "23505" || err.code === "ER_DUP_ENTRY")) {
                        err.message = (err.message || "") + " UNIQUE constraint failed";
                    }
                    console.error("Error SQL Postgres (run):", err.message, "| SQL:", convertedSql);
                    if (typeof callback === "function") {
                        callback.call({ lastID: 0, changes: 0 }, err);
                    }
                });
        },

        serialize(fn) {
            if (typeof fn === "function") {
                fn();
            }
        }
    };

    console.log("Database driver: PostgreSQL (Vercel Postgres / Cloud)");
} else {
    // ==============================================================
    // KONFIGURASI MYSQL (Lokal / XAMPP)
    // ==============================================================
    const mysql = require("mysql2");

    const dbConfig = {
        host: process.env.DB_HOST || "127.0.0.1",
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "Keluarga123",
        database: process.env.DB_NAME || "inventaris_db",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    // Buat database jika belum ada
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
            console.error("Gagal membuat/memeriksa database MySQL:", err.message);
        } else {
            console.log(`Database MySQL "${dbConfig.database}" siap digunakan.`);
        }
        initConn.end();
    });

    const pool = mysql.createPool(dbConfig);
    const promisePool = pool.promise();

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

    db = {
        isPostgres: false,
        pool: promisePool,
        rawPool: pool,

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
                    console.error("Error SQL MySQL (all):", err.message, "| SQL:", convertedSql);
                    if (typeof callback === "function") {
                        callback(err, []);
                    }
                });
        },

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
                    console.error("Error SQL MySQL (get):", err.message, "| SQL:", convertedSql);
                    if (typeof callback === "function") {
                        callback(err, null);
                    }
                });
        },

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
                    console.error("Error SQL MySQL (run):", err.message, "| SQL:", convertedSql);
                    if (typeof callback === "function") {
                        callback.call({ lastID: 0, changes: 0 }, err);
                    }
                });
        },

        serialize(fn) {
            if (typeof fn === "function") {
                fn();
            }
        }
    };

    console.log("Database driver: MySQL (Lokal)");
}

module.exports = db;