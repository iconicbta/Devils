const mongoose = require("mongoose");

const pagoSchema = new mongoose.Schema({
  // 🔹 Cliente (opcional para pago rápido)
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cliente",
    required: false,
  },
  clienteManual: {
    type: String,
  },

  // 🔹 Producto (opcional para pago rápido)
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Producto",
    required: false,
  },
  productoManual: {
    type: String,
  },

  // 🔹 Cantidad (default para pago rápido)
  cantidad: {
    type: Number,
    required: false,
    default: 1,
  },

  // 🔹 Datos obligatorios
  monto: {
    type: Number,
    required: true,
  },
  fecha: {
    type: Date,
    required: true,
  },
  metodoPago: {
    type: String,
    required: true,
  },

  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  estado: {
    type: String,
    default: "Completado",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔹 Middleware
pagoSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

pagoSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model("Pago", pagoSchema);
