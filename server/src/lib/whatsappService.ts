import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";

class WhatsAppService {
  private sock: any = null;
  private isReady: boolean = false;
  private messageQueue: Array<{
    phone: string;
    message: string;
    resolve: Function;
    reject: Function;
  }> = [];
  private isProcessingQueue: boolean = false;
  private readonly RATE_LIMIT_DELAY_MS = 4000; // 4 segundos entre cada mensagem (Anti-Spam)

  async connectToWhatsApp() {
    const { state, saveCreds } =
      await useMultiFileAuthState("auth_info_baileys");

    this.sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }) as any,
      printQRInTerminal: true,
    });

    this.sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        this.isReady = false;
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !==
          DisconnectReason.loggedOut;
        console.log(
          "⚠️ Conexão fechada com o WhatsApp. Reconectando...",
          shouldReconnect,
        );
        if (shouldReconnect) {
          setTimeout(() => this.connectToWhatsApp(), 5000);
        }
      } else if (connection === "open") {
        this.isReady = true;
        console.log("✅ WhatsApp conectado com sucesso via Baileys!");
      }
    });

    this.sock.ev.on("creds.update", saveCreds);
  }

  async sendSafely(phone: string, message: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ phone, message, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    if (!this.isReady) {
      setTimeout(() => this.processQueue(), 10000);
      return;
    }

    this.isProcessingQueue = true;
    const { phone, message, resolve, reject } = this.messageQueue.shift()!;

    try {
      const formattedPhone = phone.includes("@s.whatsapp.net")
        ? phone
        : `${phone}@s.whatsapp.net`;
      await this.sock.sendMessage(formattedPhone, { text: message });
      resolve(true);
    } catch (error) {
      reject(error);
    } finally {
      setTimeout(() => {
        this.isProcessingQueue = false;
        this.processQueue();
      }, this.RATE_LIMIT_DELAY_MS);
    }
  }
}

export const whatsappService = new WhatsAppService();
