const express = require("express");
const router = express.Router();

const {
    exportSemuaBarang,
    exportBarangExpired,
    exportArsipBarang,
    exportOpnameStok,
    exportPenerimaanBarang,
    exportKartuStok,
    exportPemakaianBarang,
    openExportsFolder,
    downloadTemplateImportPenerimaan,
    importPenerimaanBarang,
    resetAllInventoryData
} = require("../controllers/exportImportController");

// Export routes
router.get("/export/semua", exportSemuaBarang);
router.get("/export/penerimaan", exportPenerimaanBarang);
router.get("/export/kartu-stok", exportKartuStok);
router.get("/export/pemakaian", exportPemakaianBarang);
router.get("/export/expired", exportBarangExpired);
router.get("/export/arsip", exportArsipBarang);
router.get("/export/opname", exportOpnameStok);
router.get("/export/template-import", downloadTemplateImportPenerimaan);
router.post("/import/penerimaan", importPenerimaanBarang);
router.post("/open-folder", openExportsFolder);
router.post("/reset-all", resetAllInventoryData);

module.exports = router;