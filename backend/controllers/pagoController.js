// Nuevo endpoint en pagoController.js
const Pago = require("../models/Pago");
const Cliente = require("../models/Cliente");
const Producto = require("../models/Producto");

const reportePagosPorEquipo = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, especialidad } = req.query;

    const query = {
      estado: "Completado",
      $or: [
        { producto: { $exists: true, $ne: null } },
        { productoManual: { $exists: true, $ne: "" } }
      ]
    };

    if (fechaInicio && fechaFin) {
      const start = new Date(fechaInicio);
      const end = new Date(fechaFin);
      end.setHours(23,59,59,999);

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

    // validación duplicados por seguridad
    const ids = new Set();
    pagos = pagos.filter(p => {
      const id = String(p._id);
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    });

    res.json({ pagos });

  } catch (error) {
    res.status(500).json({
      mensaje: "Error al generar reporte",
      error: error.message
    });
  }
};

module.exports = {
  listarPagos,
  consultarPagosPorCedula,
  agregarPago,
  obtenerPagoPorId,
  reportePagosPorEquipo,
};
