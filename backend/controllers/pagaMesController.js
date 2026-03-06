const PagaMes = require("../models/pagaMesModels");
const Contabilidad = require("../models/Contabilidad");
const User = require("../models/User");

// Obtener los años registrados
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

// Crear año
const crearAnio = async (req, res) => {
  try {
    const { nombre } = req.body;

    const existe = await PagaMes.findOne({ anio: nombre, nombre: "SYSTEM" });

    if (existe) {
      return res.status(400).json({ message: "El año ya existe" });
    }

    const registro = new PagaMes({
      nombre: "SYSTEM",
      anio: nombre,
      total: 0,
      mesesPagados: [],
      tipoPago: "SYSTEM",
    });

    await registro.save();

    res.json({
      message: "Año creado correctamente",
      nombre,
    });

  } catch (error) {
    console.error("Error crearAnio:", error);
    res.status(500).json({ message: "Error al crear año" });
  }
};

// Obtener pagos por año
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

// Registrar pago
const registrarPagoMes = async (req, res) => {
  try {

    const { nombre, anio, plan, total, mesesPagados, tipoPago } = req.body;

    const nuevoPago = new PagaMes({
      nombre: nombre.trim().toUpperCase(),
      anio,
      plan,
      total,
      mesesPagados,
      tipoPago,
    });

    await nuevoPago.save();

    // Registrar ingreso en contabilidad
    const transaccion = new Contabilidad({
      tipo: "ingreso",
      monto: total,
      fecha: new Date(),
      descripcion: `Pago mensual ${nombre} (${mesesPagados.join(", ")})`,
      categoria: "Mensualidades",
      cuentaDebito: tipoPago === "Nequi" ? "Nequi" : "Caja",
      cuentaCredito: "Ingresos Mensualidades",
      referencia: `PAGO-${nuevoPago._id}`,
      metodoPago: tipoPago,
      creadoPor: usuario._id
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
