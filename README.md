# Renomeador de PDFs

Aplicação web desenvolvida para automatizar a identificação e renomeação de documentos PDF a partir de informações manuscritas presentes na primeira página.

O sistema utiliza **OCR (Optical Character Recognition)** através do **Google Cloud Vision API** para identificar a **TAG do equipamento** e a **data** registrada no formulário, permitindo renomear vários arquivos de forma rápida e padronizada.

## Objetivo

O projeto foi desenvolvido para reduzir o trabalho manual de organização de documentos e evitar erros durante a renomeação de arquivos.

Em vez de renomear cada PDF manualmente:

```text
SCAN001.pdf
SCAN002.pdf
SCAN003.pdf
```

o sistema identifica automaticamente as informações presentes nos documentos e gera nomes padronizados:

```text
MRO 02 - 14.09.pdf
1BL44 - 15.09.pdf
MRO 07 - 16.09.pdf
```

## Funcionamento

O fluxo principal da aplicação é:

```text
PDFs
  │
  ▼
Leitura da primeira página
  │
  ▼
Conversão para imagem
  │
  ▼
Google Cloud Vision OCR
  │
  ▼
Identificação da TAG + DATA
  │
  ▼
Validação dos resultados
  │
  ▼
Conferência pelo usuário
  │
  ▼
Renomeação
  │
  ▼
Download dos PDFs em ZIP
```

## TAGs suportadas

A primeira versão trabalha com as seguintes TAGs:

* `1BL44`
* `MRO 01`
* `MRO 02`
* `1BL29`
* `MRO 07`

O sistema também possui tolerância para pequenos erros de reconhecimento do OCR.

## Formato das datas

As datas são identificadas e mantidas no padrão:

```text
DD.MM
```

Exemplo:

```text
14.09
25.10
03.11
```

## Exemplo

Entrada:

```text
documento_001.pdf
```

Informações identificadas:

```text
TAG: MRO 02
DATA: 14.09
```

Resultado:

```text
MRO 02 - 14.09.pdf
```

## Principais recursos

* Upload de múltiplos PDFs
* Arrastar e soltar arquivos
* Processamento automático
* Leitura da primeira página
* OCR para escrita manuscrita
* Identificação automática de TAG
* Identificação automática de data
* Correção aproximada de erros do OCR
* Conferência dos resultados antes da renomeação
* Correção manual de TAG e data
* Detecção de nomes duplicados
* Geração de arquivo ZIP
* Preservação do conteúdo original dos PDFs

## Tecnologias

### Front-end

* HTML
* CSS
* JavaScript
* PDF.js

### Back-end

* Node.js
* Vercel Functions
* Google Cloud Vision API

### OCR

O reconhecimento de texto é realizado através do:

**Google Cloud Vision API — Document Text Detection**

A API é utilizada para extrair informações dos formulários, incluindo texto manuscrito.

## Estrutura do projeto

```text
renomeador-pdfs-web/
│
├── api/
│   └── ocr.mjs
│
├── public/
│   └── app.js
│
├── index.html
├── style.css
├── package.json
├── vercel.json
├── .gitignore
└── README.md
```

## Configuração

Para utilizar o OCR, é necessário possuir um projeto no Google Cloud com a **Cloud Vision API** habilitada.

As credenciais do Google Cloud devem ser configuradas através de variáveis de ambiente ou do mecanismo de autenticação apropriado para o ambiente de execução.

**Nunca coloque credenciais ou chaves privadas diretamente no código ou no repositório.**

## Segurança

Este projeto foi desenvolvido para manter as credenciais do Google Cloud no ambiente do servidor.

Os PDFs são processados para identificação das informações necessárias à renomeação e não são alterados durante o processo.

Antes de utilizar documentos reais, especialmente documentos corporativos, é importante verificar as políticas da organização relacionadas ao envio de arquivos para serviços externos de OCR.

## Status

**Versão atual: v1.0**

A primeira versão está focada na automação do processo de:

```text
PDF → OCR → TAG + DATA → Conferência → Renomeação
```

## Próximos passos

Possíveis melhorias futuras:

* Aumentar a precisão do OCR para diferentes tipos de escrita
* Melhorar a detecção automática das regiões do formulário
* Processamento de grandes quantidades de arquivos
* Histórico de processamentos
* Relatório de erros de OCR
* Configurações personalizáveis de TAGs
* Interface de configuração das regras de nomenclatura
* Melhor tratamento de documentos com baixa qualidade
* Suporte a novos modelos de formulários

## Licença

Projeto desenvolvido para fins de automação e organização de documentos.

A licença do projeto pode ser definida conforme a finalidade de distribuição do software.
