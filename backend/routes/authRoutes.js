const express = require("express");
const router = express.Router();
const {
    login,
    activateAndLogin2FA,
    verify2FA,
    setup2FA,
    enable2FA,
    disable2FA,
    getProfile
} = require("../controllers/authController");

router.post("/login", login);
router.post("/setup-2fa-activate", activateAndLogin2FA);
router.post("/verify-2fa", verify2FA);
router.get("/2fa/setup", setup2FA);
router.post("/2fa/enable", enable2FA);
router.post("/2fa/disable", disable2FA);
router.get("/me", getProfile);

module.exports = router;
