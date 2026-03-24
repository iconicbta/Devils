const mongoose = require("mongoose");

const pagaMesSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, uppercase: true },
  equipo: { type: String, default: "Ligas" },
  anio: { type: String, required: true }, // Aquí guardaremos el mes (ej: "Marzo 2026")
  plan: { type: String, default: "Ligas" },
  total: { type: Number, required: true },
  mesesPagados: { type: [String], default: [] },
  // 🚀 AGREGA ESTOS DOS:
  diasAsistidos: { type: Number, default: 0 },
  diasPagados: { type: Array, default: [] }, 
  tipoPago: { type: String, default: 'Efectivo' },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("PagaMes", pagaMesSchema);
