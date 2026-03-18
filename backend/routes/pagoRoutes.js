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
     const inicio = new Date(fechaInicio);
const fin = new Date(fechaFin);

inicio.setUTCHours(5,0,0,0);
fin.setUTCHours(28,59,59,999);

query.fecha = {
  $gte: inicio,
  $lte: fin,
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
// Listar todos los pagos (BLOQUE CORREGIDO)
router.get(
  "/",
  protect,
  verificarPermisos(["admin", "recepcionista", "user"]),
  async (req, res) => {
    try {
      const query = { estado: "Completado" };
      
     if (req.query.fechaInicio && req.query.fechaFin) {
    // Usamos el string tal cual viene para evitar que JS lo mueva de día por la zona horaria
    const inicio = new Date(req.query.fechaInicio); 
    const fin = new Date(req.query.fechaFin);

    // Forzamos el inicio del día y el fin del día absoluto
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    query.fecha = {
        $gte: inicio,
        $lte: fin
    };
}

      const pagos = await Pago.find(query)
        .populate("cliente", "nombre apellido")
        .populate("producto", "nombre precio")
        .populate("creadoPor", "nombre")
        .lean();

      // El servidor suma los montos encontrados
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
        fecha: fecha ? new Date(`${fecha}T12:00:00`) : new Date(),
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
// --- COPIAR DESDE AQUÍ ---
// ACTUALIZAR PAGO (Ruta necesaria para el Frontend)
router.put(
  "/actualizar/:id",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const pagoActualizado = await Pago.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!pagoActualizado) {
        return res.status(404).json({ mensaje: "Pago no encontrado" });
      }

      res.json({
        mensaje: "Pago actualizado correctamente",
        pago: pagoActualizado,
      });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al actualizar pago", detalle: error.message });
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
// ELIMINAR UN PAGO
router.delete(
  "/:id",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const pago = await Pago.findById(req.params.id);
      if (!pago) return res.status(404).json({ mensaje: "Pago no encontrado" });

      // 1. Devolver el stock al producto
      if (pago.producto && pago.cantidad) {
        await Producto.findByIdAndUpdate(pago.producto, {
          $inc: { stock: pago.cantidad }
        });
      }

      // 2. Borrar de contabilidad
      await Contabilidad.findOneAndDelete({ referencia: `PAGO-${pago._id}` });

      // 3. Borrar el pago
      await Pago.findByIdAndDelete(req.params.id);

      res.json({ mensaje: "Pago eliminado y stock devuelto" });
    } catch (error) {
      res.status(500).json({ mensaje: "Error al eliminar pago", detalle: error.message });
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
// ⚡ NUEVA RUTA: PAGO RÁPIDO (DATOS TOTALMENTE MANUALES)
// ⚡ NUEVA RUTA: PAGO RÁPIDO (CORREGIDA)
router.post(
  "/pago-rapido",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const { clienteManual, productoManual, monto, metodoPago, fecha } = req.body;

      // 1. Crear el objeto del pago
      const nuevoPago = new Pago({
        clienteManual, 
        productoManual, 
        monto: Number(monto),
        fecha: fecha ? new Date(`${fecha}T12:00:00`) : new Date(),
        metodoPago,
        creadoPor: req.user._id,
        estado: "Completado",
        esPagoRapido: true,
        // IMPORTANTE: Como son manuales, enviamos null a los IDs de relación
        cliente: null,
        producto: null,
        cantidad: 1
      });

      const pagoGuardado = await nuevoPago.save();

      // 2. Intentar registrar en contabilidad (en un bloque separado para que no rompa el flujo)
      try {
        const nuevaTransaccion = new Contabilidad({
          tipo: "ingreso",
          monto: Number(monto),
          fecha: fecha ? new Date(fecha) : new Date(),
          descripcion: `PAGO RÁPIDO: ${clienteManual}`,
          categoria: "Pago Rápido",
          referencia: `PR-${pagoGuardado._id}`,
          creadoPor: req.user._id,
          // Agregamos campos que a veces pide el modelo Contabilidad
          cuentaDebito: "Caja",
          cuentaCredito: "Ingresos por servicios"
        });
        await nuevaTransaccion.save();
      } catch (errorContabilidad) {
        console.error("Pago guardado, pero falló Contabilidad:", errorContabilidad.message);
        // No enviamos res.status(500) aquí para que el frontend reciba el éxito del pago
      }

      // 3. Respuesta de éxito obligatoria
      return res.status(201).json({ 
        mensaje: "Pago registrado con éxito", 
        pago: pagoGuardado 
      });

    } catch (error) {
      console.error("ERROR CRÍTICO EN PAGO RÁPIDO:", error.message);
      return res.status(500).json({ 
        mensaje: "Error al registrar el pago", 
        detalle: error.message 
      });
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
  "/mensualidades/:anio", 
  protect, 
  verificarPermisos(["admin", "recepcionista", "user"]), 
  obtenerMensualidadesPorAño
);
router.post(
  "/pago-rapido",
  protect,
  verificarPermisos(["admin", "recepcionista"]),
  async (req, res) => {
    try {
      const { clienteManual, productoManual, monto, fecha, metodoPago } = req.body;

      const pagoGuardado = await new Pago({
        clienteManual,
        productoManual,
        monto: Number(monto),
        cantidad: 1,
        fecha: new Date(fecha + "T12:00:00"),
        metodoPago,
        creadoPor: req.user._id,
        estado: "Completado"
      }).save();

      await new Contabilidad({
        tipo: "ingreso",
        monto: Number(monto),
        fecha: new Date(fecha + "T12:00:00"),
        descripcion: `Pago rápido - ${clienteManual}`,
        categoria: "Pago rápido",
        cuentaDebito: "Caja",
        cuentaCredito: "Ingresos",
        referencia: `PAGO-RAPIDO-${pagoGuardado._id}`,
        creadoPor: req.user._id
      }).save();

      res.status(201).json({
        mensaje: "Pago rápido registrado",
        pago: pagoGuardado
      });

    } catch (error) {
      console.error("ERROR PAGO RAPIDO:", error);
      res.status(500).json({
        mensaje: "Error al registrar pago rápido",
        detalle: error.message
      });
    }
  }
);
module.exports = router;




