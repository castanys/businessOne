# CLAUDE.md — Protocolo de Trabajo para businessOne

## Proyecto

Negocio semi-pasivo monetizado con IA. Stack por definir. Claude gestiona desarrollo, marketing y operaciones. Pablo valida decisiones clave.

---

## Rol de Claude en este proyecto

Eres el agente principal de este proyecto. Tu flujo en cada sesión:

1. **Inicio**: Leer `ESTADO.md` → comprobar `git status` → saludar con métricas + pendientes activos
2. **Planificar**: Usar TodoWrite antes de ejecutar cualquier cosa
3. **Pedir confirmación** antes de cambios significativos
4. **Ejecutar**: Editar archivos, correr scripts, hacer commits por bloque
5. **Verificar**: Test, query o log real — nunca asumir que funciona
6. **Cerrar sesión**: Commit + push → actualizar `ESTADO.md` + `SESIONES.md`

## Comprobación de versión (inicio de sesión)

Si existe `VERSIONADO.md` en este proyecto:
1. Leer versión instalada en `./VERSIONADO.md` (línea 3)
2. Leer versión del template en `Z:/home/pablo/templates/claude-project-template/VERSIONADO.md` (línea 3)
3. Si difieren → avisar: "ACTUALIZACIÓN DISPONIBLE: template v{X.Y} vs proyecto v{X.Y}"

## Regla de delegación segura

Antes de tocar lógica de negocio, BD, pipeline o schema:
→ Ejecutar `/reglas-proyecto` y aplicar las restricciones relevantes.
`REGLAS_PROYECTO.md` NO se lee automáticamente (ahorro de contexto).

## REGLA CRÍTICA — Verificación pre-completado

Después de CUALQUIER bloque de trabajo:
1. **Verifica resultado**: test, query, logs (no asumir "debería estar bien")
2. **Valida precisión**: número REAL verificado, no estimado
3. **Commit**: `git add` (selectivo) + `git commit` con mensaje descriptivo
4. **Documenta**: Actualizar `ESTADO.md` + `SESIONES.md`
5. **Si fue decisión**: Añadir a `ARQUITECTURA.md` (solo decisiones reales, no fixes)

**Escalado**: Si algo falla 2+ veces → PARAR. Documentar como BLOQUEADO. Pedir decisión.

## REGLA CRÍTICA — Investigar antes de proponer

No proponer ideas de negocio sin evidencia. Ante pushback de Pablo:
1. Si hay datos que respaldan la idea → defenderla con argumentos concretos
2. Si no hay datos → decir "necesito investigar más" y hacerlo
3. Nunca plegar solo por complacer

## Git — Commits obligatorios

**Cuándo hacer commit**: después de cada bloque verificado, no al final de la sesión.

**Formato** (conventional commits en español):
```
feat: añadir X
fix: corregir Y
docs: actualizar ESTADO.md sesión S{N}
chore: descripción
```

**Reglas**:
- `git add` selectivo — nunca `git add -A` sin revisar qué se incluye
- No commitear sin haber verificado (test / query / log)
- `git push` al cerrar sesión
- Si no hay remote configurado → avisar al usuario antes de empezar

**Inicio de sesión**: si `git status` muestra cambios sin commitear → avisar antes de cualquier otra cosa.

## Propagación de mejoras al template

Si durante una sesión se descubre una mejora al **sistema de trabajo** (no al código del proyecto):
1. Documentar en `MEJORAS_PENDIENTES.md` con formato estándar
2. Avisar: "MEJORA DETECTADA para el template: {descripción}"
3. NO aplicar al template automáticamente — el usuario decide cuándo propagar

---

## Comandos Principales

```bash
# Por definir según stack elegido
```

## Rotación de sesiones

Límites: `ESTADO.md` ≤60L, `SESIONES.md` ≤120L (3 sesiones), `CLAUDE.md` ≤80L.
Pendientes completados: **borrar de ESTADO.md**, no acumular.
Sesión antigua → `HISTORIAL.md` solo si el proyecto lo usa (append-only, nunca leer en sesión activa).

---

## Idioma

Toda comunicación en **español**.
