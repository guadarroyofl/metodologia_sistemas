# Bitácora - CAOS Vintage

## 14/09/2026 - Patrón

**Problema identificado:** En CAOS, la dueña necesita sugerencias de precio de venta para prendas únicas, y hay más de una forma de calcularlas: un margen fijo sobre el costo, un multiplicador según categoría y marca, o una estimación con IA. Si todo se resuelve con `if/else` dentro de una sola función, cada criterio nuevo obliga a modificar código que ya funciona, y probar cada criterio por separado se vuelve difícil.

**Patrón elegido: Strategy.** Define una familia de algoritmos intercambiables (`MargenFijo`, `CategoriaYMarca`, `EvaluadorIA`) detrás de una misma interfaz (`calcular(prenda)`). La clase `EvaluadorPrecios` (contexto) recibe una estrategia y delega en ella, así que se puede cambiar de criterio en ejecución sin tocar el resto del sistema.

**Por qué Strategy y no otro:**

- **Factory Method / Abstract Factory:** resuelven cómo crear objetos, pero acá el problema es cómo variar un comportamiento.
- **Decorator:** agrega responsabilidades apilables a un objeto. Los criterios de precio no se apilan, se reemplazan uno por otro.
- **State:** cambia el comportamiento según el estado interno del objeto. Acá quien elige el criterio es la dueña, no el estado de la prenda.
- **Observer:** sirve para notificar cambios (por ejemplo, prenda vendida). Es útil en el proyecto, pero no resuelve el cálculo de precios.
- **Singleton:** controla instancias únicas, no algoritmos.

**Beneficios en el proyecto:** cumple el principio abierto/cerrado (se agrega una estrategia nueva sin modificar `EvaluadorPrecios`), permite probar cada criterio de forma aislada y deja enchufar la IA real más adelante, porque la IA queda como una estrategia más.

**Implementación:** `backend/app/services/pricing/` (ejecutar desde `backend/` con `python -m app.services.pricing.demo`).

### Reflexión sobre el uso de IA

**Problema:** necesitábamos un patrón para el evaluador de precios de CAOS, con código en Python. **Propuesta de IA:** le pedí a Claude que sugiriera un patrón según el README del repo; propuso Strategy y generó el código (primero en JavaScript, luego en Python). **Análisis:** comparé Strategy con Factory, Decorator, State y Observer, y solo Strategy resuelve el cálculo de precios intercambiable sin `if/else`. **Verificación:** ejecuté la demo y revisé a mano los precios esperados (por ejemplo, 4000 × 2,2 × 1,25 = 11000). **Corrección:** descarté la versión en JavaScript y dejé la IA real como un cliente simulado, sin conectar ninguna API. **Justificación:** acepté la propuesta porque el patrón responde al problema y el código valida la salida de la IA antes de usarla.
