import { useEffect, useRef, useState } from "react";
import { apiError, createSighting } from "../api/client";
import "./Sighting.css";
import { consultarViaCep, formatarCep } from "../api/viaCep";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

function nowLocal() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function SightingDialog({ pet, session, onClose, onReported }) {
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cepStatus, setCepStatus] = useState("idle");
  const [cepMessage, setCepMessage] = useState("");
  const addressEdited = useRef({ street: false, city: false, neighborhood: false });
  const [number, setNumber] = useState("");
  const [details, setDetails] = useState("");
  const [seenAt, setSeenAt] = useState(nowLocal);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Consulta apenas depois de oito dígitos. AbortController protege contra resultados antigos.
  useEffect(() => {
    const cep = postalCode.replace(/\D/g, "");
    if (cep.length !== 8) {
      setCepStatus("idle");
      setCepMessage("");
      return;
    }
    const controller = new AbortController();
    setCepStatus("loading");
    setCepMessage("Consultando CEP no ViaCEP...");
    consultarViaCep(cep, controller.signal)
      .then((address) => {
        if (controller.signal.aborted) return;
        if (address.logradouro && !addressEdited.current.street) setStreet(address.logradouro);
        if (address.localidade && !addressEdited.current.city) setCity(address.localidade);
        if (address.bairro && !addressEdited.current.neighborhood) setNeighborhood(address.bairro);
        setCepStatus("success");
        setCepMessage(address.logradouro && address.bairro
          ? "Endereço sugerido pelo ViaCEP. Confira antes de enviar."
          : "CEP encontrado. Preencha manualmente os campos que não foram informados pelo ViaCEP.");
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === "AbortError") return;
        setCepStatus("error");
        setCepMessage(error?.message || "Não foi possível consultar o CEP. Preencha o endereço manualmente.");
      });
    return () => controller.abort();
  }, [postalCode]);

  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function choosePhotos(event) {
    const candidates = [...event.target.files];
    event.target.value = "";
    if (candidates.length + photos.length > 3) {
      setError("É possível enviar no máximo três fotos.");
      return;
    }
    if (candidates.some((file) => !["image/jpeg", "image/png"].includes(file.type) || file.size > MAX_PHOTO_BYTES)) {
      setError("As fotos devem ser JPG/PNG de até 5 MB cada.");
      return;
    }
    setError("");
    setPhotos((current) => [...current, ...candidates]);
  }

  function chooseVideo(event) {
    const file = event.target.files?.[0] ?? null;
    if (file && (!["video/mp4", "video/webm"].includes(file.type) || file.size > MAX_VIDEO_BYTES)) {
      setError("O vídeo deve ser MP4 ou WebM de até 20 MB.");
      event.target.value = "";
      return;
    }
    setVideo(file);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (pending || cepStatus === "loading") return;
    const cleanedZip = postalCode.replace(/\D/g, "");
    if (cleanedZip.length !== 8) { setError("Informe um CEP válido com 8 dígitos."); return; }
    const timestamp = new Date(seenAt);
    if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > Date.now() + 5 * 60 * 1000) {
      setError("Informe uma data e hora válidas, que não estejam no futuro.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await createSighting(pet.id, {
        postalCode: cleanedZip,
        street: street.trim(),
        city: city.trim(),
        neighborhood: neighborhood.trim(),
        houseNumber: number.trim(),
        addressDetails: details.trim() || null,
        seenAt: timestamp.toISOString(),
        description: description.trim() || null,
      }, [...photos, ...(video ? [video] : [])], session.token);
      onReported();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !pending && onClose()}>
      <section className="modal-dialog sighting-dialog" role="dialog" aria-modal="true" aria-labelledby="sighting-title">
        <button className="close-button" type="button" disabled={pending} onClick={onClose} aria-label="Fechar">×</button>
        <div className="modal-icon" aria-hidden="true">👀</div>
        <h2 id="sighting-title">Vi este pet</h2>
        <p className="modal-subtitle">Conte onde e quando viu <strong>{pet.name}</strong>. As informações completas serão acessíveis somente a quem publicou a ocorrência.</p>
        <form className="stacked-form" onSubmit={submit}>
          <div className="form-grid">
            <label>CEP *<input required inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="88000-000" value={postalCode} onChange={(e) => setPostalCode(formatarCep(e.target.value))} /></label>
            <label>Número *<input required maxLength={20} placeholder="123 ou S/N" value={number} onChange={(e) => setNumber(e.target.value)} /></label>
          </div>
          {cepMessage && <p className={`sighting-cep-feedback ${cepStatus === "error" ? "sighting-cep-error" : ""}`} role="status">{cepMessage}</p>}
          <label>Rua / logradouro *<input required maxLength={150} autoComplete="address-line1" placeholder="Nome da rua ou avenida" value={street} onChange={(e) => { addressEdited.current.street = true; setStreet(e.target.value); }} /></label>
          <div className="form-grid">
            <label>Cidade *<input required maxLength={100} autoComplete="address-level2" placeholder="Ex.: Florianópolis" value={city} onChange={(e) => { addressEdited.current.city = true; setCity(e.target.value); }} /></label>
            <label>Bairro *<input required maxLength={100} placeholder="Ex.: Centro" value={neighborhood} onChange={(e) => { addressEdited.current.neighborhood = true; setNeighborhood(e.target.value); }} /></label>
          </div>
          <label>Endereço complementar / ponto de referência (opcional)<input maxLength={200} placeholder="Próximo à praça, comércio ou ponto de ônibus" value={details} onChange={(e) => setDetails(e.target.value)} /></label>
          <label>Data e horário em que foi visto *<input required type="datetime-local" max={nowLocal()} value={seenAt} onChange={(e) => setSeenAt(e.target.value)} /></label>
          <label>Descrição (opcional)<textarea rows="3" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Direção em que o pet seguiu, condição do animal e outras pistas" /></label>
          <div className="sighting-uploads">
            <label>Fotos (opcional, até 3, JPG/PNG, 5 MB cada)
              <input type="file" accept="image/jpeg,image/png" multiple onChange={choosePhotos} disabled={pending || photos.length >= 3} aria-label="Selecionar fotos do avistamento" />
            </label>
            {previews.length > 0 && <div className="sighting-preview-list">{previews.map((url, index) => <div className="sighting-preview" key={url}><img src={url} alt={`Prévia ${index + 1}`} /><button type="button" disabled={pending} onClick={() => setPhotos(current => current.filter((_, i) => i !== index))} aria-label={`Remover foto ${index + 1}`}>×</button></div>)}</div>}
            <label>Vídeo (opcional, 1 vídeo MP4/WebM, até 20 MB)
              <input type="file" accept="video/mp4,video/webm" onChange={chooseVideo} disabled={pending} aria-label="Selecionar vídeo do avistamento" />
            </label>
            {video && <p className="sighting-file-name">{video.name} <button type="button" disabled={pending} onClick={() => setVideo(null)}>Remover vídeo</button></p>}
          </div>
          <p className="privacy-note">🔒 Registre apenas o local onde o animal foi visto. Evite expor endereços residenciais de terceiros e não publique imagens de pessoas sem autorização.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={pending || cepStatus === "loading"} type="submit">{pending ? "Enviando avistamento..." : cepStatus === "loading" ? "Consultando CEP..." : "Enviar avistamento"}</button>
        </form>
      </section>
    </div>
  );
}
