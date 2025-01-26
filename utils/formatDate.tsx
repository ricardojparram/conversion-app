export function formatDate(timestamp) {
  if (typeof timestamp !== "number" || isNaN(timestamp)) {
    throw new Error("El timestamp debe ser un número válido.");
  }

  const fecha = new Date(timestamp);

  const dia = String(fecha.getDate()).padStart(2, "0"); // Asegura 2 dígitos
  const mes = String(fecha.getMonth() + 1).padStart(2, "0"); // Los meses van de 0 a 11
  const año = fecha.getFullYear();

  let horas = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  const segundos = String(fecha.getSeconds()).padStart(2, "0");
  const ampm = horas >= 12 ? "PM" : "AM";

  horas = horas % 12;
  horas = horas ? horas : 12;
  horas = String(horas).padStart(2, "0");

  return `${dia}/${mes}/${año} ${horas}:${minutos}:${segundos} ${ampm}`;
}
