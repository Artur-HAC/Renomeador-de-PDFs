import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { POST as ocrPOST, GET as ocrGET } from "./api/ocr.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();

// As imagens chegam em base64 dentro do JSON, por isso o limite maior.
app.use(express.json({ limit: "10mb" }));

// Adapta o handler Web-standard (Request/Response) usado na Vercel para o Express,
// evitando duplicar a lógica de chamada à Google Vision.
async function runWebHandler(handler, req, res) {
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const request = new Request(`http://localhost${req.originalUrl}`, {
    method: req.method,
    headers: { "content-type": "application/json" },
    body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
  });

  const response = await handler(request);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(await response.text());
}

app.get("/api/ocr", (req, res) => runWebHandler(ocrGET, req, res));
app.post("/api/ocr", (req, res) => runWebHandler(ocrPOST, req, res));

// Arquivos estáticos: app.js fica em /public mas é referenciado como /app.js,
// enquanto index.html e style.css ficam na raiz do projeto.
app.use(express.static(join(__dirname, "public")));
app.use(express.static(__dirname, { index: "index.html" }));

app.listen(PORT, () => {
  console.log(`[server] Renomeador de PDFs ativo em http://localhost:${PORT}`);
});
