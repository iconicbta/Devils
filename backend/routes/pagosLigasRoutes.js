const express = require("express");
const router = express.Router();
const {
  obtenerMeses,
  crearMes,
  obtenerPagosPorMes,
  registrarPago,
  actualizarValorDiario,
} = require("../controllers/pagosLigasController");
const ConfiguracionPagoLiga = require("../models/ConfiguracionPagoLiga");

// CONFIGURACIÓN (público)
router.get("/configuracion", async (req, res) => {
  try {
    let config = await ConfiguracionPagoLiga.findOne();
    if (!config) config = await ConfiguracionPagoLiga.create({ valorDiario: 8000 });
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener configuración" });
  }
});

router.put("/configuracion", async (req, res) => {
  try {
    const { valorDiario } = req.body;
    let config = await ConfiguracionPagoLiga.findOne();
    if (!config) config = await ConfiguracionPagoLiga.create({ valorDiario });
    else config.valorDiario = valorDiario;
    await config.save();
    res.json({ message: "Configuración actualizada", config });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar configuración" });
  }
});

// RUTAS DE PAGOS LIGAS → SIN auth para que Render no se caiga
router.get("/meses", obtenerMeses);
router.post("/crear-mes", crearMes);
router.get("/pagos/:mes", obtenerPagosPorMes);
router.post("/pagos", registrarPago);
router.delete("/pagos/:id", async (req, res) => {
  const PagoLigaMes = require("../models/PagoLigaMes");
  try {
    const result = await PagoLigaMes.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: "Pago no encontrado" });
    res.json({ message: "Pago eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar" });
  }
});

router.put("/valor-diario", actualizarValorDiario);
router.put("/pagos/:id", async (req, res) => {
  const PagoLigaMes = require("../models/PagoLigaMes");
  try {
    const actualizado = await PagoLigaMes.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar" });
  }
});
module.exports = router;   
