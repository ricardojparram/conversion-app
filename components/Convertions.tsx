import { useState } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { useThemeColor } from "@/hooks/useThemeColor";
import { formatCurrency } from "@/utils/formatCurrency";
// ...existing code...

// Datos de ejemplo para las fuentes de tipo de cambio
const fuentesCambio = [
  {
    id: "bcv_usd",
    label: "BCV Dólar",
    value: 29.03,
    display: "Bs",
    active: true,
  },
  {
    id: "bcv_eur",
    label: "BCV Euro",
    value: 39.42,
    display: "Bs",
    active: false,
  },
  {
    id: "binance",
    label: "Binance P2P",
    value: 37.2,
    display: "Bs",
    active: false,
  },
];

export const ConvertionDisplay = () => {
  // Puedes agregar lógica para cambiar el activo si lo necesitas
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
          display: "flex",
          flex: 2,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {fuentesCambio.map((fuente) => (
          <Div
            key={fuente.id}
            style={{
              backgroundColor: fuente.active ? iconColor : bgColor,
              flex: 1,
              borderStyle: "solid",
              borderColor: fuente.active ? "#037c2f" : borderColor,
              borderWidth: fuente.active ? 2 : 1,
              borderRadius: 10,
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: 10,
              // boxShadow: fuente.active ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <Typography
              type="defaultSemiBold"
              style={{
                color: fuente.active ? "white" : textSecondaryColor,
              }}
            >
              {fuente.label}
            </Typography>
            <Typography
              type="defaultSemiBold"
              style={{
                marginTop: 2,
                color: fuente.active ? "white" : iconColor,
              }}
            >
              {formatCurrency(fuente.value, "Bs")}
            </Typography>
          </Div>
        ))}
      </Div>
    </Div>
  );
};
