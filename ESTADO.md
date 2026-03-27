# ESTADO.md — businessOne

**Propósito**: Estado mínimo del proyecto — lo que Claude debe saber antes de empezar una sesión.

**Última actualización**: 2026-03-27 — S1 completada

---

## Métricas Clave

| Métrica | Valor |
|---------|-------|
| **Estado** | Fase 1: MVP en desarrollo |
| **Producto** | InsightDesk — Freshservice Analytics App |
| **Trial FS** | insightdesk.freshservice.com (14 días desde 2026-03-27) |
| **Revenue** | $0 |

---

## Decisiones Arquitectónicas

4 decisiones documentadas → ver `ARQUITECTURA.md` o ejecutar `/arquitectura-proyecto`

---

## Pendientes Activos

| Prioridad | Tarea | Notas |
|-----------|-------|-------|
| ALTA | Testing app con `fdk run` contra insightdesk.freshservice.com | Necesita API key de FS |
| ALTA | Solicitar developer subscription (trial expira en 14 días) | Email a paid-apps@community.freshworks.dev |
| MEDIA | Resolver warnings del linter (38 warnings) | No bloqueantes pero necesarios para review |
| MEDIA | Preparar assets y listing para marketplace | Logo, screenshots, descripción |
| BAJA | Activar `nvm use 18` como admin para simplificar workflow | Actualmente usando path directo a Node 18 |

**Nota**: Borrar pendientes cuando se completen. No acumular aquí.

---

## Última Sesión

| Sesión | Fecha | Resultado | Cambios |
|--------|-------|-----------|---------|
| S1 | 2026-03-27 | COMPLETADA | Investigación mercado + MVP diseñado + app scaffolding completo |
