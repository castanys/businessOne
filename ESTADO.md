# ESTADO.md — businessOne

**Propósito**: Estado mínimo del proyecto — lo que Claude debe saber antes de empezar una sesión.

**Última actualización**: 2026-03-28 — S4

---

## Métricas Clave

| Métrica | Valor |
|---------|-------|
| **Estado** | Fase 1: App funcional con datos reales — dashboard verificado |
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
| ALTA | Solicitar developer subscription (trial expira ~13 días) | Email a paid-apps@community.freshworks.dev |
| MEDIA | Preparar assets y listing para marketplace | Logo e icono ya creados, screenshot real ya disponible |
| BAJA | Limpiar Node versions (18, 22, 24.11, 24.14) | FDK v10 requiere Node 24.11.x |

**Nota**: Borrar pendientes cuando se completen. No acumular aquí.

---

## Última Sesión

| Sesión | Fecha | Resultado | Cambios |
|--------|-------|-----------|---------|
| S4 | 2026-03-28 | Dashboard funcional con datos reales | Fix Platform v3.0: invokeTemplate + update a v2.0 |
| S3 | 2026-03-28 | App publicada + instalada en FS | Promoted to Live + instalada con API key |
| S2 cont. | 2026-03-28 | Backend OK, deploy bloqueado | server.js reescrito + app empaquetada Node 24 + custom app subida |
| S2 | 2026-03-27 | COMPLETADA | Bug fix app.js + app renderiza en FS + Playwright MCP conectado |
