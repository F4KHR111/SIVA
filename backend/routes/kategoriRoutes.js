const express = require("express");
const router = express.Router();
const {
    getKategori,
    createKategori,
    deleteKategori,
    getSubKategori,
    createSubKategori,
    deleteSubKategori
} = require("../controllers/kategoriController");

router.get("/", getKategori);
router.post("/", createKategori);
router.delete("/:id", deleteKategori);

// Sub Kategori Routes
router.get("/sub", getSubKategori);
router.post("/sub", createSubKategori);
router.delete("/sub/:id", deleteSubKategori);

module.exports = router;
