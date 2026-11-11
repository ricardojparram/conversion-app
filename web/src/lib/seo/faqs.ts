import type { RouteKey } from "./config";

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

const HOME_FAQS: FaqItem[] = [
  {
    question: "¿A qué hora actualiza la tasa el BCV?",
    answer:
      "El Banco Central de Venezuela publica su cotización oficial ponderada de lunes a viernes entre las 4:30 PM y las 6:00 PM (hora de Caracas, VET), con fecha valor para el siguiente día hábil bancario. Cuando existe una nueva tasa anunciada, la calculadora mantiene activa la vigente hasta medianoche y cambia automáticamente.",
    category: "Tasas oficiales del BCV",
  },
  {
    question: "¿Qué es la brecha cambiaria?",
    answer:
      "Es la diferencia porcentual y en bolívares entre el tipo de cambio oficial del BCV y la cotización promedio del mercado P2P (como USDT en Binance). Te ayuda a calcular de inmediato el impacto real de pagar o cobrar entre ambas referencias.",
    category: "USDT Binance P2P y brecha cambiaria",
  },
  {
    question: "¿Por qué el USDT tiene otro precio?",
    answer:
      "El USDT cotiza por libre oferta y demanda entre comerciantes particulares en plataformas P2P las 24 horas del día, los 7 días de la semana, incluyendo fines de semana y feriados bancarios cuando la referencia del BCV permanece fija.",
    category: "USDT Binance P2P y brecha cambiaria",
  },
  {
    question: "¿Cómo se usa la calculadora?",
    answer:
      "Toca el monto en bolívares o divisas y escribe dígito a dígito (por céntimos, sin buscar la coma decimal). Puedes pulsar el botón circular verde para invertir el orden de conversión, copiar con un toque o elegir entre BCV Dólar, BCV Euro y USDT Binance incluso sin conexión.",
    category: "Calculadora y modo sin conexión",
  },
  {
    question: "¿Qué tasa del Dólar o Euro BCV aplica fines de semana y feriados?",
    answer:
      "Los sábados, domingos y feriados bancarios en Venezuela el Banco Central no publica una nueva mesa de cambio, por lo que sigue vigente la última tasa oficial anunciada para la fecha valor más reciente. Mientras tanto, el USDT en Binance P2P continúa cotizando en vivo 24/7.",
    category: "Tasas oficiales del BCV",
  },
];

const DOLAR_BCV_FAQS: FaqItem[] = [
  {
    question: "¿Cómo se determina la tasa oficial del Dólar BCV?",
    answer:
      "El Banco Central de Venezuela publica diariamente el promedio ponderado resultante de las operaciones diarias de las mesas de cambio activas de las instituciones bancarias participantes.",
    category: "Tasas oficiales del BCV",
  },
  {
    question: "¿Qué significa la 'próxima tasa' o fecha valor bancaria?",
    answer:
      "Cuando el BCV publica su boletín al cierre de la jornada hábil (final de la tarde VET), esa cotización entra en vigencia oficial a las 12:00 AM del siguiente día hábil bancario. Mostrarla por adelantado permite planificar pagos y facturación sin confusiones.",
    category: "Tasas oficiales del BCV",
  },
  {
    question: "¿Cuál tasa Dólar BCV aplica los fines de semana o feriados?",
    answer:
      "Durante sábados, domingos y feriados bancarios en Venezuela rige la última tasa oficial publicada para la fecha valor más reciente hasta la siguiente jornada hábil.",
    category: "Tasas oficiales del BCV",
  },
];

const EURO_BCV_FAQS: FaqItem[] = [
  {
    question: "¿Por qué el Euro BCV cotiza distinto al Dólar BCV?",
    answer:
      "Además del dólar estadounidense, el BCV publica el tipo de cambio oficial del Euro (EUR) reflejando su cruce en los mercados internacionales frente al dólar multiplicado por la tasa oficial en bolívares.",
    category: "Tasas oficiales del BCV",
  },
  {
    question: "¿Cuándo se utiliza la tasa Euro BCV en Venezuela?",
    answer:
      "Diversos comercios, aranceles, contratos y presupuestos usan el Euro BCV como referencia cambiaria oficial cuando el precio base o factura está indexado en euros.",
    category: "Tasas oficiales del BCV",
  },
  {
    question: "¿La fecha valor del Euro BCV sigue la misma regla que el Dólar?",
    answer:
      "Sí, ambas monedas oficiales comparten la misma fecha valor publicada por el BCV y entran en vigencia a las 12:00 AM hora de Caracas (America/Caracas).",
    category: "Tasas oficiales del BCV",
  },
];

