const express = require("express");
const router = express.Router();
const { getNamaBarang, createNamaBarang, updateNamaBarang, deleteNamaBarang } = require("../controllers/namaBarangController");

router.get("/", getNamaBarang);
router.post("/", createNamaBarang);
router.put("/:id", updateNamaBarang);
router.delete("/:id", deleteNamaBarang);

module.exports = router;
