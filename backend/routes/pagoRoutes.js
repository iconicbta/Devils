const express = require("express");
const router = express.Router();
const Pago = require("../models/Pago");
const Contabilidad = require("../models/Contabilidad");
const Cliente = require("../models/Cliente");
const Producto = require("../models/Producto");
const { protect, verificarPermisos } = require("../middleware/authMiddleware");

// Importamos el controlador de mensualidades
const { registrarMensualidadCompleta, obtenerMensualidadesPorAño } = require("../controllers/mensualidadController");

/* ======================================================
    🔹 ACTUALIZACIÓN (RUTA ÚNICA)
====================================================== */

// Cambiamos "/:id" por "/editar/:id" para que el backend no se confunda
router.put(
  "/editar/:id",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const pago = await Pago.findById(req.params.id);
      if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado" });

      Object.assign(pago, req.body);
      const pagoActualizado = await pago.save();

      res.json({
        mensaje: "Pago actualizado correctamente",
        pago: pagoActualizado,
      });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al actualizar pago", detalle: error.message });
    }
  }
);

/* ======================================================
   🔹 REPORTES Y RESÚMENES
====================================================== */

router.get(
  "/reporte",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const { fechaInicio, fechaFin, especialidad } = req.query;
      const query = { estado: "Completado" };
      if (fechaInicio && fechaFin) {
        query.fecha = { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) };
      }
      let pagos = await Pago.find(query)
        .populate({ path: "cliente", select: "nombre apellido especialidad" })
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

router.get(
  "/resumen-metodo-pago",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const { fechaInicio, fechaFin, rango } = req.query;
      const query = { estado: "Completado" };
      if (fechaInicio && fechaFin) {
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);
        query.fecha = { $gte: new Date(fechaInicio), $lte: fin };
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
      res.json({ resumen, totalGeneral: pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0) });
    } catch (error) {
      res.status(500).json({ mensaje: "Error en resumen", detalle: error.message });
    }
  }
);

/* ======================================================
   🔹 CRUD DE PAGOS (GENERAL)
====================================================== */

router.get(
  "/",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const query = { estado: "Completado" };
      const pagos = await Pago.find(query)
        .populate("cliente", "nombre apellido")
        .populate("producto", "nombre precio")
        .populate("creadoPor", "nombre")
        .lean();
      res.json({ pagos, total: pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0) });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al listar pagos", detalle: error.message });
    }
  }
);

router.post(
  "/",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const { cliente, producto, cantidad, monto, fecha, metodoPago } = req.body;
      const productoDoc = await Producto.findById(producto);
      if (!productoDoc || productoDoc.stock < cantidad) {
        return res.status(400).json({ mensaje: "Stock insuficiente" });
      }
      productoDoc.stock -= cantidad;
      await productoDoc.save();
      const pagoGuardado = await new Pago({
        cliente, producto, cantidad: Number(cantidad), monto: Number(monto),
        fecha: new Date(fecha), metodoPago, creadoPor: req.user._id, estado: "Completado"
      }).save();
      await new Contabilidad({
        tipo: "ingreso", monto: Number(monto), fecha: new Date(fecha),
        descripcion: `Pago de cliente`, categoria: "Pago de cliente",
        cuentaDebito: "Caja", cuentaCredito: "Ingresos", referencia: `PAGO-${pagoGuardado._id}`, creadoPor: req.user._id
      }).save();
      res.status(201).json({ mensaje: "Pago creado", pago: pagoGuardado });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al crear pago", detalle: error.message });
    }
  }
);

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

router.get(
  "/consultar/:numeroIdentificacion",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const cliente = await Cliente.findOne({ numeroIdentificacion: req.params.numeroIdentificacion });
      if (!cliente) return res.status(404).json({ mensaje: "Cliente no encontrado" });
      const pagos = await Pago.find({ cliente: cliente._id }).populate("producto", "nombre").lean();
      res.json(pagos.map(p => ({ monto: p.monto, fechaPago: p.fecha, concepto: p.producto?.nombre || "Pago general" })));
    } catch (error) {
      res.status(500).json({ mensaje: "Error en consulta", error: error.message });
    }
  }
);

/* ======================================================
   🔹 SISTEMA DE MENSUALIDADES
====================================================== */

router.post("/mensualidad-completa", protect, verificarPermisos(["admin", "recepcionista"]), registrarMensualidadCompleta);
router.get("/mensualidades/:año", protect, verificarPermisos(["admin", "recepcionista", "user"]), obtenerMensualidadesPorAño);

module.exports = router;




