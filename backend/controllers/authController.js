const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ======================
// REGISTRAR USUARIO
// ======================
const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        message: "Nombre, email y contraseña son requeridos",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "El email ya está registrado",
      });
    }

    // 🚨 IMPORTANTE: SIN HASH AQUÍ
    const user = new User({
      nombre,
      email,
      password, // el modelo se encarga del hash
      rol: rol || "user",
    });

    const savedUser = await user.save();

    const token = jwt.sign(
      { id: savedUser._id, rol: savedUser.rol },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        nombre: savedUser.nombre,
        email: savedUser.email,
        rol: savedUser.rol,
      },
    });
  } catch (error) {
    console.error("🔥 Error en register:", error);
    res.status(500).json({
      message: "Error al registrar usuario",
      detalle: error.message,
    });
  }
};

// ======================
// LOGIN
// ======================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("📩 Email recibido:", email);
    console.log("🔑 Password recibido:", password);

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son requeridos",
      });
    }

    const user = await User.findOne({
      email: new RegExp(`^${email}$`, "i"),
    });

    if (!user) {
      console.log("❌ Usuario no encontrado");
      return res.status(400).json({
        message: "Credenciales inválidas",
      });
    }

    console.log("🧠 Password en BD:", user.password);

    // ✅ usar método del modelo
    const isMatch = await user.compararPassword(password);

    console.log("✅ Resultado compare:", isMatch);

    if (!isMatch) {
      console.log("❌ La contraseña no coincide");
      return res.status(400).json({
        message: "Credenciales inválidas",
      });
    }

    const token = jwt.sign(
      { id: user._id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    console.log("✅ Login exitoso:", user.email);

    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("🔥 Error en login:", error);
    res.status(500).json({
      message: "Error al iniciar sesión",
      detalle: error.message,
    });
  }
};

// ======================
// GET ME
// ======================
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    res.json({
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    });
  } catch (error) {
    console.error("Error en getMe:", error);
    res.status(500).json({
      message: "Error al obtener datos del usuario",
      detalle: error.message,
    });
  }
};

// ======================
// UPDATE
// ======================
const update = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    if (nombre) user.nombre = nombre;

    if (email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: userId },
      });

      if (emailExists) {
        return res.status(400).json({
          message: "El email ya está en uso",
        });
      }

      user.email = email;
    }

    // 🚨 SIN HASH AQUÍ
    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({
      message: "Usuario actualizado con éxito",
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error en update:", error);
    res.status(500).json({
      message: "Error al actualizar usuario",
      detalle: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  update,
};
