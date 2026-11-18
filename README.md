# MetalTech 4.0

**Plataforma de monitoramento de uma esteira didática de triagem**

Projeto Interdisciplinar II · Análise e Desenvolvimento de Sistemas · SENAI São Carlos · 2026

O MetalTech 4.0 classifica passagens de peças metálicas e não metálicas a partir de sensores IO-Link. O dashboard exibe contagens, histórico, nível de um reservatório virtual e uma representação 3D da bancada.

[Dashboard publicado no GitHub Pages](https://felipemazzi-netizen.github.io/MetalTech-AtvInt/) · [Código no GitHub](https://github.com/felipemazzi-netizen/MetalTech-AtvInt)

## Seis disciplinas

| Disciplina | Entrega |
| --- | --- |
| Automação Industrial | Aquisição HTTP do master ifm AL1300, leitura das portas X01 a X03 e classificação por passagem. |
| Ciência de Dados | Estatística descritiva, gráficos e relatório em Python, com identificação da origem dos dados. |
| Computação em Nuvem | Serviços locais em Docker Compose, opção de MySQL em contêiner e publicação do frontend estático pelo GitHub Actions. |
| Desenvolvimento Back-end | API REST em Java 21 e Spring Boot 3.4, persistência com JPA e MySQL, migrações Flyway, CRUD de sensores e testes JUnit. |
| Eletiva I — Realidade Aumentada | Gêmeo digital navegável em WebGL2 na aba **RA** e protótipo WebAR com câmera em `ar/`. |
| Frameworks Front-end | Dashboard React com Vite, Tailwind CSS, Recharts e Lucide. Inclui gráficos, estados dos sensores e modo demonstração. |

## Arquitetura e componentes

```text
Sensores X01, X02 e X03 ── IO-Link ──► ifm AL1300
                                          ▲
                               leitura HTTP do PDIn
                                          │
                                    Coletor Python
                                          │ POST /api/ingest
                                          ▼
                           MySQL ◄── API Spring Boot ◄── Dashboard React
                                                         (inclui RA 3D)
```

| Caminho | Conteúdo |
| --- | --- |
| [collector/](collector/) | Coletor Python com biblioteca padrão. Lê o AL1300 ou reproduz um CSV. |
| [backend/](backend/) | API REST, interpretação dos sinais, contagem por passagem, calibração e persistência. |
| [frontend/](frontend/) | Abas Visão Geral, Esteira & Sensores, Nível do Tanque, RA e Ciência de Dados. |
| [analytics/](analytics/) e [data/](data/) | Análise offline com pandas, NumPy e Matplotlib, com CSV de captura, passagens inferidas e série simulada. |
| [ar/](ar/) e [infrastructure/](infrastructure/) | Protótipo WebAR e configuração do Nginx que o serve localmente. |
| [scripts/](scripts/) | Geração de chaves e consultas SQL para o MySQL Workbench. |
| [docker-compose.yml](docker-compose.yml) e [docker-compose.mysql-container.yml](docker-compose.mysql-container.yml) | Serviços locais e configuração opcional do banco em contêiner. |
| [deploy-pages.yml](.github/workflows/deploy-pages.yml) | Build e publicação estática no GitHub Pages. |

## Modo demonstração e RA 3D

Abra o dashboard e clique em **Modo demonstração**. Na aba **RA**, adicione peças metálicas e não metálicas. Acompanhe a animação e os indicadores de X01, X02 e X03 na maquete ou em **Esteira & Sensores**. Na aba **Nível do Tanque**, o controle de distância permite demonstrar a conversão em percentual. A aba **Ciência de Dados** calcula métricas a partir dos eventos simulados. O modo demonstração roda no navegador, sem coletor, requisições de ingestão ou gravações no MySQL.

A aba **RA** (`#ra`) abre o gêmeo digital em WebGL2. É possível girar o modelo, aplicar zoom e trocar de vista. No modo conectado, novas contagens da API podem disparar animações de passagem. A posição das peças é ilustrativa. O gêmeo digital funciona sem câmera ou marcador.

O protótipo separado em `ar/` usa A-Frame e MindAR, solicita acesso à câmera e reconhece o alvo de imagem compilado em `ar/targets.mind`. O Docker o serve em [localhost:8082/ar/](http://localhost:8082/ar/). No Pages, a rota `/ar/` abre a aba 3D do dashboard.

## Instalação local no Windows

Para o ambiente completo, use Docker Desktop com contêineres Linux e Python 3.11 ou superior para o coletor e a análise. Use Node.js 22 para executar o frontend diretamente e Java 21 com Maven para trabalhar no backend fora do Docker.

Na raiz do projeto, crie o `.env` se ele ainda não existir. O gerador imprime as chaves no terminal para serem copiadas no arquivo.

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
python scripts/gerar_env.py
```

Preencha `DB_PASSWORD`, `INGEST_API_KEY` e `ADMIN_API_KEY`. Em MySQL local, ajuste também `DB_USER` se necessário. Para o MySQL em contêiner, preencha `MYSQL_ROOT_PASSWORD`. A chave de ingestão deve coincidir no backend e no coletor. Mantenha as senhas e as chaves no ambiente local.

### Opção A — MySQL instalado no Windows

Com o MySQL Server 8 em execução, crie a base pelo Workbench ou cliente SQL e use uma conta com permissões para as migrações e operações da aplicação.

```sql
CREATE DATABASE IF NOT EXISTS metaltech
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

O backend em Docker se conecta a `host.docker.internal:3306/metaltech`. No Workbench, use o servidor local na porta `3306`.

### Opção B — MySQL em contêiner

Use o arquivo principal e a configuração adicional em todos os comandos desse ambiente.

```powershell
docker compose -f docker-compose.yml -f docker-compose.mysql-container.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.mysql-container.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.mysql-container.yml ps
```

O MySQL 8.4 é inicializado com a base `metaltech`, usuário `metaltech` e senha definida por `DB_PASSWORD`. O backend usa `mysql:3306` pela rede interna. Para conectar pelo Workbench, use `127.0.0.1:3307`. Os dados ficam no volume `metaltech_mysql_data`. Use `down` sem `-v` para preservar esse volume.

### Endereços e banco

| Serviço | Endereço local |
| --- | --- |
| Dashboard e gêmeo digital | [localhost:8081](http://localhost:8081/) |
| API | [localhost:8080/api/dashboard](http://localhost:8080/api/dashboard) |
| Saúde do backend | [localhost:8080/actuator/health](http://localhost:8080/actuator/health) |
| Protótipo WebAR | [localhost:8082/ar/](http://localhost:8082/ar/) |

As portas publicadas pelo Compose ficam vinculadas a `127.0.0.1`. O Nginx do frontend encaminha `/api/` para o backend. Na inicialização, Flyway cria `pieces`, `sensor_readings`, `operator_users` e `sensor_devices`, com cadastro inicial dos sensores das portas 1 a 3. A tabela `operator_users` integra o esquema. A API atual usa chaves nos endpoints de escrita e ainda não oferece login ou CRUD de usuários. Veja as [consultas para o Workbench](scripts/workbench_consultas.sql).

### Frontend sem Docker

```powershell
cd frontend
npm ci
npm run dev
```

Abra [localhost:5173](http://localhost:5173/). Por padrão, o Vite encaminha `/api` a `http://localhost:8080`. Para indicar uma API diretamente, copie `frontend/.env.example` para `frontend/.env` e ajuste `VITE_API_BASE_URL`. Com o frontend sozinho, selecione **Modo demonstração**.

## Sensores IO-Link e coleta real

| Porta | Sensor | Uso |
| --- | --- | --- |
| X01 / 1 | Distância | Aproximação convertida em nível de um reservatório virtual. Leitura opcional. |
| X02 / 2 | Capacitivo | Presença de peças metálicas ou não metálicas. Limiar bruto a partir de 1000. |
| X03 / 3 | Indutivo | Confirmação de metal. Limiar bruto abaixo de 20000. |

A API consolida as amostras por passagem. O contador exige duas leituras positivas de presença, associa a detecção indutiva em uma janela de 400 ms e encerra o evento após 250 ms sem presença. Os limiares são empíricos da bancada. Falhas de leitura ficam como `null` e não equivalem à ausência de peça.

Para X01, a conversão linear didática usa `0x0050` (80) como 5 cm e 100% e `0x0331` (817) como 50 cm e 0%. Os pontos brutos são ajustáveis com `TANK_FULL_RAW` e `TANK_EMPTY_RAW`. A escala requer validação com a IODD e medições físicas. Sem leitura de X01 recente (10 s por padrão), o dashboard recebe o nível como indisponível.

Com a API ativa, abra outro PowerShell na raiz. Execute o coletor em um computador com acesso de rede ao master. O endereço abaixo é o padrão da bancada. Ajuste-o se necessário.

```powershell
$env:MASTER_URL = "http://10.110.12.41"
$env:API_URL = "http://localhost:8080"
$env:INGEST_API_KEY = (Get-Content .env | Where-Object { $_ -match '^INGEST_API_KEY=' } | Select-Object -First 1) -replace '^INGEST_API_KEY=', ''
1..3 | ForEach-Object {
    curl.exe --globoff --max-time 5 "$env:MASTER_URL/iolinkmaster/port[$_]/iolinkdevice/pdin/getdata"
}
python collector/collector.py --interval 0.08 --timeout 1.5 --distance --distance-every 10
```

Inicie o coletor separadamente. Ele lê X02 e X03 em paralelo a cada ciclo e, com as opções acima, também lê X01 a cada dez ciclos. A coleta consulta dados de processo por HTTP e não escreve no AL1300 ou aciona a esteira. Use uma instância de coleta por bancada. Se o coletor estiver em outro computador, `API_URL` deve apontar para uma API alcançável por ele.

### Replay de CSV

Com `API_URL` e `INGEST_API_KEY` definidos, este comando reenvia a captura com timestamps relativos ao momento da execução. O replay escreve no MySQL e pode duplicar contagens se for repetido.

```powershell
python collector/collector.py --replay data/captura_rapida_metaltech.csv --speed 2
```

## API REST

| Método | Rota | Comportamento |
| --- | --- | --- |
| `POST` | `/api/ingest` | Recebe de 1 a 500 amostras e retorna `accepted` e `registered`. Exige `X-Ingest-Key`. |
| `GET` | `/api/dashboard` | Totais por material, histórico recente, estado dos sensores e tanque. |
| `GET` | `/api/pieces` | Até 50 peças recentes. |
| `GET` | `/api/readings` | Até 1.000 leituras recentes. |
| `GET` | `/api/analytics/summary` | Média e desvio padrão da contagem por minuto para peças da última hora e mediana do tanque nas últimas leituras. |
| `GET` | `/api/sensors` e `/api/sensors/{id}` | Lista o cadastro de sensores ou consulta um sensor pelo ID. |
| `POST` | `/api/sensors` | Cadastra um sensor. Exige `X-Admin-Key`. |
| `PUT` e `DELETE` | `/api/sensors/{id}` | Atualiza ou exclui um sensor cadastrado. Exige `X-Admin-Key`. |
| `DELETE` | `/api/pieces` | Exclui todas as peças registradas. Exige `X-Admin-Key`. |
| `GET` | `/actuator/health` | Estado de saúde do backend. |

Corpo de exemplo para a ingestão (`Content-Type: application/json`). A API usa o horário atual quando `observedAt` é omitido. Se informado, o timestamp deve estar na janela entre 24 h no passado e 30 s no futuro.

```json
{
  "samples": [
    {
      "x01Hex": "0331",
      "x02Hex": "1001",
      "x03Hex": "1FFF"
    }
  ]
}
```

O cadastro de sensores recebe `port` (1 a 8, com restrição de unicidade), `sensorType` e `description` opcional. Esse cadastro descreve os dispositivos. O coletor usa as portas fixas X01–X03.

## Ciência de Dados

| Arquivo | Origem |
| --- | --- |
| `data/captura_rapida_metaltech.csv` | Captura de sinais da bancada. |
| `data/passagens_inferidas.csv` | Passagens inferidas a partir da captura. |
| `data/reservatorio_virtual_simulado.csv` | Série de nível simulada para fins didáticos. |

```powershell
python -m pip install -r analytics/requirements.txt
python analytics/analyze.py --readings data/captura_rapida_metaltech.csv --pieces data/passagens_inferidas.csv --tank data/reservatorio_virtual_simulado.csv --output analytics/output
```

A análise offline gera `RELATORIO.md`, gráficos dos sinais e das contagens, série temporal, histograma e boxplot do nível e `contagens_por_minuto.csv`. O relatório usa o intervalo interquartil (IQR) para identificar valores atípicos de nível.

## GitHub Pages

O [workflow de publicação](.github/workflows/deploy-pages.yml) roda em pushes para `main` ou por execução manual. No GitHub, a origem do Pages é **GitHub Actions**. O workflow compila o React com Node.js 22, usa o nome do repositório como caminho-base e publica `frontend/dist`. A rota publicada `/ar/` redireciona para `#ra`.

Sem a variável de repositório `VITE_API_BASE_URL`, o dashboard publicado abre em modo demonstração. Para integrar uma API hospedada separadamente, configure essa variável com a URL HTTPS do backend e ajuste `CORS_ORIGIN` na API para `https://felipemazzi-netizen.github.io`. O Pages hospeda o frontend. A API Java, o MySQL e o coletor precisam de ambientes próprios. Variáveis `VITE_*` são incorporadas ao build público.

## Testes e diagnóstico

No frontend, após `npm ci`:

```powershell
npm run test:demo
node --test src/sensorVisual.test.js
npm run lint
npm run build
```

No diretório `backend/`, execute `mvn test`.

Se o dashboard retornar HTTP 502, verifique `docker compose ps` e `docker compose logs --tail=100 backend`, usando os mesmos arquivos Compose da inicialização. Confira as credenciais, o acesso TCP ao MySQL e o resultado das migrações Flyway. Para falhas de coleta, confira as respostas HTTP de cada porta do AL1300. Se a aba RA indicar que WebGL2 está indisponível, verifique o suporte do navegador e a aceleração gráfica.
