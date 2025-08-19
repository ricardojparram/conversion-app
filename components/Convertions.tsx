import { TouchableOpacity, ViewStyle } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { formatCurrency } from "@/utils/formatCurrency";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";

// Tipo para permitir span por tarjeta (1 o 2 columnas)
type FuenteCambio = {
  id: string;
  label: string;
  value: number;
  display: string;
  span?: 1 | 2; // por defecto 1 columna
};

// Se elimina el array de datos hardcodeado de aquí

export const ConvertionDisplay = ({
  fuentes,
  selectedId,
  onSelect,
}: {
  fuentes: FuenteCambio[];
  selectedId: number;
  onSelect: (id: number) => void;
}) => {
  const convertions = [
    {
      code: "USD",
      currency_id: 1,
      currency_name: "BCV Dólar",
      rate: 136.89,
      rate_date: "2025-08-19T00:00:00",
      symbol: "$",
    },
    {
      code: "EUR",
      currency_id: 2,
      currency_name: "BCV Euro",
      rate: 160.28,
      rate_date: "2025-08-19T00:00:00",
      symbol: "€",
    },
    {
      code: "USDT",
      currency_id: 3,
      currency_name: "Binance Dolar",
      rate: 195.02,
      rate_date: "2025-08-18T21:30:02.477928",
      symbol: "$",
    },
  ];
  const [textColor, textSecondaryColor, bgColor, borderColor, iconColor] =
    useThemeColor(
      "text",
      "textSecondary",
      "backgroundSecondary",
      "border",
      "icon"
    );
  return (
    <Div style={{ paddingTop: 20 }}>
      <Div
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Typography type="md">Fuentes</Typography>
        <Typography type="md" style={{ opacity: 0.7 }}>
          Actualizado: 31/7/25 20:32
        </Typography>
      </Div>
      <Div
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {convertions.map((row, i) => {
          const isActive = row.currency_id === selectedId;
          const span =
            (i + 1) % 2 === 1 && i + 1 === convertions.length ? 2 : 1;
          const containerStyle: ViewStyle = {
            width: span === 2 ? "100%" : "48%",
            backgroundColor: isActive ? iconColor : bgColor,
            borderStyle: "solid",
            borderColor: isActive ? "#037c2f" : borderColor,
            borderWidth: isActive ? 2 : 1,
            borderRadius: 10,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: isActive ? 9 : 10,
          };

          return (
            <TouchableOpacity
              key={row.currency_id}
              onPress={() => onSelect(row.currency_id)}
              style={containerStyle}
            >
              <Typography
                type="defaultSemiBold"
                style={{
                  color: isActive ? "white" : textSecondaryColor,
                }}
              >
                {row.currency_name}
              </Typography>
              <Typography
                type="defaultSemiBold"
                style={{
                  marginTop: 2,
                  color: isActive ? "white" : iconColor,
                }}
              >
                {formatCurrency(row.rate, "Bs")}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </Div>
    </Div>
  );
};
