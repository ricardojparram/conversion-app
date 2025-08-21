import { TouchableOpacity, ViewStyle } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { formatCurrency } from "@/utils/formatCurrency";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Convertions } from "@/types/convertions";
import { getCaracasDate } from "@/utils/getCaracasDate";
import { useState } from "react";
import { formatDate } from "@/utils/formatDate";

export const ConvertionDisplay = ({
  convertions,
  setRate,
}: {
  convertions: Convertions;
  setRate: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [textSecondaryColor, bgColor, borderColor, iconColor] = useThemeColor(
    "textSecondary",
    "backgroundSecondary",
    "border",
    "icon"
  );
  const [updatedAt, setUpdatedAt] = useState<string>(
    formatDate(new Date().getTime())
  );
  const [selectedId, setSelectedId] = useState<number>(1);
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
          Actualizado: {updatedAt}
        </Typography>
      </Div>
      <Div
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {convertions.length > 0 && convertions.map((row, i) => {
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
            padding: isActive ? 11 : 12,
          };

          let rate = row.rate;
          let date = row.date;
          if (row.source === "BCV") {
            const fechaCaracas = getCaracasDate();
            const fechaFija = getCaracasDate(row.date);
            if (fechaCaracas < fechaFija) {
              rate = row.rate_old;
              date = row.date_old;
            }
          }

          return (
            <TouchableOpacity
              key={row.currency_id}
              onPress={() => {
                setRate(+rate);
                setSelectedId(row.currency_id);
                setUpdatedAt(formatDate(new Date(date).getTime()));
              }}
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
                {formatCurrency(rate, "Bs")}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </Div>
    </Div>
  );
};
