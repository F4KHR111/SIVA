const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db");

// initDatabase hanya dijalankan jika di lokal (bukan Vercel) dan MySQL aktif
const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
if (!process.env.VERCEL && !pgUrl) {
    require("./initDatabase");
}

const barangRoutes = require("./routes/barangRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const exportImportRoutes = require("./routes/exportImportRoutes");
const kategoriRoutes = require("./routes/kategoriRoutes");
const lokasiRoutes = require("./routes/lokasiRoutes");
const satuanRoutes = require("./routes/satuanRoutes");
const userRoutes = require("./routes/userRoutes");
const namaBarangRoutes = require("./routes/namaBarangRoutes");
const pemakaianRoutes = require("./routes/pemakaianRoutes");
const settingRoutes = require("./routes/settingRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Helper
const sendHealth = (req, res) => {
    res.json({
        status: "ok",
        message: "SIVA API Backend siap dan berjalan",
        database: db.isPostgres 
            ? "PostgreSQL (Vercel/Cloud)" 
            : (process.env.VERCEL ? "Perhatian: DATABASE_URL belum diset di Vercel" : "MySQL (Lokal)"),
        timestamp: new Date().toISOString()
    });
};

// Root & Health Endpoints
app.get("/", (req, res) => {
    res.json({
        name: "SIVA API Server",
        status: "online",
        database: db.isPostgres 
            ? "PostgreSQL (Vercel Postgres Terhubung)" 
            : (process.env.VERCEL ? "Perhatian: Vercel Postgres Belum Terhubung di Environment Variables" : "MySQL (Lokal)"),
        health: "/api/health",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});
app.get("/health", sendHealth);
app.get("/api/health", sendHealth);

// Daftar modul rute backend
const routeList = [
    ["/auth", authRoutes],
    ["/barang", barangRoutes],
    ["/dashboard", dashboardRoutes],
    ["/data", exportImportRoutes],
    ["/kategori", kategoriRoutes],
    ["/lokasi", lokasiRoutes],
    ["/satuan", satuanRoutes],
    ["/users", userRoutes],
    ["/nama-barang", namaBarangRoutes],
    ["/pemakaian", pemakaianRoutes],
    ["/settings", settingRoutes],
];

// Registrasikan rute dengan awalan /api DAN tanpa /api agar tidak terpengaruh rewrite Vercel
routeList.forEach(([routePath, handler]) => {
    app.use(`/api${routePath}`, handler);
    app.use(routePath, handler);
});


// Serve static frontend files (jika ada build lokal)
app.use(express.static(path.join(__dirname, "public")));

// Fallback: serve index.html untuk SPA production build lokal
const indexPath = path.join(__dirname, "public", "index.html");
if (require("fs").existsSync(indexPath)) {
    app.use((req, res, next) => {
        if (req.method === "GET" && !req.path.startsWith("/api")) {
            res.sendFile(indexPath);
        } else {
            next();
        }
    });
}

// Port
const PORT = process.env.PORT || 3000;

// Jalankan listener HTTP server hanya jika berjalan di lingkungan lokal/server mandiri
if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
    });
    // Keep event loop alive untuk launcher desktop portabel
    setInterval(() => {}, 10000);
}

module.exports = app;