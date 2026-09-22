/* Renomeador de PDFs — TAG + DATA
 * Front-end: PDF.js + Canvas + API /api/ocr + JSZip.
 */

const TAGS_VALIDAS = ["1BL44", "MRO 01", "MRO 02", "1BL29", "MRO 07"];

// Regiões relativas ao formulário de exemplo.
// [x, y, largura, altura], valores de 0 a 1.
// Se o modelo do formulário mudar, ajuste estas áreas.
const REGIOES = {
  data: { x: 0.675, y: 0.045, w: 0.315, h: 0.105 },
  tag:  { x: 0.695, y: 0.105, w: 0.300, h: 0.095 }
};

const input = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const processBtn = document.getElementById("processBtn");
const clearBtn = document.getElementById("clearBtn");
const resultsSection = document.getElementById("resultsSection");
const resultsBody = document.getElementById("resultsBody");
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const downloadBtn = document.getElementById("downloadBtn");
const selectedCount = document.getElementById("selectedCount");
const emptyState = document.getElementById("emptyState");

let selectedFiles = [];
let resultados = [];

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.3.289/pdf.worker.min.mjs";

input.addEventListener("change", () => {
  adicionarArquivos([...input.files]);
  input.value = "";
});

["dragenter", "dragover"].forEach(eventName => {
  dropzone.addEventListener(eventName, e => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropzone.addEventListener(eventName, e => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", e => {
  adicionarArquivos([...e.dataTransfer.files]);
});

clearBtn.addEventListener("click", limparTudo);
processBtn.addEventListener("click", processarTodos);
downloadBtn.addEventListener("click", baixarZip);

function adicionarArquivos(files) {
  const pdfs = files.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
  selectedFiles.push(...pdfs);
  atualizarInterface();
}

function atualizarInterface() {
  selectedCount.textContent = `${selectedFiles.length} arquivo${selectedFiles.length === 1 ? "" : "s"} selecionado${selectedFiles.length === 1 ? "" : "s"}`;
  processBtn.disabled = selectedFiles.length === 0;
  clearBtn.disabled = selectedFiles.length === 0;
  emptyState.hidden = selectedFiles.length !== 0;
}

function limparTudo() {
  selectedFiles = [];
  resultados = [];
  resultsBody.innerHTML = "";
  resultsSection.hidden = true;
  downloadBtn.disabled = true;
  progressBar.style.width = "0%";
  statusEl.textContent = "Pronto para receber os PDFs.";
  atualizarInterface();
}

async function processarTodos() {
  if (!selectedFiles.length) return;

  processBtn.disabled = true;
  clearBtn.disabled = true;
  resultados = [];
  resultsBody.innerHTML = "";
  resultsSection.hidden = false;
  downloadBtn.disabled = true;

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const percentual = Math.round((i / selectedFiles.length) * 100);
    progressBar.style.width = `${percentual}%`;
    statusEl.textContent = `Processando ${i + 1} de ${selectedFiles.length}: ${file.name}`;

    try {
      const resultado = await processarArquivo(file);
      resultados.push(resultado);
      adicionarLinha(resultado);
    } catch (error) {
      const resultado = {
        originalName: file.name,
        file,
        tag: "",
        date: "",
        confidence: 0,
        status: "erro",
        message: error?.message || "Erro desconhecido."
      };
      resultados.push(resultado);
      adicionarLinha(resultado);
    }
  }

  progressBar.style.width = "100%";
  statusEl.textContent = `Concluído: ${resultados.length} arquivo(s) processado(s).`;
  processBtn.disabled = false;
  clearBtn.disabled = false;
  downloadBtn.disabled = resultados.some(r => r.status !== "erro");
  atualizarNomesDuplicados();
}

async function processarArquivo(file) {
  const pageCanvas = await renderPrimeiraPagina(file, 2.0);

  const dataBlob = await recortarRegiao(pageCanvas, REGIOES.data);
  const tagBlob = await recortarRegiao(pageCanvas, REGIOES.tag);

  const [dataOCR, tagOCR] = await Promise.all([
    chamarOCR(dataBlob),
    chamarOCR(tagBlob)
  ]);

  let date = extrairData(dataOCR.text || "");
  let tagInfo = extrairTag(tagOCR.text || "");

  // Fallback: se um campo não foi reconhecido no recorte, manda a página
  // inteira uma única vez para tentar recuperar o dado.
  if (!date || !tagInfo.tag) {
    const fullBlob = await canvasParaBlob(pageCanvas);
    const fullOCR = await chamarOCR(fullBlob);
    const fullText = fullOCR.text || "";

    if (!date) date = extrairData(fullText);
    if (!tagInfo.tag) tagInfo = extrairTag(fullText);
  }

  const confidence = Math.min(
    100,
    Math.round(((tagInfo.score || 0) + (date ? 0.95 : 0)) / 1.95 * 100)
  );

  const status = tagInfo.tag && date && confidence >= 70 ? "ok" : "revisar";

  return {
    originalName: file.name,
    file,
    tag: tagInfo.tag || "",
    date: date || "",
    confidence,
    status,
    ocrTag: tagOCR.text || "",
    ocrDate: dataOCR.text || "",
    message: status === "ok" ? "" : "Confira TAG e/ou data."
  };
}

async function renderPrimeiraPagina(file, scale = 2) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  if (!pdf.numPages) throw new Error("PDF sem páginas.");

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const ctx = canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

function recortarRegiao(canvas, region) {
  return new Promise((resolve, reject) => {
    try {
      const sx = Math.max(0, Math.floor(canvas.width * region.x));
      const sy = Math.max(0, Math.floor(canvas.height * region.y));
      const sw = Math.min(canvas.width - sx, Math.floor(canvas.width * region.w));
      const sh = Math.min(canvas.height - sy, Math.floor(canvas.height * region.h));

      const crop = document.createElement("canvas");
      crop.width = sw;
      crop.height = sh;

      const ctx = crop.getContext("2d", { alpha: false });
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

      crop.toBlob(blob => {
        if (!blob) reject(new Error("Não foi possível criar a imagem para OCR."));
        else resolve(blob);
      }, "image/jpeg", 0.92);
    } catch (e) {
      reject(e);
    }
  });
}

function canvasParaBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) reject(new Error("Não foi possível preparar a página para OCR."));
      else resolve(blob);
    }, "image/jpeg", 0.86);
  });
}

