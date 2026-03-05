// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const { protect } = require("./middleware/authMiddleware");
const app = express();
/* ======================================================
    🔹 CORS FIX DEFINITIVO (COPIADO DEL PROYECTO FUNCIONAL)
====================================================== */
const allowedOrigins = [
  "https://devils2.vercel.app",
  "https://devils2-git-main-alfredos-projects-a028b04c.vercel.app", // Tu dominio de deploy
  /^https:\/\/devils2.*\.vercel\.app$/, // Esto permite cualquier rama de Vercel
  "http://localhost:3000",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Verificar si el origen está permitido (soporta strings y regex)
  const isAllowed = allowedOrigins.some((pattern) =>
    typeof pattern === "string"
      ? pattern === origin
      : pattern.test(origin)
  );

  res.header("Vary", "Origin");

  if (isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );
  
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-xsrf-token, x-access-token"
  );

  // IMPORTANTE: Responder inmediatamente a la petición preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});
/* ======================================================
    🔹 Seguridad y Body Parser
====================================================== */
app.set("trust proxy", true);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ======================================================
    🔹 Logger
====================================================== */
app.use((req, res, next) => {
  console.log(`📩 ${req.method} ${req.url}`);
  next();
});

/* ======================================================
    🔹 Conexión con MongoDB Atlas
====================================================== */
connectDB()
  .then(() => console.log("🟢 MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Error al conectar MongoDB:", err.message);
    process.exit(1);
  });

/* ======================================================
    🔹 RUTAS (IMPORTACIÓN)
====================================================== */
// --- Rutas públicas o de acceso rápido ---
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/pagos-ligas", require("./routes/pagosLigasRoutes"));

/** * ✅ PAGA MES */
app.use("/api/paga-mes", require("./routes/pagaMesRoutes")); 

// 🆕 REPORTES (RESUMEN GENERAL)
app.use("/api/reportes", protect, require("./routes/reportesRoutes"));

// --- Rutas protegidas ---
app.use("/api/especialidades", protect, require("./routes/especialidades"));
app.use(
  "/api/composicion-corporal",
  protect,
  require("./routes/composicionCorporal")
);
app.use("/api/clientes", protect, require("./routes/clienteRoutes"));
app.use("/api/membresias", protect, require("./routes/membresiaRoutes"));
app.use("/api/entrenadores", protect, require("./routes/entrenadorRoutes"));
app.use("/api/productos", protect, require("./routes/productRoutes"));
app.use("/api/pagos", protect, require("./routes/pagoRoutes"));
app.use("/api/users", protect, require("./routes/userRoutes"));
app.use("/api/clases", protect, require("./routes/claseRoutes"));
app.use("/api/contabilidad", protect, require("./routes/contabilidad"));
app.use("/api/indicadores", protect, require("./routes/indicadorRoutes"));
app.use("/api/asistencias", protect, require("./routes/asistenciaRoutes"));
app.use("/api/rutinas", protect, require("./routes/rutinas"));
app.use(
  "/api/medicion-porristas",
  protect,
  require("./routes/medicionPorristas")
);

/* ======================================================
    🔹 Health Check (Render lo necesita)
====================================================== */
app.get("/", (req, res) => {
  res.json({ mensaje: "Backend corriendo correctamente en Render" });
});

/* ======================================================
    🔹 Manejo de 404
====================================================== */
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

/* ======================================================
    🔹 Manejo de Errores Globales
====================================================== */
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(500).json({
    mensaje: "Error interno del servidor",
    detalle: err.message,
  });
});

/* ======================================================
    🔹 Servidor (Render EXIGE 0.0.0.0)
====================================================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);









