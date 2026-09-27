const express = require("express");
const router = express.Router();

const {
    tambahBarang,
    getSemuaBarang,
    getBarangExpired,
    getArsip,
    cariBarang,
    getBarangByKode,
    updateBarang,
    hapusBarang,
    arsipkanBarang,
    pulihkanBarang,
    getNextNoPenerimaan,
    createBatchPenerimaan,
    getBarangByNoPenerimaan,
    updateBatchPenerimaan,
    arsipkanBatchPenerimaan,
    pulihkanBatchPenerimaan,
    getKartuStok
} = require("../controllers/barangController");

// ======================
// KARTU STOK
// ======================
router.get("/kartu-stok", getKartuStok);

// ======================
// NEXT NO PENERIMAAN & BATCH
// ======================
router.get("/next-no-penerimaan", getNextNoPenerimaan);
router.post("/batch", createBatchPenerimaan);
router.get("/penerimaan/:no_penerimaan", getBarangByNoPenerimaan);
router.put("/batch/:no_penerimaan", updateBatchPenerimaan);

// ======================
// CRUD
// ======================
router.post("/", tambahBarang);

router.get("/", getSemuaBarang);

// ======================
// SEARCH
// ======================
router.get("/search", cariBarang);

// ======================
// BARANG EXPIRED
// ======================
router.get("/expired", getBarangExpired);

// ======================
// ARSIP
// ======================
router.get("/arsip", getArsip);

router.put("/arsip-penerimaan/:no_penerimaan", arsipkanBatchPenerimaan);
router.put("/pulihkan-penerimaan/:no_penerimaan", pulihkanBatchPenerimaan);
router.put("/arsip/:kode_produk", arsipkanBarang);
router.put("/pulihkan/:kode_produk", pulihkanBarang);

// ======================
// DETAIL
// ======================
router.get("/:kode_produk", getBarangByKode);

// ======================
// UPDATE
// ======================
router.put("/:kode_produk", updateBarang);

// ======================
// DELETE
// ======================
router.delete("/:kode_produk", hapusBarang);

module.exports = router;