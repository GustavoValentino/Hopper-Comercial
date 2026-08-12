import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";

const AUTH_FOLDER = path.join(process.cwd(), ".baileys_auth");
let sock: WASocket | null = null;
let isConnecting = false;
let connectionReady = false;
const logger = pino({ level: "silent" });

// ── Fila de envio com controle anti-spam ────────────────────────
const MIN_INTERVAL_MS = 4000;
const MAX_PER_HOUR = 60;

type FilaItem = { numero: string; mensagem: string };
const fila: FilaItem[] = [];
let processandoFila = false;
let envioTimestamps: number[] = [];

const normalizarNumero = (numero: string): string => {
  const apenasDigitos = numero.replace(/\D/g, "");
  const comCodigoPais = apenasDigitos.startsWith("55")
    ? apenasDigitos
    : `55${apenasDigitos}`;
  return `${comCodigoPais}@s.whatsapp.net`;
};

const dentroDoLimiteHorario = (): boolean => {
  const umaHoraAtras = Date.now() - 60 * 60 * 1000;
  envioTimestamps = envioTimestamps.filter((t) => t > umaHoraAtras);
  return envioTimestamps.length < MAX_PER_HOUR;
};

const processarFila = async () => {
  if (processandoFila) return;
  processandoFila = true;

  while (fila.length > 0) {
    if (!connectionReady || !sock) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    if (!dentroDoLimiteHorario()) {
      console.warn(
        "⚠️ Limite horário de mensagens WhatsApp atingido. Aguardando...",
      );
      await new Promise((r) => setTimeout(r, 60000));
      continue;
    }

    const item = fila.shift();
    if (!item) continue;

    try {
      await sock.sendMessage(normalizarNumero(item.numero), {
        text: item.mensagem,
      });
      envioTimestamps.push(Date.now());
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem WhatsApp:", error);
    }

    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
  }

  processandoFila = false;
};

export const enfileirarMensagemWhatsapp = (
  numero: string,
  mensagem: string,
) => {
  fila.push({ numero, mensagem });
  processarFila();
};

export const iniciarConexaoWhatsapp = async () => {
  if (isConnecting) return;
  isConnecting = true;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 Escaneie o QR Code abaixo para conectar o WhatsApp:");
      import("qrcode-terminal").then(({ default: qrcode }) => {
        qrcode.generate(qr, { small: true });
      });
    }

    if (connection === "close") {
      connectionReady = false;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const deveReconectar = statusCode !== DisconnectReason.loggedOut;

      console.log(
        "🔌 Conexão WhatsApp encerrada.",
        deveReconectar ? "Reconectando..." : "Sessão encerrada (logout).",
      );

      if (deveReconectar) {
        isConnecting = false;
        setTimeout(() => iniciarConexaoWhatsapp(), 5000);
      }
    } else if (connection === "open") {
      connectionReady = true;
      console.log("✅ WhatsApp conectado com sucesso.");
    }
  });
};

export const whatsappEstaConectado = (): boolean => connectionReady;
