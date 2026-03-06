// backend/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Esquema de usuario
const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Por favor, ingrese un correo electrónico válido",
      ],
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
    },
    rol: {
      type: String,
      enum: ["user", "admin", "entrenador" , "recepcionista"],
      default: "user",
    },
  },
  { timestamps: true, collection: "usuarios" }
);

// Encripta la contraseña antes de guardar si ha sido modificada o es nueva
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar la contraseña ingresada con la guardada
userSchema.methods.compararPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);

