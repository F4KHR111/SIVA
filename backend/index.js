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

// Root Endpoint (Tampilan saat membuka URL backend langsung di browser)
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

// Health Check Endpoint (berguna untuk verifikasi deployment Vercel)
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "SIVA API Backend siap dan berjalan",
        database: db.isPostgres 
            ? "PostgreSQL (Vercel/Cloud)" 
            : (process.env.VERCEL ? "Perhatian: DATABASE_URL belum diset di Vercel" : "MySQL (Lokal)"),
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/barang", barangRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/data", exportImportRoutes);
app.use("/api/kategori", kategoriRoutes);
app.use("/api/lokasi", lokasiRoutes);
app.use("/api/satuan", satuanRoutes);
app.use("/api/users", userRoutes);
app.use("/api/nama-barang", namaBarangRoutes);
app.use("/api/pemakaian", pemakaianRoutes);
app.use("/api/settings", settingRoutes);

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