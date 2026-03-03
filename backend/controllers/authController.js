const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Registrar un nuevo usuario
const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
      return res
        .status(400)
        .json({ message: "Nombre, email y contraseña son requeridos" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      nombre,
      email,
      password: hashedPassword,
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
    console.error("Error al registrar usuario:", error.message);
    res.status(500).json({
      message: "Error al registrar usuario",
      detalle: error.message,
    });
  }
};

// Iniciar sesión
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Estos logs aparecerán en el panel de RENDER cuando intentes entrar
    console.log("📩 Intento de login con:", email); 

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y contraseña son requeridos" });
    }

    // Busqueda insensible a mayúsculas/minúsculas
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') }).select("+password");
    
    if (!user) {
      console.log("❌ Usuario no encontrado en la base de datos");
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log("❌ La contraseña no coincide");
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user._id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    console.log("✅ Login exitoso para:", user.email);

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
    console.error("🔥 Error crítico en login:", error.message);
    res.status(500).json({
      message: "Error al iniciar sesión",
      detalle: error.message,
    });
  }
};

// Obtener los datos del usuario autenticado
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json({
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    });
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error.message);
    res.status(500).json({
      message: "Error al obtener datos del usuario",
      detalle: error.message,
    });
  }
};

// Actualizar datos del usuario autenticado
const update = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (nombre) user.nombre = nombre;
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res.status(400).json({ message: "El email ya está en uso" });
      }
      user.email = email;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
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
    console.error("Error al actualizar usuario:", error.message);
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
