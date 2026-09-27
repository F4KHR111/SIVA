const express = require("express");
const router = express.Router();
const { getLokasi, createLokasi, deleteLokasi } = require("../controllers/lokasiController");

router.get("/", getLokasi);
router.post("/", createLokasi);
router.delete("/:id", deleteLokasi);

module.exports = router;
