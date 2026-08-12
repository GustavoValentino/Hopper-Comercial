import { PrismaClient } from "@prisma/client";
import { enfileirarMensagemWhatsapp } from "./whatsapp.js";

const prisma = new PrismaClient();

export const notificarWhatsappSeAtivo = async (
  userId: string,
  mensagem: string,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappOptIn: true, whatsappNumber: true },
    });
    if (user?.whatsappOptIn && user.whatsappNumber) {
      enfileirarMensagemWhatsapp(user.whatsappNumber, mensagem);
    }
  } catch (error) {
    console.error("Erro ao verificar opt-in de WhatsApp:", error);
  }
};
