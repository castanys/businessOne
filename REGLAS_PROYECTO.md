# REGLAS_PROYECTO.md — businessOne

---

## Regla #1: Nunca parchear, siempre arreglar

PROHIBIDO: Editar datos individuales directamente, scripts "one-off" para parchear
CORRECTO: Modificar lógica/reglas/configuración, reprocesar, verificar

**Un fix no existe hasta que está en el pipeline.**

---

## Regla #2: Nunca inventar datos

Todo dato debe tener fuente verificable. Si no estás seguro → preguntar, no asumir.

---

## Regla #3: Verificación obligatoria

Nunca marcar tarea completada sin verificar con test o query real.
Número estimado ≠ número verificado. Siempre el segundo.

---

## Regla #4: Documentar decisiones reales

Toda decisión arquitectónica se registra en ARQUITECTURA.md con: qué, por qué, cuándo.
**No son decisiones**: fixes de bugs, reglas de clasificación, configuración operativa.

---

## Regla #5: Evidencia antes de propuesta

No proponer ideas de negocio, productos o nichos sin evidencia de mercado.
Evidencia = competidores existentes, precios, reviews, búsquedas, foros, datos reales.
Opiniones y "creo que podría funcionar" NO son evidencia.

---

## Regla #6: Coste mínimo, escalable

Toda decisión de infraestructura debe empezar en tier gratuito o coste mínimo.
Escalar solo cuando haya revenue que lo justifique.