async function chamarOCR(blob) {
  const base64 = await blobParaBase64(blob);

  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 })
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Servidor respondeu com status ${response.status}.`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Erro no OCR (${response.status}).`);
  }

  return data;
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairTag(texto) {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return { tag: "", score: 0 };

  // Primeiro tenta encontrar literalmente.
  for (const tag of TAGS_VALIDAS) {
    if (normalizado.includes(tag)) {
      return { tag, score: 1 };
    }
  }

  // Depois faz comparação aproximada para pequenos erros do OCR.
  const tokens = normalizado
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let melhor = { tag: "", score: 0 };

  for (const token of tokens) {
    for (const tag of TAGS_VALIDAS) {
      const score = similaridade(token, tag.replace(" ", ""));
      if (score > melhor.score) {
        melhor = { tag, score };
      }
    }
  }

  // Para evitar correções agressivas, exige 0.68.
  if (melhor.score >= 0.68) return melhor;
  return { tag: "", score: melhor.score };
}

function similaridade(a, b) {
  a = a.replace(/\s/g, "");
  b = b.replace(/\s/g, "");
  if (!a || !b) return 0;
  if (a === b) return 1;

  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + custo
      );
    }
  }

  return 1 - dp[m][n] / Math.max(m, n);
}

function extrairData(texto) {
  const t = String(texto || "").replace(/\s+/g, " ").trim();

  // Aceita 14.09, 14/09, 14-09 e também 14 . 09.
  const regexes = [
    /\b([0-3]?\d)\s*[./-]\s*(0?\d|1[0-2])\b/,
    /\b([0-3]?\d)\s+(0?\d|1[0-2])\b/
  ];

  for (const regex of regexes) {
    const match = t.match(regex);
    if (!match) continue;

    const day = Number(match[1]);
    const month = Number(match[2]);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}`;
    }
  }

  // Corrige alguns caracteres comuns de OCR no contexto de data.
  const corrigido = t
    .replace(/[OQ]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/[S]/g, "5");

  const m = corrigido.match(/\b([0-3]?\d)\s*[./-]\s*(0?\d|1[0-2])\b/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}`;
    }
  }

  return "";
}

