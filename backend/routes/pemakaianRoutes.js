const express = require("express");
const router = express.Router();
const { getPemakaian, getNextNoOrder, tambahPemakaian, updatePemakaian, hapusPemakaian } = require("../controllers/pemakaianController");

router.get("/", getPemakaian);
router.get("/next-no-order", getNextNoOrder);
router.post("/", tambahPemakaian);
router.put("/:id", updatePemakaian);
router.delete("/:id", hapusPemakaian);

module.exports = router;
