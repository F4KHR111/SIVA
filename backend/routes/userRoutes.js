const express = require("express");
const router = express.Router();
const {
    getUser,
    createUser,
    updateUser,
    deleteUser,
    resetUser2FA,
    getRolePermissions,
    updateRolePermissions,
    getRoleCategoryPermissions,
    updateRoleCategoryPermissions
} = require("../controllers/userController");

router.get("/permissions", getRolePermissions);
router.post("/permissions", updateRolePermissions);

router.get("/category-permissions", getRoleCategoryPermissions);
router.post("/category-permissions", updateRoleCategoryPermissions);

router.get("/", getUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post("/:id/reset-2fa", resetUser2FA);

module.exports = router;
