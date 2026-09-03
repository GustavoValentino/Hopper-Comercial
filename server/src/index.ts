import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import dns from "dns";
// import { iniciarJobVerificacaoVencimentos } from "./jobs/verificarVencimentos.js";
import { iniciarConexaoWhatsapp } from "./lib/whatsapp.js";
import jobRoutes from "./routes/jobRoutes.js";

dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://hopper-comercial.vercel.app",
];

// Configuração do Socket.io com CORS robusto
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  },
});

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("dev"));

// Configuração do CORS do Express unificada
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Não permitido por CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/auth", authRoutes);
app.all("/api/auth/*", (req, res) => toNodeHandler(auth)(req, res));

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/jobs", jobRoutes);

// Nota: Certifique-se de que o middleware de proteção de rota (ex: authenticate / protegerRota)
// está importado e disponível aqui se optar por usá-lo nas rotas do WhatsApp.
app.use("/api/whatsapp", whatsappRoutes);

app.get("/ping", (_req, res) => res.send("pong"));

const activeSockets = new Map<string, string>();

io.on("connection", (socket) => {
  socket.on("register_user", (userId: string) => {
    if (!userId) return;
    activeSockets.set(socket.id, userId);
    io.emit("update_online_count", new Set(activeSockets.values()).size);
  });

  socket.on("disconnect", () => {
    activeSockets.delete(socket.id);
    io.emit("update_online_count", new Set(activeSockets.values()).size);
  });
});

// Job agendado: verifica produtos críticos e dispara notificação automaticamente
// iniciarJobVerificacaoVencimentos();

const port = Number(process.env.PORT) || 3001;

server.listen(port, "0.0.0.0", () => {
  console.log(`Servidor Hopper rodando na porta ${port}`);

  // Inicializa a conexão do WhatsApp via Baileys assim que o servidor sobe
  iniciarConexaoWhatsapp();
});
