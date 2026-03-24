// backend/controllers/userController.js
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

/**
 * Obtener todos los usuarios (admin)
 */
exports.obtenerUsuarios = asyncHandler(async (req, res) => {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ message: "No tienes permiso" });
  }
  const usuarios = await User.find().select("-password").lean();
  res.json(usuarios);
});

/**
 * Actualizar usuario (admin)
 */
exports.actualizarUsuario = asyncHandler(async (req, res) => {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ message: "No tienes permiso" });
  }

  const usuario = await User.findById(req.params.id);
  if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

  usuario.nombre = req.body.nombre || usuario.nombre;
  usuario.email = req.body.email || usuario.email;
  usuario.rol = req.body.rol || usuario.rol;
  if (req.body.password) {
    const user = new User({
  nombre,
  email,
  password, // SIN HASH
  rol: rol || "user",
});
  }

  const actualizado = await usuario.save();
  res.json({ message: "Usuario actualizado", user: actualizado });
});

/**
 * Eliminar usuario (admin)
 */
exports.eliminarUsuario = asyncHandler(async (req, res) => {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ message: "No tienes permiso" });
  }

  const usuario = await User.findById(req.params.id);
  if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

  await usuario.deleteOne();
  res.json({ message: "Usuario eliminado" });
});
