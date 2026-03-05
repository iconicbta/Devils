const express = require("express");
const router = express.Router();
const { 
    obtenerAnios, 
    crearAnio, 
    obtenerPagosPorAnio, 
    registrarPagoMes 
} = require("../controllers/pagaMesController");

/* 🔹 Permitir preflight OPTIONS */
router.options("*", (req, res) => {
    res.sendStatus(200);
});

router.get("/anios", obtenerAnios);
router.post("/crear-anio", crearAnio);
router.get("/pagos/:anio", obtenerPagosPorAnio);
router.post("/pagos", registrarPagoMes);

module.exports = router;
