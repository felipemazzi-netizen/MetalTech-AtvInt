<div align="center">

# METALTECH 4.0

**Plataforma Inteligente de Monitoramento Industrial**  
**Projeto Interdisciplinar II · Análise e Desenvolvimento de Sistemas · SENAI · 2026**

Monitoramento da esteira • Sensores IO-Link • Dashboard React • Gêmeo digital 3D • Ciência de Dados

</div>

---

## 1. Visão geral

O **MetalTech 4.0** é um projeto educacional de supervisão de uma esteira de triagem. O sistema lê os sensores de um **ifm AL1300 IO-Link Master**, classifica peças metálicas e não metálicas, registra eventos em MySQL, disponibiliza uma API em Java/Spring Boot e apresenta as informações em um dashboard React. Inclui uma aba **RA** com um **modelo tridimensional WebGL2 interativo da bancada**, além de métricas e gráficos estatísticos em Python.

O projeto funciona de dois modos:

- **Conectado:** o coletor Python lê o AL1300 e envia amostras à API. A maquete 3D reproduz os eventos detectados; **a posição das peças é ilustrativa**, não medida continuamente pela bancada.
- **Demonstração:** dashboard, métricas e animações 3D funcionam no navegador, sem esteira física, sem gravar dados fictícios no MySQL. É o modo usado no GitHub Pages quando não existe uma API pública configurada.

A aba **RA** é um **gêmeo digital 3D interativo** (orbitagem, zoom e seleção de sensores), **não** RA por câmera. O experimento antigo por marcador pode permanecer na pasta `ar/`, mas não é necessário para a apresentação principal.

## 2. Tecnologias e disciplinas

| Disciplina | Entrega no repositório |
|---|---|
| Automação Industrial | Coletor HTTP do AL1300, leitura X01/X02/X03, classificação e ensaios da bancada (`collector/`, `docs/AUTOMACAO_BANCADA.md`) |
| Desenvolvimento Back-end | Java 21, Spring Boot, API REST, JPA, Flyway, testes (`backend/`) |
| Computação em Nuvem | Docker Compose, redes de serviços, banco e estratégia de publicação (`docker-compose*.yml`, `docs/ARQUITETURA_NUVEM.md`) |
| Ciência de Dados | Python, estatística descritiva, gráficos e relatório (`analytics/`) |
| Frameworks Front-end | React, Vite, TailwindCSS, Recharts, KPIs, gráficos e modo demonstração (`frontend/`) |
| Realidade Aumentada — Eletiva I | Aba **RA** com modelo 3D WebGL2, câmera interativa, sensores e peças animadas (`frontend/src/Conveyor3D.jsx`) |

**Observação acadêmica:** a demonstração de infraestrutura com Docker local não equivale a um back-end hospedado em nuvem pública; a aba RA corresponde tecnicamente a um gêmeo digital, e essa distinção deve aparecer na apresentação.

## 3. Arquitetura

```text
Esteira + três sensores laranja IO-Link
                │
        ifm AL1300
                │ HTTP (somente leitura)
                ▼
      collector/collector.py
                │ POST /api/ingest + chave
                ▼
       API Java Spring Boot ◄──── consultas GET
                │                       ▲
                ▼                       │
              MySQL              Dashboard React
                                   ├── Visão Geral
                                   ├── Esteira & Sensores
                                   ├── Nível do Tanque
                                   ├── RA / maquete 3D
                                   └── Ciência de Dados
```

O coletor **não é iniciado automaticamente pelo Docker**: para usar os sensores reais, é necessário executá-lo no computador conectado à rede.

### Sensores utilizados

| Porta | Sensor | Função |
|---|---|---|
| **X01 / port[1]** | Distância | De frente para a correia, mede a aproximação da peça; distância representa o nível virtual do reservatório |
| **X02 / port[2]** | Capacitivo | Detecta a presença da peça, metálica ou não |
| **X03 / port[3]** | Indutivo | Detecta peças metálicas; atua em conjunto com X02 na classificação |

