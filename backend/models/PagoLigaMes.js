const mongoose = require("mongoose");

const pagoLigaMesSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, uppercase: true },
  equipo: { type: String, default: "Ligas" },
  mes: { type: String, required: true },
  diasAsistidos: { type: Number, required: true },
  total: { type: Number, required: true },
  valorDiarioUsado: { type: Number },
  diasPagados: [
  {
    dia: Number,
    tipo: String, // HOY | ATRASADO | ADELANTADO
  }
],
  tipoPago: { // 🆕 CAMBIO CLAVE
      type: String, 
      enum: ['Efectivo', 'Nequi', 'SYSTEM'], 
      default: 'Efectivo' 
    },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PagoLigaMes", pagoLigaMesSchema);  
