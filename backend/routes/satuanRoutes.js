const express = require("express");
const router = express.Router();
const { getSatuan, createSatuan, deleteSatuan } = require("../controllers/satuanController");

router.get("/", getSatuan);
router.post("/", createSatuan);
router.delete("/:id", deleteSatuan);

module.exports = router;
