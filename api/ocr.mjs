const MAX_IMAGE_BYTES = 4_000_000;

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GOOGLE_VISION_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const image = body?.image;

    if (!image || typeof image !== "string") {
      return Response.json({ error: "Imagem não enviada." }, { status: 400 });
    }

    // A string base64 ocupa aproximadamente 4/3 do tamanho binário.
    // Limite simples para evitar requisições excessivamente grandes.
    if (image.length > Math.ceil(MAX_IMAGE_BYTES * 1.4)) {
      return Response.json({ error: "Imagem muito grande para processamento." }, { status: 413 });
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const detail =
        data?.error?.message ||
        "A API Vision recusou a solicitação.";
      return Response.json({ error: detail }, { status: response.status });
    }

    const annotation = data?.responses?.[0]?.fullTextAnnotation;
    const text = annotation?.text || "";

    return Response.json({
      text,
      detected: Boolean(text),
      pages: annotation?.pages?.length || 0
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Erro interno ao executar OCR." },
      { status: 500 }
    );
  }
}

export function GET() {
  return Response.json({
    ok: true,
    service: "ocr",
    message: "Endpoint ativo. Use POST para enviar uma imagem."
  });
}
