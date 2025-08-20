
export function getCaracasDate(date?: string) {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Caracas",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const [{ value: month }, , { value: day }, , { value: year }] =
        dtf.formatToParts(date ? new Date(date) : new Date());
    return new Date(`${year}-${month}-${day}T00:00:00`);
}