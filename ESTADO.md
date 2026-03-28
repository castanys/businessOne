# ESTADO.md — businessOne

**Propósito**: Estado mínimo del proyecto — lo que Claude debe saber antes de empezar una sesión.

**Última actualización**: 2026-03-28 — S4

---

## Métricas Clave

| Métrica | Valor |
|---------|-------|
| **Estado** | Fase 1: App v3.0 con métricas avanzadas publicada en FS |
| **Producto** | InsightDesk — Freshservice Analytics App |
| **Trial FS** | insightdesk.freshservice.com (~13 días restantes) |
| **Revenue** | $0 |

---

## Decisiones Arquitectónicas

4 decisiones documentadas → ver `ARQUITECTURA.md` o ejecutar `/arquitectura-proyecto`

---

## Pendientes Activos

| Prioridad | Tarea | Notas |
|-----------|-------|-------|
| ALTA | Update v3.0 en FS tenant (Admin → Custom → Update) | v3.0 publicada en Dev Portal, falta aplicar en tenant |
| ALTA | Solicitar developer subscription (trial expira ~13 días) | Email a paid-apps@community.freshworks.dev |
| MEDIA | Screenshot real v3.0 + icon para marketplace listing | Necesario para submit público |
| BAJA | Limpiar Node versions (18, 22, 24.11, 24.14) | FDK v10 requiere Node 24.11.x |

**Nota**: Borrar pendientes cuando se completen. No acumular aquí.

---

## Última Sesión

| Sesión | Fecha | Resultado | Cambios |
|--------|-------|-----------|---------|
| S4 | 2026-03-28 | v3.0 métricas avanzadas publicada | FRT/P90/reopens/SLA priority/source/agent table/problem tickets |
| S3 | 2026-03-28 | App publicada + instalada en FS | Promoted to Live + instalada con API key |
| S2 cont. | 2026-03-28 | Backend OK, deploy bloqueado | server.js reescrito + app empaquetada Node 24 + custom app subida |
| S2 | 2026-03-27 | COMPLETADA | Bug fix app.js + app renderiza en FS + Playwright MCP conectado |
