// Déjalo exactamente así:
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.get("/me", protect, authController.getMe);
router.post("/login", authController.login); // Esta es la ruta que buscamos
router.post("/register", authController.register);
router.put("/update", protect, authController.update);

module.exports = router;
