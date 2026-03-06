// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { protect, verificarPermisos } = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * RUTA TEMPORAL: CREAR USUARIO (sin protección)
 * Usar solo para crear el primer admin. Después eliminar o comentar.
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "nombre, email y password son requeridos" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const nuevo = new User({
  nombre,
  email,
  password,
  rol: rol || "user",
});

    await nuevo.save();

    const token = jwt.sign({ id: nuevo._id, rol: nuevo.rol }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(201).json({
      message: "Usuario creado",
      token,
      user: {
        id: nuevo._id,
        nombre: nuevo.nombre,
        email: nuevo.email,
        rol: nuevo.rol,
      },
    });
  })
);

/** RUTAS PROTEGIDAS (solo admin) */
router.get(
  "/",
  protect,
  verificarPermisos(["admin"]),
  asyncHandler(async (req, res) => {
    const usuarios = await User.find().select("-password").lean();
    res.json(usuarios);
  })
);

router.put(
  "/:id",
  protect,
  verificarPermisos(["admin"]),
  asyncHandler(async (req, res) => {
    const usuario = await User.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    usuario.nombre = req.body.nombre || usuario.nombre;
    usuario.email = req.body.email || usuario.email;
    usuario.rol = req.body.rol || usuario.rol;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(req.body.password, salt);
    }

    const updated = await usuario.save();
    res.json({
      message: "Usuario actualizado",
      user: {
        id: updated._id,
        nombre: updated.nombre,
        email: updated.email,
        rol: updated.rol,
      },
    });
  })
);

router.delete(
  "/:id",
  protect,
  verificarPermisos(["admin"]),
  asyncHandler(async (req, res) => {
    const usuario = await User.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    await usuario.deleteOne();
    res.json({ message: "Usuario eliminado" });
  })
);

module.exports = router;

