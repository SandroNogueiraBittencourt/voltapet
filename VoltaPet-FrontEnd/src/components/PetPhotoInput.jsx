import { useEffect, useState } from "react";
import "./PetPhotoInput.css";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png"];

export function PetPhotoInput({ onChange, disabled = false }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function select(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES || file.size === 0) {
      onChange(null);
      setPreview(null);
      setError("Escolha uma foto JPG ou PNG de até 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function remove() {
    onChange(null);
    setPreview(null);
    setError("");
  }

  return (
    <div className="pet-photo-panel">
      <div className="pet-photo-heading">
        <span className="pet-photo-icon" aria-hidden="true">📷</span>
        <div><strong>Foto do pet <span>(opcional)</span></strong>
          <p>Uma foto facilita o reconhecimento. JPG ou PNG, até 5 MB.</p>
        </div>
      </div>
      {preview ? (
        <div className="pet-photo-preview-wrap">
          <img src={preview} alt="Prévia da foto selecionada do pet" className="pet-photo-preview" />
          <button type="button" className="pet-photo-remove" onClick={remove} disabled={disabled}>Remover foto</button>
        </div>
      ) : (
        <label className="pet-photo-select">Selecionar foto do pet
          <input type="file" accept="image/jpeg,image/png" onChange={select} disabled={disabled} aria-label="Escolher foto do pet" />
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
