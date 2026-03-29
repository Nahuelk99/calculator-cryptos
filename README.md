# Calculadora Premium para Trading Escalonado

Calculadora avanzada diseñada para optimizar estrategias de trading escalonado (Dollar Cost Averaging - DCA). Esta herramienta permite calcular con precisión el precio promedio ponderado y el precio objetivo de venta (Take Profit) en función de las compras realizadas y las proyecciones de precio.

## 🚀 Características Principales

- **Cálculo de Precio Promedio Ponderado**: Calcula el precio promedio exacto de todas tus compras, considerando el monto y la cantidad de cada una.
- **Cálculo de Precio Objetivo (Take Profit)**: Determina el precio de venta necesario para alcanzar una rentabilidad específica (ROI) sobre el capital invertido.
- **Gestión de Compras**: Permite agregar, editar y eliminar compras individuales.
- **Persistencia de Datos**: Guarda todas las operaciones en el almacenamiento local del navegador (LocalStorage), permitiendo guardar el estado de tus cálculos entre sesiones.
- **Diseño Responsive**: Interfaz optimizada para dispositivos móviles y de escritorio.
- **Modo Oscuro**: Tema oscuro para una mejor experiencia visual.

## 🛠️ Instalación y Uso

### Requisitos Previos

- Un navegador web moderno (Chrome, Firefox, Edge, Safari).
- Node.js y npm (opcional, para usar el servidor de desarrollo).

### Instalación

1. Clona el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd calculator-cryptos
   ```

2. (Opcional) Instala las dependencias de desarrollo:
   ```bash
   npm install
   ```

### Ejecución

Para ejecutar la aplicación localmente:

```bash
npx serve .
```

Abre tu navegador y accede a la dirección indicada (generalmente `http://localhost:3000`).

## 📝 Uso de la Aplicación

### Agregar una Compra

1. En la sección "Agregar Compra", ingresa el **Monto** (en USD) y la **Cantidad** (en criptomonedas) de tu operación.
2. Haz clic en el botón **Agregar Compra**.

### Editar o Eliminar una Compra

- Para editar una compra existente, haz clic en el botón **Editar** correspondiente.
- Para eliminar una compra, haz clic en el botón **Eliminar**.

### Configurar Objetivos

1. En la sección "Objetivos", ingresa el **ROI Deseado (%)** (porcentaje de ganancia que buscas).
2. La calculadora mostrará automáticamente el **Precio Objetivo** necesario para alcanzar esa rentabilidad.

## 📊 Resultados

La calculadora muestra en tiempo real:

- **Precio Promedio Ponderado**: El costo promedio por unidad de la criptomoneda.
- **Capital Invertido**: El monto total invertido.
- **Cantidad Total**: La cantidad total de criptomonedas acumuladas.
- **ROI Actual**: La rentabilidad actual basada en el precio de mercado.

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
