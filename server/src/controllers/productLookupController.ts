import { Request, Response } from "express";

const OSCBR_BASE_URL = "https://gtin.rscsistemas.com.br/api/v3/gtin";
const OSCBR_TOKEN_URL = "https://gtin.rscsistemas.com.br/api/v3/oauth/token";

type ResultadoBusca = {
  name: string | null;
  imageUrl: string | null;
  weightGrams: number | null;
  unit: "KG" | "ML_G";
  brand: string | null;
  source: "oscbr" | "openfoodfacts";
};

let tokenCache: { token: string; expiresAt: number } | null = null;

const baixarImagemComoBase64 = async (
  url: string,
  token?: string,
): Promise<string | null> => {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
};

const obterTokenOscbr = async (): Promise<string | null> => {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const user = process.env.OSCBR_USER;
  const pass = process.env.OSCBR_PASS;
  if (!user || !pass) return null;

  try {
    const credentials = Buffer.from(`${user}:${pass}`).toString("base64");
    const response = await fetch(OSCBR_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const token = data.token || null;

    if (token) {
      tokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
    }

    return token;
  } catch {
    return null;
  }
};

const buscarNaOscbr = async (
  ean: string,
): Promise<{ resultado: ResultadoBusca | null; token: string | null }> => {
  const token = await obterTokenOscbr();
  if (!token) return { resultado: null, token: null };

  try {
    const response = await fetch(`${OSCBR_BASE_URL}/${ean}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) return { resultado: null, token };

    const data = (await response.json()) as any;

    return {
      resultado: {
        name: data.nome_acento || data.nome || null,
        imageUrl: data.link_foto || `${OSCBR_BASE_URL}/${ean}/image`,
        weightGrams: null,
        unit: "KG",
        brand: data.marca || null,
        source: "oscbr",
      },
      token,
    };
  } catch {
    return { resultado: null, token };
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

    const buscaOscbr = await buscarNaOscbr(ean);
    let resultado = buscaOscbr.resultado;
    const tokenUsado = buscaOscbr.token;

    // Sempre consulta o Open Food Facts — serve tanto de complemento
    // (peso, imagem) quanto de fallback total caso o OSCBR não retorne nada.
    const dadosOff = await buscarNoOpenFoodFacts(ean);

    if (resultado?.name) {
      // Completa o peso apenas se o OSCBR não trouxe
      if (!resultado.weightGrams && dadosOff?.weightGrams) {
        resultado.weightGrams = dadosOff.weightGrams;
        resultado.unit = dadosOff.unit;
      }
    } else {
      resultado = dadosOff;
    }

    if (!resultado?.name) {
      res
        .status(404)
        .json({ error: "Produto não encontrado nas bases externas." });
      return;
    }

    // 1ª tentativa: imagem do OSCBR
    let imageBase64: string | null = null;
    if (resultado.imageUrl) {
      imageBase64 = await baixarImagemComoBase64(
        resultado.imageUrl,
        resultado.source === "oscbr" ? tokenUsado || undefined : undefined,
      );
    }

    // Fallback: se o OSCBR não trouxe imagem válida, tenta a do Open Food Facts
    if (!imageBase64 && dadosOff?.imageUrl) {
      imageBase64 = await baixarImagemComoBase64(dadosOff.imageUrl);
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
