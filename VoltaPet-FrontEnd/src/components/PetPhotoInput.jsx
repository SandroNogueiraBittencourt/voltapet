import { useEffect, useRef, useState } from "react";
import "./PetPhotoInput.css";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 3;
const ALLOWED = ["image/jpeg", "image/png"];

export function PetPhotoInput({ onChange, disabled = false }) {
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const selectedRef = useRef([]);

  // Revoga as URLs temporárias quando o modal é fechado.
  useEffect(() => () => {
    for (const item of selectedRef.current) URL.revokeObjectURL(item.url);
  }, []);

  function select(event) {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (picked.length === 0) return;
    if (picked.length + selected.length > MAX_PHOTOS) {
      setError("Você pode selecionar no máximo 3 fotos por animal.");
      return;
    }
    if (picked.some((file) => !ALLOWED.includes(file.type) || file.size < 1 || file.size > MAX_BYTES)) {
      setError("Escolha apenas fotos JPG ou PNG de até 5 MB cada.");
      return;
    }
    const next = [...selected, ...picked.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
    }))];
    selectedRef.current = next;
    setSelected(next);
    setError("");
    onChange(next.map((item) => item.file));
  }

  function remove(id) {
    const item = selected.find((entry) => entry.id === id);
    if (!item) return;
    URL.revokeObjectURL(item.url);
    const next = selected.filter((entry) => entry.id !== id);
    selectedRef.current = next;
    setSelected(next);
    setError("");
    onChange(next.map((entry) => entry.file));
  }

  return (
    <div className="pet-photo-panel">
      <div className="pet-photo-heading">
        <span className="pet-photo-icon" aria-hidden="true">📷</span>
        <div>
          <strong>Fotos do pet <span>(opcional) — {selected.length} de 3</span></strong>
          <p>Inclua até três fotos para facilitar o reconhecimento. JPG ou PNG, até 5 MB cada.</p>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="pet-photo-grid" aria-label="Fotos selecionadas">
          {selected.map((item, index) => (
            <div key={item.id} className="pet-photo-tile">
              <img src={item.url} alt={`Prévia da foto ${index + 1} do pet`} className="pet-photo-preview" />
              <button type="button" className="pet-photo-remove" onClick={() => remove(item.id)} disabled={disabled} aria-label={`Remover foto ${index + 1}`}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
      {selected.length < MAX_PHOTOS && (
        <label className="pet-photo-select">
          {selected.length ? "Adicionar mais fotos" : "Selecionar fotos do pet"}
          <input type="file" multiple accept="image/jpeg,image/png" onChange={select} disabled={disabled} aria-label="Escolher fotos do pet" />
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
