import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const client = axios.create({ baseURL, timeout: 12000 });

export function apiError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.status === 401) return "Sua sessão expirou. Entre novamente.";
  if (error.response?.status === 403) return "Você não tem permissão para realizar esta ação.";
  if (!error.response) return "Não foi possível conectar ao servidor. Tente novamente.";
  return "Ocorreu um problema. Tente novamente.";
}

export async function listPets({ status, query }) {
  const { data } = await client.get("/pets", {
    params: { status: status || undefined, query: query || undefined, size: 24 },
  });
  return data;
}

export async function getPet(id) {
  const { data } = await client.get(`/pets/${encodeURIComponent(id)}`);
  return data;
}

export async function authenticate(mode, credentials) {
  const { data } = await client.post(`/auth/${mode}`, credentials);
  return data;
}

export async function publishPet(payload, token) {
  const { data } = await client.post("/pets", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function uploadPetPhoto(id, file, token) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post(`/pets/${encodeURIComponent(id)}/photo`, form, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });
  return data;
}

export async function uploadPetPhotos(id, files, token) {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  const { data } = await client.post(`/pets/${encodeURIComponent(id)}/photos`, form, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 60000,
  });
  return data;
}

export async function reunitePet(id, token) {
  const { data } = await client.post(`/pets/${encodeURIComponent(id)}/reunite`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
