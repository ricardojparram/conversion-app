import { useEffect, useState } from "react";
import { formatDate } from "@/utils/formatDate";

const API_URL = "https://api.alcambio.app/graphql";
export function useFetchConvertions() {
  const [data, setData] = useState({});
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: "api.alcambio.app",
        },
        body: JSON.stringify({
          query: `
            query ($countryCode: String!) {
              getCountryConversions(payload: {countryCode: $countryCode}) {
                conversionRates {
                  baseValue
                  official
                  principal
                  rateCurrency {
                    name
                    symbol
                  }
                }
                dateParalelo
                dateBcv
              }
            }
          `,
          variables: {
            countryCode: "VE",
          },
        }),
      })
        .then((response) => response.json())
        .catch((error) => console.error("Error:", error))
        .finally(() => setIsFetching(false));
      const { conversionRates, dateBcv, dateParalelo } =
        res.data.getCountryConversions;
      const allDollars = conversionRates.filter(
        (e) => e.rateCurrency.symbol === "$",
      );
      const currencies = allDollars.reduce(
        (acc, el) => {
          if (el.official) {
            acc.bcv = el.baseValue;
          } else {
            acc.paralelo = el.baseValue;
          }
          return acc;
        },
        { paralelo: 0, bcv: 0 },
      );
      setData({
        ...currencies,
        dateBcv: formatDate(dateBcv),
        dateParalelo: formatDate(dateParalelo),
      });
    };
    fetchData();
  }, []);

  return [data, isFetching];
}
