// Conversao de coordenadas em localidade para uso pontual no cadastro.
// Servico publico Nominatim: somente uma consulta por clique, sem autocomplete.
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

export async function reverseGeocode(latitude, longitude, signal) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    addressdetails: "1",
    zoom: "18",
    layer: "address",
    "accept-language": "pt-BR",
  });

  const response = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    referrerPolicy: "strict-origin-when-cross-origin",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Falha no serviço de localização (HTTP ${response.status})`);
  }

  const data = await response.json();
  const address = data?.address ?? {};

  // OSM varia a classificação conforme a região e a cartografia disponível.
  return {
    city: address.city || address.town || address.municipality || address.village || "",
    neighborhood:
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      address.city_district ||
      address.borough ||
      address.residential ||
      "",
  };
}
