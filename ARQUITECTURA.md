# ARQUITECTURA.md — businessOne

**Propósito**: Decisiones arquitectónicas del proyecto. Se carga on-demand via `/arquitectura-proyecto`.

**Última actualización**: 2026-03-27

---

## Decisiones Arquitectónicas

| # | Decisión | Por qué | Sesión |
|---|----------|---------|--------|
| D1 | Enfoque marketplace-first para distribución | Resolver distribución antes de construir — evitar "build it and they will come" | S1 |
| D2 | Nicho B2B (mundo BI/soporte/ERP) | Pablo tiene expertise real, competencia cobra caro, cliente B2B paga más | S1 |
| D3 | Claude gestiona proyecto casi completo | Pablo quiere mínima intervención — solo valida decisiones clave | S1 |
| D4 | Freshservice Analytics App (InsightDesk) como primer producto | Gap real en marketplace (analytics vacío), timing perfecto (usage limits marzo 2026), Pablo es usuario experto, distribución resuelta via marketplace, coste $0 | S1 |
| D5 | Entity Storage para histórico (no BD externa) | 10K registros/entidad × 5 entidades = ~3 años de datos agregados diarios. Coste $0, dentro de infra Freshworks | S1 |
| D6 | BYOK para IA (fase 2) | Cliente pone su API key → coste $0 para nosotros, privacidad resuelta (datos no salen de FS sin consentimiento) | S1 |
