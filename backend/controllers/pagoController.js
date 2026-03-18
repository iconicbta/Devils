// Nuevo endpoint en pagoController.js
const Pago = require("../models/Pago");
const Cliente = require("../models/Cliente");
const Producto = require("../models/Producto");

// Reporte por equipos
const reportePagosPorEquipo = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, especialidad } = req.query;
    const query = { estado: "Completado" };

    if (fechaInicio && fechaFin) {
     const start = new Date(fechaInicio + "T00:00:00-05:00");
const end = new Date(fechaFin + "T23:59:59-05:00");
      query.fecha = { $gte: start, $lte: end };
    }

    let pagos = await Pago.find(query)
      .populate({
        path: "cliente",
        select: "nombre apellido especialidad",
      })
      .populate("producto", "nombre precio")
      .lean();

    if (especialidad) {
      pagos = pagos.filter(
        (pago) => pago.cliente?.especialidad === especialidad
      );
    }

    res.json({ pagos });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al generar reporte", error: error.message });
  }
};

module.exports = {
  listarPagos,
  consultarPagosPorCedula,
  agregarPago,
  obtenerPagoPorId,
  reportePagosPorEquipo, // 👈 nuevo export
};
