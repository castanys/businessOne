# SESIONES.md — businessOne

**Propósito**: Últimas 3 sesiones completadas (detalle operativo).

**Última actualización**: 2026-03-28

**Nota**: Estado mínimo y pendientes → leer `ESTADO.md`

---

## Últimas 3 Sesiones

### S2 cont. — 2026-03-28 — BACKEND + DEPLOY CUSTOM APP

**Objetivo**: Verificar backend con datos reales, deploy como custom app.
**Resultado**: Backend OK, deploy bloqueado en "Promote to Live"

**Backend corregido y verificado:**
- server.js: reescrito con API correcta `$db.set()`/`$db.get()` (antes usaba API inexistente)
- server.js: añadida función `storeMetrics`, quitado `updated_since` filter, mejor logging
- requests.json: fix auth header `encode(key + ':X')`
- app.js: reescrito frontend para nueva estructura de datos del SMI
- onScheduledEvent simulado OK: 15 tickets procesados, métricas almacenadas

**15 tickets de prueba creados via API:**
- Variedad: Hardware(4), Software(6), Network(5)
- Prioridades: Urgente(3), Alta(3), Media(5), Baja(3)
- Estados: Open(7), Pending(2), Resolved(3), Closed(3)

**Custom app empaquetada y subida:**
- Node 24.11.1 + FDK v10.0.1 instalados (Freshworks exige Node 24 para Platform 3.0)
- `fdk pack --skip-coverage` → `dist/insightdesk.zip`
- App subida al Developer Portal (App ID: 395129)
- iparams configurados e instalada en cuenta trial
- BLOQUEADO: "Promote to Live" da error en UI del Developer Portal

**Playwright MCP — lección aprendida:**
- En VS Code extension, cada proyecto necesita su propio `.mcp.json` — el global NO se hereda
- Configuración final en `.mcp.json` del proyecto con Node v22 y perfil global

---

### S2 — 2026-03-27 — TESTING + BUG FIX + PLAYWRIGHT MCP

**Objetivo**: Testear app InsightDesk contra insightdesk.freshservice.com, resolver warnings.
**Resultado**: COMPLETADA

**Bug crítico resuelto:**
- app.js tenía todas las `const` sin espacio — reescritura completa

**Testing exitoso:**
- App renderiza en Freshservice (4 KPIs + 4 charts)
- API key obtenida y activada

**Playwright MCP configurado** | **Warnings 38 → 4**

**Commits:** 1 (`ddba644`)

---

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
