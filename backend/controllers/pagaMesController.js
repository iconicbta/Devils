const PagaMes = require("../models/pagaMesModels");

// Obtener los años registrados (Equivalente a meses en Ligas)
const obtenerAnios = async (req, res) => {
  try {
    const anios = await PagaMes.distinct("anio");
    res.json(anios.sort((a, b) => b - a).map(a => ({ _id: a, nombre: a })));
  } catch (error) {
    res.status(500).json({ message: "Error al obtener años" });
  }
};

const crearAnio = async (req, res) => {
  try {
    const { nombre } = req.body; // El "nombre" aquí es el año (ej: 2026)
    const existe = await PagaMes.findOne({ anio: nombre, nombre: "SYSTEM" });
    if (existe) return res.status(400).json({ message: "El año ya existe" });

    const registro = new PagaMes({
      nombre: "SYSTEM",
      anio: nombre,
      total: 0,
      mesesPagados: [],
      tipoPago: 'SYSTEM',
    });

    await registro.save();
    res.json({ message: "Año creado correctamente", nombre });
  } catch (error) {
    res.status(500).json({ message: "Error al crear año" });
  }
};

const obtenerPagosPorAnio = async (req, res) => {
  try {
    const { anio } = req.params;
    const pagos = await PagaMes.find({ anio }).sort({ createdAt: -1 });
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener pagos" });
  }
};

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
    res.status(201).json(nuevoPago);
  } catch (error) {
    res.status(500).json({ message: "Error al registrar pago" });
  }
};

module.exports = { obtenerAnios, crearAnio, obtenerPagosPorAnio, registrarPagoMes };
