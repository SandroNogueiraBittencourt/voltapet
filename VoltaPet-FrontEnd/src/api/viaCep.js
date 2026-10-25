// ViaCEP: a API retorna bairro e logradouro vazios para alguns CEPs.
// Nunca confie no CEP para deduzir número de residência ou localização exata.
export function formatarCep(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export async function consultarViaCep(value, signal) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) throw new Error("Informe um CEP válido com 8 dígitos.");
  let response;
  try {
    response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("Não foi possível consultar o ViaCEP. Preencha o endereço manualmente.");
  }
  if (!response.ok) throw new Error("ViaCEP indisponível. Preencha o endereço manualmente.");
  let address;
  try { address = await response.json(); }
  catch { throw new Error("Resposta inválida do ViaCEP. Preencha o endereço manualmente."); }
  if (address?.erro === true || address?.erro === "true") {
    throw new Error("CEP não encontrado. Confira os números ou preencha manualmente.");
  }
  if (!address || typeof address !== "object" || typeof address.localidade !== "string") {
    throw new Error("ViaCEP não retornou dados suficientes. Preencha o endereço manualmente.");
  }
  return {
    logradouro: typeof address.logradouro === "string" ? address.logradouro.trim().slice(0, 150) : "",
    bairro: typeof address.bairro === "string" ? address.bairro.trim().slice(0, 100) : "",
    localidade: address.localidade.trim().slice(0, 100),
  };
}
