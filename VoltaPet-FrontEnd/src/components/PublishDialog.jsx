import { useState } from "react";
import { apiError, publishPet } from "../api/client";

export function PublishDialog({ defaultStatus, session, onClose, onPublished }) {
  const [status, setStatus] = useState(defaultStatus);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      ...form,
      status,
      name: form.name.trim(),
      city: form.city.trim(),
      neighborhood: form.neighborhood.trim(),
      description: form.description.trim(),
    };
    try {
      const created = await publishPet(payload, session.token);
      onPublished(created);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal-dialog publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <button className="close-button" onClick={onClose} aria-label="Fechar">×</button>
        <div className="modal-icon" aria-hidden="true">🐾</div>
        <h2 id="publish-title">Compartilhe uma ocorrência</h2>
        <p className="modal-subtitle">Cada informação pode indicar um caminho de volta.</p>
        <form className="stacked-form" onSubmit={submit}>
          <fieldset className="field-toggle">
            <legend>O que aconteceu?</legend>
            <div className="toggle-options">
              <label><input type="radio" checked={status === "LOST"} onChange={() => setStatus("LOST")} /> Perdi meu pet</label>
              <label><input type="radio" checked={status === "FOUND"} onChange={() => setStatus("FOUND")} /> Encontrei um pet</label>
            </div>
          </fieldset>
          <div className="form-grid">
            <label>Nome do pet<input name="name" required maxLength={100} placeholder="Ex.: Luna ou Não identificado" /></label>
            <label>Tipo de animal<select name="type" required defaultValue="DOG"><option value="DOG">Cachorro</option><option value="CAT">Gato</option><option value="OTHER">Outro</option></select></label>
            <label>Cidade<input name="city" required maxLength={100} placeholder="Ex.: Florianópolis" /></label>
            <label>Bairro<input name="neighborhood" required maxLength={100} placeholder="Ex.: Trindade" /></label>
          </div>
          <label>Conte o que aconteceu<textarea name="description" minLength={10} maxLength={2000} required rows={4} placeholder="Cor, porte, onde foi visto pela última vez e outras informações úteis..." /></label>
          <p className="privacy-note">🔒 Compartilhe informações sobre o animal, sem expor dados pessoais ou endereços privados.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={pending}>{pending ? "Publicando..." : "Publicar ocorrência"}</button>
        </form>
      </section>
    </div>
  );
}
