import { Request, Response } from "express";
import https from "https";

const COSMOS_BASE_URL = "https://api.cosmos.bluesoft.com.br/gtins";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

type ResultadoBusca = {
  name: string | null;
  imageUrl: string | null;
  weightGrams: number | null;
  unit: "KG" | "ML_G";
  brand: string | null;
  source: "cosmos" | "openfoodfacts";
};

const baixarImagemComoBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
};

const buscarNoCosmos = async (ean: string): Promise<ResultadoBusca | null> => {
  const token = process.env.COSMOS_API_TOKEN;
  const userAgent = process.env.COSMOS_USER_AGENT;

  if (!token || !userAgent) return null;

  try {
    const response = await fetch(`${COSMOS_BASE_URL}/${ean}.json`, {
      headers: {
        "X-Cosmos-Token": token,
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      // @ts-ignore — Node 18+ aceita agent no fetch nativo via workaround
      agent: httpsAgent,
    });

    if (!response.ok) {
      console.log(`Cosmos retornou ${response.status} para EAN ${ean}`);
      return null;
    }

    const data = (await response.json()) as any;

    return {
      name: data.description || null,
      imageUrl: data.thumbnail || null,
      weightGrams: data.net_weight || data.gross_weight || null,
      unit: "KG",
      brand: data.brand?.name || null,
      source: "cosmos",
    };
  } catch (err) {
    console.log("Cosmos erro:", err);
    return null;
  }
};

const parsePesoOpenFoodFacts = (
  quantity?: string,
): { valorGramas: number; unit: "KG" | "ML_G" } | null => {
  if (!quantity) return null;
  const match = quantity.match(/([\d.,]+)\s*(kg|g|ml|l)\b/i);
  if (!match) return null;

  const valor = parseFloat(match[1].replace(",", "."));
  const unidade = match[2].toLowerCase();

  if (unidade === "kg") return { valorGramas: valor * 1000, unit: "KG" };
  if (unidade === "g") return { valorGramas: valor, unit: "KG" };
  if (unidade === "l") return { valorGramas: valor * 1000, unit: "ML_G" };
  return { valorGramas: valor, unit: "ML_G" };
};

const buscarNoOpenFoodFacts = async (
  ean: string,
): Promise<ResultadoBusca | null> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}.json`,
    );

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const peso = parsePesoOpenFoodFacts(p.quantity);

    return {
      name: p.product_name || null,
      imageUrl: p.image_url || p.image_front_url || null,
      weightGrams: peso?.valorGramas ?? null,
      unit: peso?.unit ?? "KG",
      brand: p.brands || null,
      source: "openfoodfacts",
    };
  } catch {
    return null;
  }
};

export const lookupProductByEan = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { ean } = req.params;

    if (!ean || ean.length < 8) {
      res.status(400).json({ message: "Código EAN inválido." });
      return;
    }

    let resultado = await buscarNoCosmos(ean);

    if (!resultado || !resultado.name) {
      resultado = await buscarNoOpenFoodFacts(ean);
    }

    if (!resultado || !resultado.name) {
      res
        .status(404)
        .json({ error: "Produto não encontrado nas bases externas." });
      return;
    }

    let imageBase64: string | null = null;
    if (resultado.imageUrl) {
      imageBase64 = await baixarImagemComoBase64(resultado.imageUrl);
    }

    res.status(200).json({
      name: resultado.name,
      weightGrams: resultado.weightGrams,
      unit: resultado.unit,
      brand: resultado.brand,
      imageBase64,
      source: resultado.source,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Erro ao consultar bases de produtos externas.",
      details: error.message,
    });
  }
};
