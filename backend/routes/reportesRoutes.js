const express = require("express");
const router = express.Router();

const { resumenGeneral, cierreDiario } = require("../controllers/reportesController");

// ✅ EXISTENTE
router.get("/resumen-general", resumenGeneral);

// 🔥 ESTO ES LO QUE TE FALTA
router.get("/cierre-diario", cierreDiario);

module.exports = router;
