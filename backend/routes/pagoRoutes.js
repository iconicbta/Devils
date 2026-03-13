const express = require("express");
const router = express.Router();
const Pago = require("../models/Pago");
const Contabilidad = require("../models/Contabilidad");
const Cliente = require("../models/Cliente");
const Producto = require("../models/Producto");
const { protect, verificarPermisos } = require("../middleware/authMiddleware");

// Importamos el controlador de mensualidades (Asegúrate de haber creado el archivo anterior)
const { registrarMensualidadCompleta, obtenerMensualidadesPorAño } = require("../controllers/mensualidadController");

/* ======================================================
   🔹 REPORTES Y RESÚMENES
====================================================== */

// 📌 Reporte de pagos por equipos
router.get(
  "/reporte",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const { fechaInicio, fechaFin, especialidad } = req.query;
      const query = { estado: "Completado" };

      if (fechaInicio && fechaFin) {
        query.fecha = {
          $gte: new Date(fechaInicio),
          $lte: new Date(fechaFin),
        };
      }

      let pagos = await Pago.find(query)
        .populate({
          path: "cliente",
          select: "nombre apellido especialidad",
        })
        .populate("producto", "nombre precio")
        .lean();

      if (especialidad) {
        pagos = pagos.filter((pago) => pago.cliente?.especialidad === especialidad);
      }

      res.json({ pagos });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al generar el reporte", detalle: error.message });
    }
  }
);

// 📊 Resumen por método de pago
router.get(
  "/resumen-metodo-pago",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const { fechaInicio, fechaFin, rango } = req.query;
      const query = { estado: "Completado" };

      if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);
        query.fecha = { $gte: inicio, $lte: fin };
      } else if (rango) {
        const hoy = new Date();
        let inicio;
        if (rango === "dia") inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        else if (rango === "semana") {
          const day = hoy.getDay();
          const diffToMonday = day === 0 ? 6 : day - 1;
          inicio = new Date(hoy);
          inicio.setDate(hoy.getDate() - diffToMonday);
          inicio.setHours(0, 0, 0, 0);
        } else if (rango === "mes") inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        const fin = new Date();
        fin.setHours(23, 59, 59, 999);
        query.fecha = { $gte: inicio, $lte: fin };
      }

      const pagos = await Pago.find(query).lean();
      const resumenMap = { Efectivo: 0, Transferencia: 0, Tarjeta: 0 };

      pagos.forEach((p) => {
        const metodo = p.metodoPago || "Sin especificar";
        resumenMap[metodo] = (resumenMap[metodo] || 0) + Number(p.monto || 0);
      });

      const resumen = Object.keys(resumenMap).map((metodo) => ({
        metodoPago: metodo,
        total: resumenMap[metodo],
      }));

      const totalGeneral = pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);
      res.json({ resumen, totalGeneral });
    } catch (error) {
      res.status(500).json({ mensaje: "Error en resumen", detalle: error.message });
    }
  }
);

/* ======================================================
   🔹 CRUD DE PAGOS (GENERAL)
====================================================== */

// Listar todos los pagos
router.get(
  "/",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const query = { estado: "Completado" };
      if (req.query.fechaInicio && req.query.fechaFin) {
        query.fecha = { $gte: new Date(req.query.fechaInicio), $lte: new Date(req.query.fechaFin) };
      }
      const pagos = await Pago.find(query)
        .populate("cliente", "nombre apellido")
        .populate("producto", "nombre precio")
        .populate("creadoPor", "nombre")
        .lean();

      const total = pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);
      res.json({ pagos, total });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al listar pagos", detalle: error.message });
    }
  }
);

// Crear un pago nuevo (con Stock y Contabilidad)
router.post(
  "/",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const { cliente, producto, cantidad, monto, fecha, metodoPago } = req.body;

      // Validaciones de stock
      const productoDoc = await Producto.findById(producto);
      if (!productoDoc || productoDoc.stock < cantidad) {
        return res.status(400).json({ mensaje: "Stock insuficiente o producto no existe" });
      }

      productoDoc.stock -= cantidad;
      await productoDoc.save();

      const nuevoPago = new Pago({
        cliente, producto,
        cantidad: Number(cantidad),
        monto: Number(monto),
        fecha: new Date(fecha),
        metodoPago,
        creadoPor: req.user._id,
        estado: "Completado",
      });

      const pagoGuardado = await nuevoPago.save();

      // Registro Automático en Contabilidad
      const nuevaTransaccion = new Contabilidad({
        tipo: "ingreso",
        monto: Number(monto),
        fecha: new Date(fecha),
        descripcion: `Pago de cliente - Método: ${metodoPago}`,
        categoria: "Pago de cliente",
        cuentaDebito: "Caja",
        cuentaCredito: "Ingresos por servicios",
        referencia: `PAGO-${pagoGuardado._id}`,
        creadoPor: req.user._id,
      });
      await nuevaTransaccion.save();

      res.status(201).json({ mensaje: "Pago creado con éxito", pago: pagoGuardado });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al crear pago", detalle: error.message });
    }
  }
);

// Obtener por ID
router.get(
  "/:id",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const pago = await Pago.findById(req.params.id)
        .populate("cliente", "nombre apellido")
        .populate("producto", "nombre precio stock");
      if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado" });
      res.json(pago);
    } catch (error) {
      res.status(500).json({ mensaje: "Error al obtener pago" });
    }
  }
);

/* ======================================================
   🔹 CONSULTAS ESPECÍFICAS
====================================================== */

// Consultar pagos por Cédula/Identificación
router.get(
  "/consultar/:numeroIdentificacion",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const cliente = await Cliente.findOne({ numeroIdentificacion: req.params.numeroIdentificacion });
      if (!cliente) return res.status(404).json({ mensaje: "Cliente no encontrado" });

      const pagos = await Pago.find({ cliente: cliente._id }).populate("producto", "nombre").lean();
      const formattedPagos = pagos.map((pago) => ({
        monto: pago.monto,
        fechaPago: pago.fecha,
        metodoPago: pago.metodoPago,
        concepto: pago.producto?.nombre || "Pago general",
      }));
      res.json(formattedPagos);
    } catch (error) {
      res.status(500).json({ mensaje: "Error en consulta", error: error.message });
    }
  }
);

/* ======================================================
   🔹 NUEVAS RUTAS: SISTEMA DE MENSUALIDADES (PLANILLA)
====================================================== */

// 1. Registro rápido de mensualidad (Doble registro: Pago General + Planilla + Contabilidad)
router.post(
  "/mensualidad-completa", 
  protect, 
  verificarPermisos(["admin", "recepcionista"]), 
  registrarMensualidadCompleta
);

// 2. Obtener datos para la tabla de las "X" (por año)
router.get(
  "/mensualidades/:año", 
  protect, 
  verificarPermisos(["admin", "recepcionista", "user"]), 
  obtenerMensualidadesPorAño
);
// Actualizar pago
router.put(
  "/:id",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const pago = await Pago.findById(req.params.id);

      if (!pago) {
        return res.status(404).json({ mensaje: "Pago no encontrado" });
      }

      Object.assign(pago, req.body);

      const pagoActualizado = await pago.save();

      res.json({
        mensaje: "Pago actualizado correctamente",
        pago: pagoActualizado,
      });

    } catch (error) {
      res.status(500).json({
        mensaje: "Error al actualizar pago",
        detalle: error.message,
      });
    }
  }
);
module.exports = router;


