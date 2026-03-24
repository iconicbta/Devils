const PagaMes = require("../models/pagaMesModels");
const Contabilidad = require("../models/Contabilidad");
const User = require("../models/User");

// Obtener los años/meses registrados
const obtenerAnios = async (req, res) => {
  try {
    const anios = await PagaMes.distinct("anio");
    res.json(
      anios
        .sort((a, b) => b - a)
        .map((a) => ({ _id: a, nombre: a }))
    );
  } catch (error) {
    console.error("Error obtenerAnios:", error);
    res.status(500).json({ message: "Error al obtener años" });
  }
};

// Crear año o mes
const crearAnio = async (req, res) => {
  try {
    const { nombre } = req.body;
    const existe = await PagaMes.findOne({ anio: nombre, nombre: "SYSTEM" });

    if (existe) {
      return res.status(400).json({ message: "El ya existe" });
    }

    const registro = new PagaMes({
      nombre: "SYSTEM",
      anio: nombre,
      total: 0,
      mesesPagados: [],
      tipoPago: "SYSTEM",
    });

    await registro.save();
    res.json({ message: "Creado correctamente", nombre });
  } catch (error) {
    console.error("Error crearAnio:", error);
    res.status(500).json({ message: "Error al crear" });
  }
};

// Obtener pagos por año/mes
const obtenerPagosPorAnio = async (req, res) => {
  try {
    const { anio } = req.params;
    const pagos = await PagaMes.find({ anio }).sort({ createdAt: -1 });
    res.json(pagos);
  } catch (error) {
    console.error("Error obtenerPagosPorAnio:", error);
    res.status(500).json({ message: "Error al obtener pagos" });
  }
};

// 🚀 REGISTRAR PAGO (Corregido el error de las llaves)
const registrarPagoMes = async (req, res) => {
  try {
    const { nombre, anio, total, mesesPagados, tipoPago, diasAsistidos, diasPagados } = req.body;

    // 1. Guardar el pago
    const nuevoPago = new PagaMes({
      nombre: nombre.trim().toUpperCase(),
      anio,
      total,
      mesesPagados,
      tipoPago,
      diasAsistidos,
      diasPagados
    });

    await nuevoPago.save();

    // 2. Registrar en contabilidad (Dentro de la función async)
    const transaccion = new Contabilidad({
      tipo: "ingreso",
      monto: total,
      fecha: new Date(),
      descripcion: `Pago Ligas/Mes ${nombre} (${anio})`,
      categoria: "Mensualidades",
      cuentaDebito: tipoPago === "Nequi" ? "Nequi" : "Caja",
      cuentaCredito: "Ingresos Mensualidades",
      referencia: `PAGO-${nuevoPago._id}`,
      metodoPago: tipoPago,
      creadoBy: req.user ? req.user._id : null // Usamos req.user si tienes middleware de auth
    });

    await transaccion.save();

    res.status(201).json(nuevoPago);

  } catch (error) {
    console.error("Error registrarPagoMes:", error);
    res.status(500).json({
      message: "Error al registrar pago",
      error: error.message
    });
  }
};

module.exports = {
  obtenerAnios,
  crearAnio,
  obtenerPagosPorAnio,
  registrarPagoMes,
};