Na **simulação**, a aproximação do X01 é representada por **50 cm (longe) até 5 cm (perto)**. A conversão didática para nível é `nível (%) = (50 − distância em cm) / 45 × 100`, limitada a 0–100%. O mapeamento dos valores brutos `0x0331 ≈ 50 cm` e `0x0050 ≈ 5 cm` é **provisório**, sujeito a calibração/iodd. O sensor real não deve ser descrito como medição calibrada até confirmação na bancada.

Na maquete, **o corpo dos três sensores laranja permanece fixo**; **somente os LEDs verdes de detecção acendem** quando a peça está na zona correspondente. O X02 responde a ambos os materiais; o X03 somente a metal; o X01 mostra a aproximação frontal.

## 4. Estrutura do projeto

```text
MetalTech_Integrado_2026/
├── README.md                    # Guia principal
├── .env.example                 # Modelo de configuração
├── .github/workflows/           # Publicação automática GitHub Pages
├── frontend/                    # React, dashboard, RA 3D e testes de simulação
├── backend/                     # API Java, migrações e testes
├── collector/                   # Leitura IO-Link / replay de CSV utilizados
├── analytics/                   # Análises e gráficos de exemplo
├── ar/                          # Protótipo WebAR, com acionamento por tirgger genérico (opcional)
├── data/                        # Capturas de ensaio e dados didáticos
├── infrastructure/              # Configuração auxiliar Nginx
├── scripts/                     # Geração de chaves e SQL para Workbench
├── docker-compose.yml
└── docker-compose.mysql-container.yml
```

As documentações técnicas e guias por disciplina continuam em `docs/` para consulta da equipe, mas **somente este arquivo se chama `README.md`**.

## 5. Execução local — MySQL instalado no Windows

**Pré-requisitos:** Docker Desktop com containers Linux, MySQL Server (Workbench é apenas o cliente), Python 3.11+ para o coletor e acesso à LAN da bancada para ensaio real.

1. Extraia o projeto e abra o PowerShell **na pasta que contém `docker-compose.yml`**.
2. Na conexão MySQL já existente do Workbench, execute:

