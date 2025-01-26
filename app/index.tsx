import { useState } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Currency, TextCurrency } from "@/components/Currency";
import { useFetchConvertions } from "@/hooks/useFetchConvertions";

export default function Index() {
  const [bs, setBs] = useState(0);
  const [usd, setUSD] = useState(0);
  const [convertions, isFetching] = useFetchConvertions();
  console.log(convertions);
  return (
    <Div
      style={{
        flex: 1,
        alignItems: "center",
        paddingTop: 50,
        padding: 20,
      }}
    >
      <Typography type="title">Cambio rápido</Typography>
      <Div
        style={{
          flex: 1,
          gap: 10,
          width: "100%",
          paddingVertical: 10,
          paddingHorizontal: 40,
        }}
      >
        <Div>
          <Typography style={{ paddingLeft: 5 }} type="defaultSemiBold">
            Bolivares.
          </Typography>
          <Currency value={bs} onChangeValue={setBs} />
        </Div>

        <Div>
          <Typography style={{ paddingLeft: 5 }} type="defaultSemiBold">
            Dolares.
          </Typography>
          <Currency suffix="$  " value={usd} onChangeValue={setUSD} />
        </Div>
      </Div>
      {isFetching ? (
        <Typography type="subtitle">Cargando...</Typography>
      ) : (
        <Div
          style={{
            flex: 2,
            gap: 10,
            width: "100%",
            paddingVertical: 10,
            paddingHorizontal: 40,
          }}
        >
          <Div>
            <Typography type="subtitle">Paralelo</Typography>
            <TextCurrency value={convertions.paralelo} />
          </Div>

          <Div>
            <Typography type="subtitle">BCV</Typography>
            <TextCurrency value={convertions.bcv} />
          </Div>
        </Div>
      )}
    </Div>
  );
}
