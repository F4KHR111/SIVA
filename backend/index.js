const express = require("express");
const cors = require("cors");

const db = require("./db");
require("./initDatabase");

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

// Serve static frontend files
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));

// Fallback: serve index.html untuk SPA production build
// (Hanya aktif jika folder public/index.html ada)
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
const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
});

// Keep event loop alive
setInterval(() => {}, 10000);