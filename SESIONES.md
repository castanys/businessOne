# SESIONES.md — businessOne

**Propósito**: Últimas 3 sesiones completadas (detalle operativo).

**Última actualización**: 2026-03-27

**Nota**: Estado mínimo y pendientes → leer `ESTADO.md`

---

## Últimas 3 Sesiones

### S1 — 2026-03-27 — INVESTIGACIÓN + MVP + SCAFFOLDING

**Objetivo**: Definir producto y empezar desarrollo.
**Resultado**: COMPLETADA

**Investigación de mercado (con evidencia):**
- 4 marketplaces investigados: Freshservice, Chrome Web Store, Shopify, MSP reporting
- Freshservice marketplace elegido: gap real en analytics, nuevos usage limits crean urgencia, 80/20 revenue share
- Datos: BrightGauge $325-635/mes, 40K+ MSPs en EEUU, categoría analytics vacía en FS marketplace

**Decisiones:**
- D1: Marketplace-first (distribución antes de producto)
- D2: Nicho B2B (BI/soporte/ERP — expertise de Pablo)
- D3: Claude gestiona proyecto casi completo
- D4: App Freshservice Analytics (InsightDesk) como primer producto

**Producto: InsightDesk**
- MVP diseñado: docs/MVP_DESIGN.md
- 4 pantallas: Overview, SLA Deep Dive, Agent Performance, Export
- Entity Storage: datos agregados diarios (~3 años de histórico en 5 entidades)
- Pricing: Free (30d) → Pro $5/agent/mes → AI $10/agent/mes (BYOK)

**Infraestructura configurada:**
- Cuenta developer Freshworks (castanys@hotmail.es)
- Email routing: pablo@rugbyscore.xyz → castanys@hotmail.es (Cloudflare)
- Trial Freshservice Enterprise: insightdesk.freshservice.com (14 días)
- FDK v9.8.2 instalado con Node 18.20.8 (via nvm)
- Nota: emails personales (hotmail/gmail) y .xyz rechazados por FS para trials — usado pablo.castanys@timestampgroup.com

**App desarrollada:**
- manifest.json: Platform 3.0, full_page_app, scheduled event
- server/server.js: onScheduledEvent (daily collection), getMetrics/getMetricsByPrefix (SMI)
- app/index.html + scripts/app.js: 4 KPIs + 4 charts (Chart.js 2.9)
- config: iparams.json (domain + API key), requests.json
- Validación FDK: 0 errores, 0 lint errors, 38 warnings (no bloqueantes)

**Feedback importante guardado:**
- No proponer ideas sin investigar primero
- Ante pushback: defender con datos o admitir que falta investigación
- Nunca plegar por complacer

**Commits:** 3 (init + MVP design + app scaffolding)
