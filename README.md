# CAOS Vintage - E-Commerce

## Descripción
**CAOS** es un emprendimiento enfocado en la curaduría y reventa de ropa vintage y de segunda mano[cite: 1]. Al tratarse de prendas únicas y de stock unitario adquiridas en ferias americanas, la gestión tradicional mediante mensajes directos y anotaciones manuales genera pérdida de trazabilidad en compras, costos y cálculo de ganancias[cite: 1].

Este proyecto resuelve dicha problemática centralizando el catálogo, automatizando el control de stock único y estructurando el registro de ventas mediante una base de datos normalizada (3FN)[cite: 1].

---

## 🚀 Módulos Innovadores (Features Destacadas)

* **Personal Shopper con IA (Chatbot de Estilo):** Asistente virtual en la tienda que interactúa con el cliente para recomendar combinaciones de outfits y sugerir prendas según sus gustos o etiquetas de estilo (*Vintage, Y2K, Denim, Band Tee*)[cite: 1].
* **Evaluador de Precios IA (Panel Administrador):** Herramienta para la dueña que analiza el precio de compra en ferias, la categoría y la marca de la prenda para sugerir un precio de venta óptimo y margen de ganancia estimado[cite: 1].
* **Visor Interactivo 3D / Rotación de Prendas:** Exposición visual dinámica en el catálogo para que los clientes interactúen con el producto en 360° antes de comprarlo[cite: 1].

---

## 👥 Integrantes
* **Arroyo Guadalupe** - 62528
* **Amado Sancho Miñano María de Lourdes** - 62353

---

## 🛠️ Estructura del Repositorio

* `/docs`: Documentación técnica de requisitos, diagramas UML, Modelo Entidad-Relación (DER) y proceso de normalización (UFN a 3FN)[cite: 1].
* `/database`: Scripts SQL para la creación del esquema relacional (Tablas: *Clientes, Prendas, Categorías, Estilos, Prenda_Estilo, Ventas*) y carga de datos de prueba[cite: 1].
* `/src/backend`: Lógica de negocio (Patrón MVC), API para el Chatbot e Evaluador IA, y controladores de inventario/ventas[cite: 1].
* `/src/frontend`: Interfaz web para el cliente (Catálogo con visor 3D e IA) y panel de administración (*Backoffice*)[cite: 1].
* `/tests`: Pruebas unitarias de la lógica de catálogo, transacciones y cálculo de reportes[cite: 1].