# MVP Design — Freshservice Analytics App

**Nombre provisional**: InsightDesk (o por definir)
**Fecha**: 2026-03-27

---

## Qué problema resuelve

Freshservice tiene analytics limitado:
- No guarda histórico de estados de tickets
- No permite drill-down por agente/categoría/SLA cruzado
- Nuevos usage limits (marzo 2026) borran reports que excedan cuotas
- No hay tendencias ni predicciones
- Export limitado — no genera informes para management

---

## Limitaciones técnicas que condicionan el diseño

| Recurso | Límite | Impacto |
|---------|--------|---------|
| Entity Storage | 10,000 registros/entidad, 5 entidades | Almacenar datos AGREGADOS, no raw |
| Scheduled events | 1 evento recurrente, 20s timeout | 1 cron que recolecta y agrega todo |
| API Freshservice | 100-500 req/min (compartido) | Polling eficiente, no abusar |
| Serverless RAM | 128 MB | Agregaciones ligeras |
| Frontend | React via Platform 3.0 + Webpack | Chart.js/Recharts para gráficos |
| External APIs | 50 req/min, 15-30s timeout | Viable para IA (BYOK, fase 2) |

---

## Estrategia de datos

### El truco: AGREGAR, no almacenar raw

Con 10,000 registros/entidad, si guardamos 1 registro diario por dimensión:
- 365 días × 20 categorías = 7,300 registros → cabe en 1 entidad
- 365 días × 10 agentes = 3,650 registros → cabe en 1 entidad
- 365 días (métricas globales) = 365 registros → sobra

### 5 Entidades (máximo permitido)

| Entidad | Qué guarda | Granularidad | ~Registros/año |
|---------|-----------|--------------|----------------|
| `daily_metrics` | Tickets abiertos, cerrados, backlog, MTTR | 1/día | 365 |
| `category_metrics` | Tickets por categoría por día | 1/día/categoría | ~7,300 |
| `agent_metrics` | Tickets por agente por día, tiempos | 1/día/agente | ~3,650 |
| `sla_metrics` | Cumplimiento SLA por día y prioridad | 1/día/prioridad | ~1,460 |
| `app_config` | Settings del usuario, umbrales, API keys | N/A | <100 |

**Resultado**: ~3 años de histórico con holgura. Sin coste externo.

### Scheduled Event (cron diario)

1 evento recurrente, 1x/día (o cada 6h):
1. Llama a API Freshservice: `/api/v2/tickets?updated_since=yesterday`
2. Agrega métricas del período
3. Guarda en Entity Storage
4. ~10-15 API calls por ejecución → dentro de límites

---

## Pantallas del MVP

### Pantalla 1: Overview Dashboard (full page app)

```
┌─────────────────────────────────────────────────┐
│  InsightDesk                          [Config ⚙]│
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │  42  │  │  12  │  │ 94%  │  │ 3.2h │        │
│  │Open  │  │New/d │  │ SLA  │  │ MTTR │        │
│  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                  │
│  [Ticket Volume - 30 días]          [SLA Trend] │
│  ┌─────────────────────┐  ┌───────────────────┐│
│  │  📈 línea temporal   │  │  📈 % cumplimiento││
│  │  abiertos vs cerrados│  │  por prioridad    ││
│  └─────────────────────┘  └───────────────────┘│
│                                                  │
│  [Por Categoría - top 10]  [Por Agente]         │
│  ┌─────────────────────┐  ┌───────────────────┐│
│  │  📊 barras horizont. │  │  📊 carga actual  ││
│  │  con tendencia       │  │  + tiempo medio   ││
│  └─────────────────────┘  └───────────────────┘│
│                                                  │
└─────────────────────────────────────────────────┘
```

**Métricas**:
- KPIs: Tickets abiertos, nuevos/día (media), SLA %, MTTR
- Gráfico 1: Volumen tickets (abiertos vs cerrados) últimos 30/60/90 días
- Gráfico 2: Tendencia SLA por prioridad
- Gráfico 3: Top 10 categorías (barras) con flecha de tendencia (↑↓)
- Gráfico 4: Carga por agente (tickets activos + tiempo medio resolución)

### Pantalla 2: SLA Deep Dive

- SLA compliance por: prioridad, categoría, agente, grupo
- Tickets en riesgo ahora (predicción simple: tiempo restante < 20%)
- Histórico de breaches por semana/mes
- Drill-down: click en categoría → ver tickets específicos

### Pantalla 3: Agent Performance

- Tabla ranking: tickets resueltos, tiempo medio, SLA %, tickets activos
- Comparativa mes actual vs anterior
- Distribución de carga (¿alguien tiene 3x más que otro?)

### Pantalla 4: Export / Report

- Botón "Generar informe mensual"
- PDF con: KPIs, tendencias, top categorías, SLA, recomendaciones
- Descargable o envío por email (si FS lo permite)

---

## Placement en Freshservice

La app se muestra como **full page app** (pestaña nueva en el sidebar de Freshservice):
- Icono en la barra lateral de FS
- Se abre como página completa dentro de FS
- El usuario navega entre las 4 pantallas con tabs internos

---

## Stack técnico

| Componente | Tecnología |
|-----------|-----------|
| Frontend | React (via FDK v3.0 scaffolding) |
| Gráficos | Recharts (React-native, basado en D3) |
| Backend | Serverless Node.js v18 |
| Storage | Entity Storage (5 entidades) |
| Scheduled | 1 evento recurrente (diario) |
| Build | Webpack 5 (incluido en FDK) |

---

## Roadmap

### Fase 1 — MVP (4-6 semanas)
- Dashboard overview con 4 KPIs + 4 gráficos
- Cron diario para recolección de datos
- Entity Storage para histórico
- SLA deep dive básico

### Fase 2 — Premium (tras validar tracción)
- Agent performance dashboard
- Export PDF
- Alertas por email cuando SLA en riesgo

### Fase 3 — IA (BYOK)
- Root cause analysis
- Categorización inteligente
- Resúmenes narrativos de tickets
- El cliente pone su API key de OpenAI/Claude

---

## Pricing propuesto

| Plan | Precio | Incluye |
|------|--------|---------|
| Free | $0 | Dashboard overview (30 días histórico) |
| Pro | $5/agent/mes | Histórico ilimitado + SLA deep dive + export |
| AI | $10/agent/mes | Todo + análisis IA (BYOK) |

Estrategia: lanzar gratis para acumular installs y reviews, activar Pro tras 100+ installs.
