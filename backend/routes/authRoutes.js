const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// @desc    Obtener datos del usuario autenticado
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, authController.getMe);

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Public
router.post("/login", authController.login);

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
// @access  Public
router.post("/register", authController.register);

// @desc    Actualizar datos del usuario autenticado
// @route   PUT /api/auth/update
// @access  Private
router.put("/update", protect, authController.update);

module.exports = router;
