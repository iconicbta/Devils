const Pago = require("../models/Pago");
const PagoLigaMes = require("../models/PagoLigaMes");
const PagaMes = require("../models/pagaMesModels");

const resumenGeneral = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: "Fechas requeridas" });
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    end.setHours(23,59,59,999);

    // 🔹 PAGOS (USAR fecha)
    const pagos = await Pago.find({
      estado: "Completado",
      fecha: { $gte: start, $lte: end }
    });

    let productos = { total:0, efectivo:0, transferencia:0, tarjeta:0 };

    pagos.forEach(p => {
      const monto = Number(p.monto) || 0;
      productos.total += monto;

      if(p.metodoPago === "Efectivo") productos.efectivo += monto;
      else if(p.metodoPago === "Transferencia") productos.transferencia += monto;
      else if(p.metodoPago === "Tarjeta") productos.tarjeta += monto;
    });

    // 🔹 LIGAS
    const ligasData = await PagoLigaMes.find({
      tipoPago: { $ne:"SYSTEM" },
      createdAt: { $gte:start, $lte:end }
    });

    let ligas = { total:0, efectivo:0, transferencia:0, tarjeta:0 };

    ligasData.forEach(p => {
      const monto = Number(p.total) || 0;
      ligas.total += monto;

      const metodo = (p.tipoPago || "").toLowerCase();

      if(metodo === "efectivo") ligas.efectivo += monto;
      else if(metodo === "nequi" || metodo === "transferencia") ligas.transferencia += monto;
      else if(metodo === "tarjeta") ligas.tarjeta += monto;
    });

    // 🔹 MENSUALIDADES
    const mensualidadesData = await PagaMes.find({
      tipoPago: { $ne:"SYSTEM" },
      createdAt: { $gte:start, $lte:end }
    });

    let mensualidades = { total:0, efectivo:0, transferencia:0, tarjeta:0 };

    mensualidadesData.forEach(p => {
      const monto = Number(p.total) || 0;
      mensualidades.total += monto;

      const metodo = (p.tipoPago || "").toLowerCase();

      if(metodo === "efectivo") mensualidades.efectivo += monto;
      else if(metodo === "nequi" || metodo === "transferencia") mensualidades.transferencia += monto;
      else if(metodo === "tarjeta") mensualidades.tarjeta += monto;
    });

    const totalGeneral = productos.total + ligas.total + mensualidades.total;

    res.json({
      productos,
      ligas,
      mensualidades,
      totalGeneral
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message:"Error resumen" });
  }
};

module.exports = { resumenGeneral };
