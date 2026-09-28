const app = require("../index");

module.exports = (req, res) => {
    // Normalisasi req.url jika Vercel Serverless Function menyertakan prefix path fungsi
    if (req.url.startsWith("/api/index.js")) {
        req.url = req.url.replace(/^\/api\/index\.js/, "") || "/";
    }
    return app(req, res);
};
