const Pago = require("../models/Pago");
const PagoLigaMes = require("../models/PagoLigaMes");
const PagaMes = require("../models/pagaMesModels");

// ================= RESUMEN GENERAL =================
const resumenGeneral = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: "fechaInicio y fechaFin son requeridos" });
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);

    // -------- PRODUCTOS --------
    const pagosProductos = await Pago.find({
      estado: "Completado",
      createdAt: { $gte: start, $lte: end }
    });

    let productos = { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 };

    pagosProductos.forEach(p => {
      const monto = Number(p.monto) || 0;
      productos.total += monto;

      const met = (p.metodoPago || "").toLowerCase().trim();
      if (met === "efectivo") productos.efectivo += monto;
      else if (met === "transferencia" || met === "nequi") productos.transferencia += monto;
      else if (met === "tarjeta") productos.tarjeta += monto;
    });

    // -------- LIGAS --------
    const pagosLigas = await PagoLigaMes.find({
      tipoPago: { $ne: "SYSTEM" },
      createdAt: { $gte: start, $lte: end }
    });

    let ligas = { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 };

    pagosLigas.forEach(p => {
      const monto = Number(p.total) || 0;
      ligas.total += monto;

      const met = (p.tipoPago || "").toLowerCase().trim();
      if (met === "efectivo") ligas.efectivo += monto;
      else if (met === "transferencia" || met === "nequi") ligas.transferencia += monto;
      else if (met === "tarjeta") ligas.tarjeta += monto;
    });

    // -------- MENSUALIDADES (CON FIX DE LIGAS MAL GUARDADAS) --------
    const pagosMensualidades = await PagaMes.find({
      nombre: { $ne: "SYSTEM" },
      tipoPago: { $ne: "SYSTEM" },
      createdAt: { $gte: start, $lte: end }
    });

    let mensualidades = { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 };

    pagosMensualidades.forEach(p => {
      const monto = Number(p.total) || 0;
      const met = (p.tipoPago || "").toLowerCase().trim();

      // 🔥 FIX: si vienen como ligas, las sumamos en ligas
      mensualidades.total += monto;

if (met === "efectivo") mensualidades.efectivo += monto;
else if (met === "transferencia" || met === "nequi") mensualidades.transferencia += monto;
else if (met === "tarjeta") mensualidades.tarjeta += monto;
    });

    res.json({
      ligas,
      mensualidades,
      productos,
      totalGeneral: productos.total + ligas.total + mensualidades.total
    });

  } catch (error) {
    console.error("Error resumen general:", error);
    res.status(500).json({ message: "Error al generar resumen general" });
  }
};

// ================= CIERRE DIARIO =================
const cierreDiario = async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ message: "fecha es requerida" });
    }

    // 🔥 FIX REAL: usar UTC
    const start = new Date(`${fecha}T00:00:00.000Z`);
    const end = new Date(`${fecha}T23:59:59.999Z`);

    console.log("📅 Fecha:", fecha);
    console.log("🕐 Rango UTC:", start.toISOString(), "-", end.toISOString());

    const filter = { createdAt: { $gte: start, $lte: end } };

    // -------- PRODUCTOS --------
    const pProd = await Pago.find({ ...filter, estado: "Completado" });

    let productos = { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 };

    pProd.forEach(p => {
      const m = Number(p.monto) || 0;
      productos.total += m;

      const met = (p.metodoPago || "").toLowerCase().trim();
      if (met === "efectivo") productos.efectivo += m;
      else if (met === "transferencia" || met === "nequi") productos.transferencia += m;
      else if (met === "tarjeta") productos.tarjeta += m;
    });

    // -------- LIGAS --------
    const pLig = await PagoLigaMes.find({ ...filter, tipoPago: { $ne: "SYSTEM" } });

    let ligas = { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 };

    pLig.forEach(p => {
      const m = Number(p.total) || 0;
      ligas.total += m;

      const met = (p.tipoPago || "").toLowerCase().trim();
      if (met === "efectivo") ligas.efectivo += m;
      else if (met === "transferencia" || met === "nequi") ligas.transferencia += m;
      else if (met === "tarjeta") ligas.tarjeta += m;
    });

    // -------- MENSUALIDADES (CON FIX) --------
    const pMens = await PagaMes.find({
      ...filter,
      nombre: { $ne: "SYSTEM" },
      tipoPago: { $ne: "SYSTEM" }
    });

    let mensualidades = { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 };

    pMens.forEach(p => {
      const m = Number(p.total) || 0;
      const met = (p.tipoPago || "").toLowerCase().trim();

      mensualidades.total += m;

if (met === "efectivo") mensualidades.efectivo += m;
else if (met === "transferencia" || met === "nequi") mensualidades.transferencia += m;
else if (met === "tarjeta") mensualidades.tarjeta += m;
    });

    console.log("📊 Productos:", pProd.length);
    console.log("📊 Ligas:", pLig.length);
    console.log("📊 Mensualidades:", pMens.length);

    res.json({
      fecha,
      ligas,
      mensualidades,
      productos,
      totalDia: productos.total + ligas.total + mensualidades.total
    });

  } catch (error) {
    console.error("Error cierre diario:", error);
    res.status(500).json({ message: "Error cierre diario" });
  }
};

module.exports = {
  resumenGeneral,
  cierreDiario
};
