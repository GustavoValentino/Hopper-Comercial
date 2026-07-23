import { Request, Response as ExpressResponse } from "express";

const OSCBR_BASE_URL = "https://gtin.rscsistemas.com.br/api/v3/gtin";
const OSCBR_TOKEN_URL = "https://gtin.rscsistemas.com.br/api/v3/oauth/token";

const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

type ResultadoBusca = {
  name: string | null;
  imageUrl: string | null;
  weightGrams: number | null;
  unit: "KG" | "ML_G";
  brand: string | null;
  source: "oscbr" | "openfoodfacts";
};

type RespostaLookup = {
  name: string;
  weightGrams: number | null;
  unit: "KG" | "ML_G";
  brand: string | null;
  imageBase64: string | null;
  source: string;
};

// ── Cache em memória por EAN ─────────────────────────────────
const cacheLookup = new Map<
  string,
  { dados: RespostaLookup; expiraEm: number }
>();

const obterDoCache = (ean: string): RespostaLookup | null => {
  const item = cacheLookup.get(ean);
  if (!item) return null;
  if (Date.now() > item.expiraEm) {
    cacheLookup.delete(ean);
    return null;
  }
  return item.dados;
};

const salvarNoCache = (ean: string, dados: RespostaLookup) => {
  cacheLookup.set(ean, { dados, expiraEm: Date.now() + CACHE_TTL_MS });
};

// ── Fetch com timeout ────────────────────────────────────────
const fetchComTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS,
): Promise<globalThis.Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

let tokenCache: { token: string; expiresAt: number } | null = null;

const baixarImagemComoBase64 = async (
  url: string,
  token?: string,
): Promise<string | null> => {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetchComTimeout(url, { headers });
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
    const response = await fetchComTimeout(OSCBR_TOKEN_URL, {
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
    const response = await fetchComTimeout(`${OSCBR_BASE_URL}/${ean}`, {
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
    const response = await fetchComTimeout(
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
  res: ExpressResponse,
): Promise<void> => {
  try {
    const { ean } = req.params;

    if (!ean || ean.length < 8) {
      res.status(400).json({ message: "Código EAN inválido." });
      return;
    }

    // 1. Verifica o cache primeiro
    const emCache = obterDoCache(ean);
    if (emCache) {
      res.status(200).json(emCache);
      return;
    }

    // 2. Consultas em paralelo (OSCBR + Open Food Facts)
    const [buscaOscbr, dadosOff] = await Promise.all([
      buscarNaOscbr(ean),
      buscarNoOpenFoodFacts(ean),
    ]);

    let resultado = buscaOscbr.resultado;
    const tokenUsado = buscaOscbr.token;

    if (resultado?.name) {
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

    // 3. Download de imagem (OSCBR primeiro, Open Food Facts como fallback)
    let imageBase64: string | null = null;
    if (resultado.imageUrl) {
      imageBase64 = await baixarImagemComoBase64(
        resultado.imageUrl,
        resultado.source === "oscbr" ? tokenUsado || undefined : undefined,
      );
    }

    if (!imageBase64 && dadosOff?.imageUrl) {
      imageBase64 = await baixarImagemComoBase64(dadosOff.imageUrl);
    }

    const resposta: RespostaLookup = {
      name: resultado.name,
      weightGrams: resultado.weightGrams,
      unit: resultado.unit,
      brand: resultado.brand,
      imageBase64,
      source: resultado.source,
    };

    // 4. Salva no cache para próximas consultas do mesmo EAN
    salvarNoCache(ean, resposta);

    res.status(200).json(resposta);
  } catch (error: any) {
    res.status(500).json({
      message: "Erro ao consultar bases de produtos externas.",
      details: error.message,
    });
  }
};
