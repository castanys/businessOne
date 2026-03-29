# ESTADO.md — businessOne

**Propósito**: Estado mínimo del proyecto — lo que Claude debe saber antes de empezar una sesión.

**Última actualización**: 2026-03-29 — S5

---

## Métricas Clave

| Métrica | Valor |
|---------|-------|
| **Estado** | Fase 1: App v3.1 con Entity Storage + 200 tickets test |
| **Producto** | InsightDesk — Freshservice Analytics App |
| **Trial FS** | insightdesk.freshservice.com (~12 días restantes) |
| **Revenue** | $0 |

---

## Decisiones Arquitectónicas

4 decisiones documentadas → ver `ARQUITECTURA.md` o ejecutar `/arquitectura-proyecto`

---

## Pendientes Activos

| Prioridad | Tarea | Notas |
|-----------|-------|-------|
| ALTA | Solicitar developer subscription (trial expira ~12 días) | Email redactado, Pablo debe enviar a paid-apps@community.freshworks.dev |
| ALTA | Update v3.1 en FS tenant (Admin → Custom → Update) | Entity Storage + historical chart añadidos |
| MEDIA | Validar app con 200+ tickets reales importados | Verificar percentiles, SLA, distribuciones con volumen real |
| MEDIA | Screenshot real v3.1 + icon para marketplace listing | Necesario para submit público |
| BAJA | Limpiar Node versions (18, 22, 24.11, 24.14) | FDK v10 requiere Node 24.11.x |

**Nota**: Borrar pendientes cuando se completen. No acumular aquí.

---

## Última Sesión

| Sesión | Fecha | Resultado | Cambios |
|--------|-------|-----------|---------|
| S5 | 2026-03-29 | Entity Storage integrado + 200 tickets importados | SMI getMetrics + historical chart + import script + datos jobExtractor |
| S4 | 2026-03-28 | v3.0 métricas avanzadas publicada | FRT/P90/reopens/SLA priority/source/agent table/problem tickets |
| S3 | 2026-03-28 | App publicada + instalada en FS | Promoted to Live + instalada con API key |
| S2 | 2026-03-27 | Backend OK + deploy | server.js reescrito + app empaquetada Node 24 |
