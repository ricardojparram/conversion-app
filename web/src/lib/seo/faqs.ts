import type { RouteKey } from "./config";

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

const HOME_FAQS: FaqItem[] = [
  {
    question: "¿Qué tasas de cambio muestra Cambio rápido?",
    answer:
      "Mostramos las referencias oficiales del Banco Central de Venezuela (Dólar BCV y Euro BCV) junto con promedios de mercado en Binance P2P para USDT (Compra y Venta) en Bolívares.",
    category: "General",
  },
  {
    question: "¿Cuándo entra en vigencia una nueva tasa publicada por el BCV?",
    answer:
      "Cuando el BCV publica un nuevo tipo de cambio en la tarde para el siguiente día hábil bancario (fecha valor), la calculadora mantiene activa la tasa vigente hasta la medianoche hora de Caracas y cambia automáticamente a la nueva tasa oficial. También puedes consultar el valor anunciado en nuestras páginas de Dólar BCV y Euro BCV.",
    category: "BCV",
  },
  {
    question: "¿Por qué la calculadora escribe primero los céntimos?",
    answer:
      "Al escribir de derecha a izquierda (céntimo a céntimo) evitas tener que buscar la coma o borrar ceros: por ejemplo, presionar 2, 3, 5, 0 produce 0,02 → 0,23 → 2,35 → 23,50 de forma directa.",
    category: "Calculadora",
  },
  {
    question: "¿Funciona la calculadora si pierdo conexión a Internet?",
    answer:
      "Sí. Cada consulta exitosa guarda localmente en tu navegador las últimas tasas e historiales descargados para que puedas seguir convirtiendo montos aunque estés temporalmente sin conexión.",
    category: "Calculadora",
  },
];

const DOLAR_BCV_FAQS: FaqItem[] = [
  {
    question: "¿Cómo se determina la tasa oficial del Dólar BCV?",
    answer:
      "El Banco Central de Venezuela publica diariamente el promedio ponderado resultante de las operaciones diarias de las mesas de cambio activas de las instituciones bancarias participantes.",
    category: "BCV",
  },
  {
    question: "¿A qué hora suele actualizarse el Dólar BCV y qué es la fecha valor?",
    answer:
      "Por lo general el BCV publica al cierre de la jornada hábil bancaria (final de la tarde en hora de Caracas) el valor que entra en vigencia el día hábil siguiente, conocido como fecha valor. Cambio rápido aplica automáticamente la tasa correspondiente al día calendario en Venezuela.",
    category: "BCV",
  },
  {
    question: "¿Cuál tasa Dólar BCV aplica los fines de semana o feriados bancarios?",
    answer:
      "Durante sábados, domingos y feriados bancarios en Venezuela rige la última tasa oficial publicada para la fecha valor más reciente hasta la siguiente jornada hábil.",
    category: "BCV",
  },
];

const EURO_BCV_FAQS: FaqItem[] = [
  {
    question: "¿El Euro BCV también es una tasa oficial del Banco Central de Venezuela?",
    answer:
      "Sí. Además del dólar estadounidense, el BCV publica el tipo de cambio de referencia oficial del euro (EUR) en bolívares en su boletín diario.",
    category: "Euro BCV",
  },
  {
    question: "¿Cuándo se utiliza la tasa Euro BCV frente al Dólar BCV?",
    answer:
      "Diversos comercios, contratos, facturación y presupuestos utilizan el Euro BCV como referencia cambiaria oficial cuando el precio base está expresado en euros o se acuerda indexar según dicha divisa oficial.",
    category: "Euro BCV",
  },
  {
    question: "¿La fecha valor del Euro BCV sigue la misma regla que el Dólar?",
    answer:
      "Sí, ambas monedas oficiales comparten la misma fecha valor publicada en el portal del BCV y cambian de vigencia a las 12:00 AM hora de Caracas (America/Caracas).",
    category: "Euro BCV",
  },
];

const USDT_FAQS: FaqItem[] = [
  {
    question: "¿Qué diferencia hay entre USDT Venta y USDT Compra en Binance P2P?",
    answer:
      "USDT Venta refleja el promedio de anuncios donde vendes USDT a cambio de bolívares en el mercado P2P, mientras que USDT Compra refleja el promedio de anuncios para adquirir USDT pagando con bolívares.",
    category: "USDT Binance",
  },
  {
    question: "¿Cómo se calculan las referencias de USDT Binance mostradas aquí?",
    answer:
      "Nuestro backend consulta periódicamente las primeras ofertas verificadas de comerciantes P2P en el par USDT/VES y calcula su promedio aritmético limpio como referencia meramente informativa.",
    category: "USDT Binance",
  },
  {
    question: "¿Cambio rápido vende o intermedia operaciones con criptomonedas o divisas?",
    answer:
      "No. Cambio rápido es exclusivamente una herramienta informática de consulta y cálculo; no compramos, vendemos ni intermediamos USDT, dólares ni bolívares.",
    category: "USDT Binance",
  },
];

const BRECHA_FAQS: FaqItem[] = [
  {
    question: "¿Cómo se calcula la brecha cambiaria entre BCV y USDT?",
    answer:
      "La diferencia absoluta en bolívares es (Tasa USDT − Tasa Dólar BCV), y el porcentaje de brecha cambiaria se calcula como ((Tasa USDT − Tasa Dólar BCV) / Tasa Dólar BCV) × 100.",
    category: "Brecha",
  },
  {
    question: "¿Por qué cambia la brecha durante el día o los fines de semana?",
    answer:
      "La tasa BCV permanece fija durante toda la fecha valor bancaria, mientras que el mercado P2P de USDT cotiza de forma continua según la oferta y demanda en bolívares.",
    category: "Brecha",
  },
];

const TENDENCIAS_FAQS: FaqItem[] = [
  {
    question: "¿Cómo se calculan los puntos diarios del gráfico de tendencias?",
    answer:
      "Para cada día calendario en hora de Caracas (America/Caracas), promediamos todas las lecturas registradas en nuestra base de datos para esa fecha y divisa, permitiendo comparar 7, 15 o 30 días sin distorsiones por zona horaria.",
    category: "Tendencias",
  },
  {
    question: "¿Puedo comparar varias fuentes en el mismo gráfico?",
    answer:
      "Sí. Selecciona dos o más chips de fuentes (por ejemplo BCV Dólar y USDT Venta) para superponer ambas líneas y visualizar la evolución de su diferencial.",
    category: "Tendencias",
  },
];

export function getFaqsForRoute(routeKey: RouteKey): FaqItem[] {
  switch (routeKey) {
    case "home":
      return HOME_FAQS;
    case "dolar-bcv":
      return DOLAR_BCV_FAQS;
    case "euro-bcv":
      return EURO_BCV_FAQS;
    case "usdt-binance":
      return USDT_FAQS;
    case "brecha-cambiaria":
      return BRECHA_FAQS;
    case "tendencias":
      return TENDENCIAS_FAQS;
    case "preguntas-frecuentes":
      return [
        ...HOME_FAQS,
        ...DOLAR_BCV_FAQS,
        ...EURO_BCV_FAQS,
        ...USDT_FAQS,
        ...BRECHA_FAQS,
        ...TENDENCIAS_FAQS,
      ];
    case "privacidad":
    default:
      return [];
  }
}
