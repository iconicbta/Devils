const PagoLigaMes = require("../models/PagoLigaMes");
const ConfiguracionPagoLiga = require("../models/ConfiguracionPagoLiga");

// OBTENER MESES ORDENADOS
const obtenerMeses = async (req, res) => {
  try {
    const meses = await PagoLigaMes.distinct("mes");

    const mesesOrdenados = meses.sort((a, b) => {
      const dateA = new Date(a.replace(" de ", " "));
      const dateB = new Date(b.replace(" de ", " "));
      return dateB - dateA;
    });

    res.json(mesesOrdenados.map(m => ({ _id: m, nombre: m })));
  } catch (error) {
    console.error("Error al obtener meses:", error);
    res.status(500).json({ message: "Error al obtener meses" });
  }
};

// CREAR MES → SE GUARDA CON REGISTRO FICTICIO (Ajustado para incluir tipoPago: 'SYSTEM')
const crearMes = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: "Nombre del mes requerido" });
    }

    const nombreMes = nombre.trim();

    const existe = await PagoLigaMes.findOne({ mes: nombreMes });
    if (existe) {
      return res.status(400).json({ message: "El mes ya existe" });
    }

    const registro = new PagoLigaMes({
      nombre: "SYSTEM",
      equipo: "Ligas",
      mes: nombreMes,
      diasAsistidos: 0,
      total: 0,
      diasPagados: [],
      tipoPago: 'SYSTEM', // 🆕 CAMBIO: Incluir tipoPago para el registro ficticio
    });

    await registro.save();
    res.json({ message: "Mes creado correctamente", nombre: nombreMes });
  } catch (error) {
    console.error("Error al crear mes:", error);
    res.status(500).json({ message: "Error al crear mes" });
  }
};

// OBTENER PAGOS POR MES → SIN FILTRAR NADA
const obtenerPagosPorMes = async (req, res) => {
  try {
    const { mes } = req.params;
    // La consulta ahora devuelve también el campo 'tipoPago'
   const pagos = await PagoLigaMes.find({ mes }).sort({ createdAt: -1 });

const hoy = new Date().getDate();

const pagosNormalizados = pagos.map(pago => {

const diasNormalizados = (pago.diasPagados || []).map(d => {

if (typeof d === "number") {

let tipo = "HOY";

if (d < hoy) tipo = "ATRASADO";
if (d > hoy) tipo = "ADELANTADO";

return { dia: d, tipo };
}

if (typeof d === "object") {
return d;
}

});

return {
...pago.toObject(),
diasPagados: diasNormalizados
};

});

res.json(pagosNormalizados);
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    res.status(500).json({ message: "Error al obtener pagos" });
  }
};

// REGISTRAR PAGO (AJUSTADO para incluir tipoPago)
const registrarPago = async (req, res) => {
  try {
    const {
      nombre,
      equipo = "Ligas",
      mes,
      diasAsistidos,
      total,
      valorDiarioUsado,
      diasPagados = [],
      tipoPago, // 🆕 CAMBIO: Extraer el nuevo campo tipoPago
    } = req.body;

    // 🆕 CAMBIO: Validar tipoPago como dato requerido
    if (!nombre || !mes || diasAsistidos === undefined || total === undefined || !tipoPago) {
      return res.status(400).json({ message: "Faltan datos requeridos (nombre, mes, diasAsistidos, total, tipoPago)" });
    }
    
    // Opcional: Validación para asegurar que el valor sea 'Efectivo' o 'Nequi'
    if (!['Efectivo', 'Nequi'].includes(tipoPago)) {
        return res.status(400).json({ message: "Tipo de pago inválido. Debe ser 'Efectivo' o 'Nequi'." });
    }

    const nuevoPago = new PagoLigaMes({
      nombre: nombre.trim().toUpperCase(),
      equipo,
      mes,
      diasAsistidos,
      total,
      valorDiarioUsado: valorDiarioUsado || (diasAsistidos > 0 ? total / diasAsistidos : total),
      diasPagados,
      tipoPago: tipoPago, // 🆕 CAMBIO: Guardar el tipo de pago
    });

    await nuevoPago.save();
    res.status(201).json(nuevoPago);
  } catch (error) {
    console.error("Error al registrar pago:", error);
    res.status(500).json({ message: "Error al registrar pago" });
  }
};

// ACTUALIZAR VALOR DIARIO
const actualizarValorDiario = async (req, res) => {
  try {
    const { valor } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ message: "Valor inválido" });

    let config = await ConfiguracionPagoLiga.findOne();
    if (!config) {
      config = new ConfiguracionPagoLiga({ valorDiario: valor });
    } else {
      config.valorDiario = valor;
    }
    await config.save();

    res.json({ message: "Valor diario actualizado", valorDiario: config.valorDiario });
  } catch (error) {
    console.error("Error al actualizar valor diario:", error);
    res.status(500).json({ message: "Error al actualizar valor diario" });
  }
};

module.exports = {
  obtenerMeses,
  crearMes,
  obtenerPagosPorMes,
  registrarPago,
  actualizarValorDiario,
};   
