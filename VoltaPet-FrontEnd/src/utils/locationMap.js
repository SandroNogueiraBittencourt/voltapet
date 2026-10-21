/** Cria um link de mapa a partir de coordenadas públicas aproximadas, não do endereço exato. */
export function locationMapUrls(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  // A API envia somente duas casas decimais (~1 km de resolução).
  // O mapa mostra um bairro/região, nunca um endereço residencial exato.
  const latApprox = Number(lat.toFixed(2));
  const lonApprox = Number(lon.toFixed(2));
  const latDelta = 0.018;
  const lonDelta = 0.028;
  const bbox = [lonApprox - lonDelta, latApprox - latDelta,
    lonApprox + lonDelta, latApprox + latDelta].map(value => value.toFixed(6)).join(",");

  const embed = new URL("https://www.openstreetmap.org/export/embed.html");
  embed.searchParams.set("bbox", bbox);
  embed.searchParams.set("layer", "mapnik");
  embed.searchParams.set("marker", `${latApprox},${lonApprox}`);

  const full = new URL("https://www.openstreetmap.org/");
  full.hash = `map=13/${latApprox}/${lonApprox}&mlat=${latApprox}&mlon=${lonApprox}`;
  return { embedUrl: embed.toString(), fullUrl: full.toString() };
}

export function localitySearchUrl(city, neighborhood) {
  const area = [neighborhood, city].filter(Boolean).join(", ").trim();
  return area ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(area)}` : null;
}