const USDT_FAQS: FaqItem[] = [
  {
    question: "¿Qué diferencia hay entre USDT Venta y USDT Compra en Binance P2P?",
    answer:
      "USDT Venta refleja el promedio de anuncios donde recibes bolívares al vender USDT en el mercado P2P, mientras que USDT Compra refleja la tasa en bolívares para adquirir USDT pagando por transferencia.",
    category: "USDT Binance P2P y brecha cambiaria",
  },
  {
    question: "¿Cómo se calculan las referencias de USDT Binance mostradas aquí?",
    answer:
      "Nuestro backend consulta periódicamente las primeras ofertas de comerciantes verificados en el par USDT/VES y calcula un promedio limpio meramente informativo.",
    category: "USDT Binance P2P y brecha cambiaria",
  },
  {
    question: "¿Cambio rápido compra, vende o intermedia divisas o USDT?",
    answer:
      "No. Cambio rápido es exclusivamente una herramienta informativa de consulta y cálculo matemático; no compramos, vendemos ni intermediamos transacciones en bolívares, divisas o criptoactivos.",
    category: "Calculadora y modo sin conexión",
  },
];

const BRECHA_FAQS: FaqItem[] = [
  {
    question: "¿Cómo se calcula la brecha cambiaria entre BCV y USDT?",
    answer:
      "La diferencia absoluta en bolívares es (Tasa USDT − Tasa Dólar BCV), y el porcentaje de brecha cambiaria se calcula como ((Tasa USDT − Tasa Dólar BCV) / Tasa Dólar BCV) × 100.",
    category: "USDT Binance P2P y brecha cambiaria",
  },
  {
    question: "¿Por qué mostramos el equivalente de la brecha en Dólar BCV?",
    answer:
      "Hablar solo de porcentajes puede resultar abstracto. Mostrar cuántos bolívares extra implica la brecha —y a cuántos dólares a tasa oficial BCV equivalen— ayuda a entender su impacto real en compras y cobros cotidianos.",
    category: "USDT Binance P2P y brecha cambiaria",
  },
];

const TENDENCIAS_FAQS: FaqItem[] = [
  {
    question: "¿Cómo se calculan los puntos diarios del gráfico de tendencias?",
    answer:
      "Para cada día calendario en hora de Caracas (America/Caracas), promediamos los registros almacenados para esa fecha y divisa, permitiendo comparar ventanas de 7, 15 o 30 días sin saltos de zona horaria.",
    category: "Calculadora y modo sin conexión",
  },
  {
    question: "¿Puedo comparar varias fuentes en el mismo gráfico?",
    answer:
      "Sí. Activa dos o más chips de fuentes (por ejemplo BCV Dólar y USDT Venta) para superponer las curvas y observar cómo evoluciona su diferencial.",
    category: "Calculadora y modo sin conexión",
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
        ...HOME_FAQS.slice(0, 1),
        ...DOLAR_BCV_FAQS,
        ...EURO_BCV_FAQS.slice(0, 1),
        ...USDT_FAQS.slice(0, 2),
        ...BRECHA_FAQS,
        ...HOME_FAQS.slice(3, 4),
        {
          question: "¿Funciona la calculadora si pierdo conexión a Internet?",
          answer:
            "Sí. Cada consulta exitosa guarda localmente en tu navegador las últimas tasas e historiales descargados para que puedas seguir convirtiendo montos aunque estés sin conexión.",
          category: "Calculadora y modo sin conexión",
        },
        ...USDT_FAQS.slice(2, 3),
      ];
    case "privacidad":
    case "not-found":
    default:
      return [];
  }
}