function adicionarLinha(r) {
  const tr = document.createElement("tr");
  tr.dataset.index = String(resultados.length - 1);

  tr.innerHTML = `
    <td>
      <div class="file-name">${escapeHtml(r.originalName)}</div>
    </td>
    <td>
      <select class="tag-select" aria-label="TAG">
        <option value="">Selecione</option>
        ${TAGS_VALIDAS.map(tag => `<option value="${tag}" ${tag === r.tag ? "selected" : ""}>${tag}</option>`).join("")}
      </select>
    </td>
    <td>
      <input class="date-input" aria-label="Data" value="${escapeHtml(r.date)}" placeholder="DD.MM" maxlength="5">
    </td>
    <td>
      <span class="badge ${r.status}">${statusTexto(r.status)}</span>
      <small class="confidence">${r.confidence ? `${r.confidence}%` : ""}</small>
    </td>
    <td>
      <span class="output-name">${escapeHtml(nomeFinal(r))}</span>
    </td>
  `;

  const tagSelect = tr.querySelector(".tag-select");
  const dateInput = tr.querySelector(".date-input");

  tagSelect.addEventListener("change", () => {
    r.tag = tagSelect.value;
    atualizarResultado(r, tr);
  });

  dateInput.addEventListener("input", () => {
    r.date = normalizarDataDigitada(dateInput.value);
    dateInput.value = r.date;
    atualizarResultado(r, tr);
  });

  resultsBody.appendChild(tr);
}

function normalizarDataDigitada(value) {
  return String(value || "")
    .replace(/[^\d]/g, "")
    .slice(0, 4)
    .replace(/^(\d{2})(\d{0,2})$/, (_, a, b) => b ? `${a}.${b}` : a);
}

function atualizarResultado(r, tr) {
  const valido = TAGS_VALIDAS.includes(r.tag) && /^\d{2}\.\d{2}$/.test(r.date) && dataValida(r.date);
  r.status = valido ? "ok" : "revisar";

  const badge = tr.querySelector(".badge");
  badge.className = `badge ${r.status}`;
  badge.textContent = statusTexto(r.status);
  tr.querySelector(".output-name").textContent = nomeFinal(r);

  atualizarNomesDuplicados();
}

function dataValida(date) {
  const [d, m] = date.split(".").map(Number);
  return d >= 1 && d <= 31 && m >= 1 && m <= 12;
}

function nomeFinal(r) {
  if (!r.tag || !r.date) return "—";
  return `${r.tag} - ${r.date}.pdf`;
}

function atualizarNomesDuplicados() {
  const contagem = new Map();

  for (const r of resultados) {
    if (r.status === "erro" || !r.tag || !r.date) continue;
    const base = nomeFinal(r);
    const n = (contagem.get(base) || 0) + 1;
    contagem.set(base, n);
  }

  const ocorrencias = new Map();

  resultados.forEach((r, index) => {
    if (r.status === "erro" || !r.tag || !r.date) return;
    const base = nomeFinal(r);
    const total = contagem.get(base) || 0;
    const atual = (ocorrencias.get(base) || 0) + 1;
    ocorrencias.set(base, atual);

    const tr = resultsBody.querySelector(`tr[data-index="${index}"]`);
    if (!tr) return;

    const span = tr.querySelector(".output-name");
    span.textContent = total > 1
      ? base.replace(/\.pdf$/i, ` (${atual}).pdf`)
      : base;
  });
}

function statusTexto(status) {
  if (status === "ok") return "OK";
  if (status === "erro") return "Erro";
  return "Revisar";
}

async function baixarZip() {
  const prontos = resultados.filter(r =>
    r.status !== "erro" &&
    TAGS_VALIDAS.includes(r.tag) &&
    /^\d{2}\.\d{2}$/.test(r.date) &&
    dataValida(r.date)
  );

  if (!prontos.length) {
    alert("Não há documentos válidos para baixar.");
    return;
  }

  const zip = new JSZip();
  const contagem = new Map();
  const ocorrencias = new Map();

  for (const r of prontos) {
    const base = nomeFinal(r);
    contagem.set(base, (contagem.get(base) || 0) + 1);
  }

  for (const r of prontos) {
    const base = nomeFinal(r);
    const atual = (ocorrencias.get(base) || 0) + 1;
    ocorrencias.set(base, atual);

    const nome = (contagem.get(base) > 1)
      ? base.replace(/\.pdf$/i, ` (${atual}).pdf`)
      : base;

    zip.file(nome, r.file);
  }

  statusEl.textContent = "Gerando ZIP...";
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "documentos_renomeados.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  statusEl.textContent = `${prontos.length} documento(s) incluído(s) no ZIP.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

atualizarInterface();
