import { useState, useEffect } from "react";
import { Typography } from "@/components/Typography";
import { Div } from "@/components/Div";
import { Currency, TextCurrency } from "@/components/Currency";
import { useFetchConvertions } from "@/hooks/useFetchConvertions";

export default function Index() {
  const [bs, setBs] = useState(0);
  const [usd, setUSD] = useState(1);
  const [convertions, isFetching] = useFetchConvertions();
  console.log(convertions);
  const [calculatedBs, setCalculatedBs] = useState({
    bcv: 0,
    paralelo: 0,
    promedio: 0,
  });

  const [calculatedUSD, setCalculatedUSD] = useState({
    bcv: 0,
    paralelo: 0,
    promedio: 0,
  });
  useEffect(() => {
    setCalculatedBs({
      bcv: bs,
      paralelo: bs,
      promedio: bs,
    });
    const bcv_ = bs / convertions.bcv;
    const paralelo_ = bs / convertions.paralelo;
    setCalculatedUSD({
      bcv: bcv_,
      paralelo: paralelo_,
      promedio: (bcv_ + paralelo_) / 2,
    });
    setUSD(0);
  }, [bs]);

  useEffect(() => {
    setCalculatedUSD({
      bcv: usd,
      paralelo: usd,
      promedio: usd,
    });

    const bcv_ = usd * convertions.bcv;
    const paralelo_ = usd * convertions.paralelo;
    setCalculatedBs({
      bcv: bcv_,
      paralelo: paralelo_,
      promedio: (bcv_ + paralelo_) / 2,
    });

    setBs(0);
  }, [usd]);
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
            <Typography type="subtitle">Paralelo </Typography>
            <Typography>{convertions.dateParalelo}</Typography>
            <TextCurrency suffix="$  " value={calculatedUSD.paralelo} />
            <TextCurrency value={calculatedBs.paralelo} />
          </Div>
          <Div>
            <Typography type="subtitle">BCV</Typography>
            <Typography>{convertions.dateBcv}</Typography>
            <TextCurrency suffix="$  " value={calculatedUSD.bcv} />
            <TextCurrency value={calculatedBs.bcv} />
          </Div>

          <Div>
            <Typography type="subtitle">Promedio</Typography>
            <TextCurrency suffix="$  " value={calculatedUSD.promedio} />
            <TextCurrency value={calculatedBs.promedio} />
          </Div>
        </Div>
      )}
    </Div>
  );
}
