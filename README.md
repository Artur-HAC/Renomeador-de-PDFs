# Renomeador de PDFs — TAG + DATA

Aplicação web para processar PDFs escaneados de formulários com campos manuscritos.

## Regra atual

TAGs válidas:

- 1BL44
- MRO 01
- MRO 02
- 1BL29
- MRO 07

Formato de saída:

`[TAG] - [DATA].pdf`

Exemplo:

`MRO 02 - 14.09.pdf`

A data é mantida no padrão `DD.MM`.

## Como funciona

1. O navegador recebe vários PDFs.
2. PDF.js renderiza a primeira página de cada PDF como imagem.
3. O navegador recorta as regiões de DATA e TAG do formulário.
4. O backend `/api/ocr` envia cada recorte para o Google Cloud Vision.
5. A aplicação normaliza o OCR e compara a TAG com a lista permitida.
6. O usuário revisa/corrige os resultados.
7. O navegador gera um ZIP com os PDFs originais, apenas com os nomes alterados.

## Requisito externo

O backend usa a API Cloud Vision `DOCUMENT_TEXT_DETECTION`, que suporta OCR de documentos e escrita à mão.

É necessário criar uma chave de API no Google Cloud e habilitar a Cloud Vision API.

A chave deve ficar somente no servidor, em uma variável de ambiente:

`GOOGLE_VISION_API_KEY`

Nunca coloque essa chave no `index.html`.

## Deploy sem instalar nada no PC do trabalho

A forma mais simples é publicar este projeto na Vercel.

No computador usado para fazer o deploy:

1. Crie um projeto na Vercel.
2. Importe este projeto/repositório.
3. Em Environment Variables, crie:
   - Nome: `GOOGLE_VISION_API_KEY`
   - Valor: sua chave da API Vision
4. Faça o deploy.
5. No computador do trabalho, abra a URL gerada no navegador.

Não é necessário instalar VS Code, Python ou Node.js no computador que vai usar o sistema.

## Desenvolvimento local

Opcional. Requer Node.js e Vercel CLI:

`npm install -g vercel`

Depois:

`vercel dev`

Mas isso é apenas para desenvolvimento. O uso normal pode ser totalmente pelo navegador.

## Observações importantes

- A primeira versão processa a primeira página de cada PDF.
- O formulário precisa manter aproximadamente o mesmo layout do exemplo enviado.
- As áreas de TAG e DATA estão configuradas como proporções da página e podem ser ajustadas em `public/app.js`.
- O sistema não altera o conteúdo do PDF. Ele somente usa a imagem para reconhecer os campos e depois coloca o PDF original no ZIP com o novo nome.
- Se o OCR não tiver segurança suficiente, o item fica como "Revisar".
- Se dois PDFs resultarem no mesmo nome, o sistema adiciona `(2)`, `(3)` etc. para evitar sobrescrever arquivos.

## Segurança e dados

Os recortes enviados ao backend são encaminhados ao serviço de OCR configurado. Para documentos de trabalho, confirme com a empresa se o uso de um serviço externo de OCR é permitido antes de colocar documentos reais no sistema.