```sql
CREATE DATABASE IF NOT EXISTS metaltech
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Crie o arquivo `.env` sem publicá-lo:

```powershell
Copy-Item .env.example .env
python scripts/gerar_env.py
```

Copie para o `.env` as duas chaves geradas (`INGEST_API_KEY`, `ADMIN_API_KEY`). Defina `DB_USER=root` (ou usuário autorizado) e `DB_PASSWORD` com a senha do MySQL **existente no Windows**. Não compartilhe as credenciais.

4. Inicie os serviços:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

| Serviço | Endereço local |
|---|---|
| Dashboard + aba **RA** | http://localhost:8081 |
| API REST | http://localhost:8080/api/dashboard |
| Protótipo AR legado (opcional) | http://localhost:8082/ar/ |

A API deve retornar JSON. Se o frontend mostrar HTTP 502, verifique `docker compose logs --tail=100 backend`. O backend acessa o MySQL do Windows por `host.docker.internal:3306`.

### Alternativa: MySQL no próprio Docker

Preencha também `MYSQL_ROOT_PASSWORD` no `.env` e execute **uma única** opção de infraestrutura:

```powershell
docker compose -f docker-compose.yml -f docker-compose.mysql-container.yml up -d --build
```

Neste modo, o Workbench conecta a `127.0.0.1:3307` com usuário `root` e `MYSQL_ROOT_PASSWORD` do `.env`. Não misture os dois modos de banco sem intenção. **Não use `docker compose down -v`**: o comando pode apagar o volume persistente.

## 6. Coleta dos sensores reais

No computador com acesso à rede do AL1300, confirme a comunicação:

```powershell
curl.exe --globoff --max-time 5 "http://10.110.12.41/iolinkmaster/port[2]/iolinkdevice/pdin/getdata"
curl.exe --globoff --max-time 5 "http://10.110.12.41/iolinkmaster/port[3]/iolinkdevice/pdin/getdata"
curl.exe --globoff --max-time 5 "http://10.110.12.41/iolinkmaster/port[1]/iolinkdevice/pdin/getdata"
```

Com a API funcionando, abra **outro PowerShell** na raiz do projeto:

```powershell
$env:MASTER_URL="http://10.110.12.41"
$env:API_URL="http://localhost:8080"
$env:INGEST_API_KEY=(Get-Content .env | Where-Object { $_ -match '^INGEST_API_KEY=' } | Select-Object -First 1) -replace '^INGEST_API_KEY=',''
python collector/collector.py --interval 0.08 --timeout 1.5 --distance --distance-every 10
```

`--distance` **habilita X01**, e `--distance-every 10` reduz a frequência dessa leitura. X02 e X03 são consultados em paralelo. O coletor é somente leitura e envia lotes à API; falhas de rede não são interpretadas como ausência de peça. **Não execute dois coletores ao mesmo tempo**, pois podem duplicar registros.

Se o coletor e o backend estiverem em computadores diferentes, ajuste `API_URL` e a publicação da porta 8080 com as permissões de rede apropriadas. A configuração padrão publica o backend somente em `127.0.0.1` do PC Docker, para evitar exposição involuntária.

### Teste por captura gravada — atenção: grava no MySQL

```powershell
python collector/collector.py --replay data/captura_rapida_metaltech.csv --speed 2
```

O replay é útil para validar o fluxo sem bancada, mas **repeti-lo pode duplicar contagens no banco**. Para simular sem alterar produção, use o botão **Modo demonstração** no dashboard.

## 7. Modo demonstração, RA 3D e Ciência de Dados

1. Abra o dashboard e clique em **Modo demonstração**.
2. Entre na aba **RA** e dispare **+ Peça metálica** e **+ Peça não metálica**.
3. Gire a maquete arrastando; use o zoom e as vistas predefinidas.
4. Observe a peça percorrendo a correia e os **LEDs verdes** dos sensores acendendo na detecção.
5. Em **Nível do Tanque**, altere a distância didática e confira o percentual.
6. Em **Ciência de Dados**, acompanhe média de produção/min, desvio padrão, mediana de nível e outliers calculados com os eventos simulados.

A simulação não envia comandos para o AL1300, não move a esteira real nem persiste peças no MySQL.

Para gerar o relatório estatístico a partir das capturas e dos dados didáticos:

```powershell
python -m pip install -r analytics/requirements.txt
python analytics/analyze.py --readings data/captura_rapida_metaltech.csv --pieces data/passagens_inferidas.csv --tank data/reservatorio_virtual_simulado.csv --output analytics/output
```

Os gráficos de exemplo ficam em `analytics/output/`. **O conjunto do reservatório é simulado e deve ser identificado como tal** em qualquer relatório ou apresentação.

## 8. Testes e diagnóstico

Na pasta `frontend/`:

```powershell
cd frontend
npm ci --no-audit --no-fund
npm run test:demo
node --test src/sensorVisual.test.js
npm run build
```

Para inspecionar o backend:

```powershell
docker compose logs --tail=100 backend
```

**Erros frequentes:**

- **`npm ci` / `EUSAGE`:** garanta que `frontend/package.json` e `frontend/package-lock.json` são da **mesma versão**; não preserve o lockfile antigo no repositório.
- **`HTTP 502`:** API/backend indisponível; confira MySQL, migrações e logs.
- **Sensores sem leitura:** teste rede, IP do AL1300 e endpoints com `curl.exe --globoff`.
- **WebGL indisponível:** use Chrome/Edge atualizado e habilite aceleração gráfica; a RA 3D requer WebGL2.
- **Sem eventos na RA conectada:** confirmar que o coletor está em execução e que os eventos estão chegando em `/api/dashboard`.

---

<div align="center">

**MetalTech 4.0 · Projeto acadêmico SENAI · 2026**  
*Integração entre automação industrial, software e análise de dados.*

</div>
