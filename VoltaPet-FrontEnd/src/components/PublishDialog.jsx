import { useEffect, useRef, useState } from "react";
import { apiError, publishPet, uploadPetPhotos } from "../api/client";
import { PetPhotoInput } from "./PetPhotoInput";
import { reverseGeocode } from "../api/reverseGeocode";
import "./PublishDialogLocation.css";

const LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

// Nao inferimos automaticamente o bairro quando o raio de erro e grande.
const MAX_NEIGHBORHOOD_ACCURACY_METERS = 1500;

function locationErrorMessage(error) {
  switch (error?.code) {
    case 1:
      return "Permissão negada. Ative o acesso à localização no navegador ou preencha cidade e bairro manualmente.";
    case 2:
      return "Não foi possível identificar a localização. Verifique se o GPS ou a localização do dispositivo está ativada.";
    case 3:
      return "A localização demorou para responder. Tente novamente ou informe o local manualmente.";
    default:
      return "Não foi possível obter sua localização. Tente novamente ou informe o local manualmente.";
  }
}

export function PublishDialog({ defaultStatus, session, onClose, onPublished }) {
  const [status, setStatus] = useState(defaultStatus);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [alreadyCreated, setAlreadyCreated] = useState(null);
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [geoLocation, setGeoLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const [addressStatus, setAddressStatus] = useState("idle");
  const [addressMessage, setAddressMessage] = useState("");

  // Nunca sobrepor um campo que a pessoa ja digitou/corrigiu manualmente.
  const cityEditedRef = useRef(false);
  const neighborhoodEditedRef = useRef(false);
  const requestIdRef = useRef(0);
  const lookupControllerRef = useRef(null);

  useEffect(() => () => {
    requestIdRef.current += 1;
    lookupControllerRef.current?.abort();
  }, []);

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoMessage("Seu navegador não oferece geolocalização neste endereço. Use HTTPS ou localhost e confira as permissões.");
      return;
    }

    const requestId = ++requestIdRef.current;
    lookupControllerRef.current?.abort();
    setGeoLocation(null);
    setGeoStatus("locating");
    setGeoMessage("Obtendo localização do dispositivo...");
    setAddressStatus("idle");
    setAddressMessage("");

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (requestId !== requestIdRef.current) return;
          const { latitude, longitude, accuracy } = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
              latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            setGeoStatus("error");
            setGeoMessage("O dispositivo retornou coordenadas inválidas. Tente novamente.");
            return;
          }

          const location = {
            latitude: Number(latitude.toFixed(6)),
            longitude: Number(longitude.toFixed(6)),
            accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
          };

          setGeoLocation(location);
          setGeoStatus("success");
          setGeoMessage("Localização obtida. Confira se este é o local relacionado à ocorrência.");
          setAddressStatus("loading");
          setAddressMessage("Identificando cidade e bairro pelas coordenadas...");

          const controller = new AbortController();
          lookupControllerRef.current = controller;
          reverseGeocode(location.latitude, location.longitude, controller.signal)
            .then(({ city: foundCity, neighborhood: foundNeighborhood }) => {
              if (requestId !== requestIdRef.current || controller.signal.aborted) return;
              if (foundCity && !cityEditedRef.current) setCity(foundCity);

              const reliableNeighborhood =
                location.accuracy !== null &&
                location.accuracy <= MAX_NEIGHBORHOOD_ACCURACY_METERS;
              if (foundNeighborhood && reliableNeighborhood && !neighborhoodEditedRef.current) {
                setNeighborhood(foundNeighborhood);
              }

              setAddressStatus("done");
              if (!foundCity && !foundNeighborhood) {
                setAddressMessage("Não foi possível identificar cidade e bairro automaticamente. Preencha manualmente.");
              } else if (!reliableNeighborhood) {
                setAddressMessage("Cidade sugerida quando disponível. Como a localização é imprecisa, confirme e informe o bairro manualmente.");
              } else if (!foundNeighborhood) {
                setAddressMessage("Cidade sugerida quando disponível. O bairro não foi identificado; preencha-o manualmente.");
              } else {
                setAddressMessage("Cidade e bairro sugeridos automaticamente. Confira os dois campos antes de publicar.");
              }
            })
            .catch((lookupError) => {
              if (requestId !== requestIdRef.current || controller.signal.aborted || lookupError?.name === "AbortError") return;
              setAddressStatus("error");
              setAddressMessage("Não foi possível consultar cidade e bairro agora. As coordenadas foram mantidas; preencha os campos manualmente.");
            });
        },
        (geoError) => {
          if (requestId !== requestIdRef.current) return;
          setGeoLocation(null);
          setGeoStatus("error");
          setGeoMessage(locationErrorMessage(geoError));
        },
        LOCATION_OPTIONS,
      );
    } catch (_error) {
      if (requestId !== requestIdRef.current) return;
      setGeoStatus("error");
      setGeoMessage("Não foi possível solicitar a localização. Verifique as permissões do navegador.");
    }
  }

  function removeLocation() {
    requestIdRef.current += 1;
    lookupControllerRef.current?.abort();
    setGeoLocation(null);
    setGeoStatus("idle");
    setGeoMessage("");
    setAddressStatus("idle");
    setAddressMessage("");
    // Cidade e bairro ja sugeridos permanecem editaveis; apenas coordenadas sao removidas.
  }

  async function submit(event) {
    event.preventDefault();
    if (pending || geoStatus === "locating" || addressStatus === "loading") return;

    setPending(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      ...form,
      status,
      name: form.name.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      description: form.description.trim(),
      ...(geoLocation ? {
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
      } : {}),
    };

    try {
      // Fotos são opcionais e enviadas numa requisição em lote para evitar duplicatas.
      // Se o envio falhar, manter o ID permite repetir sem recriar a ocorrência.
      const created = alreadyCreated || await publishPet(payload, session.token);
      if (photos.length > 0) {
        try {
          const updated = await uploadPetPhotos(created.id, photos, session.token);
          onPublished(updated);
          return;
        } catch (uploadError) {
          setAlreadyCreated(created);
          setError(`Ocorrência salva, mas as fotos não foram enviadas. ${apiError(uploadError)} Você pode tentar novamente sem duplicar a ocorrência.`);
          return;
        }
      }
      onPublished(created);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setPending(false);
    }
  }

  const isResolving = addressStatus === "loading";
  const busy = pending || geoStatus === "locating" || isResolving;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal-dialog publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <button type="button" className="close-button" onClick={onClose} aria-label="Fechar">×</button>
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
            <label>Cidade<input name="city" required maxLength={100} placeholder="Ex.: Florianópolis" value={city} onChange={(event) => { cityEditedRef.current = true; setCity(event.target.value); }} /></label>
            <label>Bairro<input name="neighborhood" required maxLength={100} placeholder="Ex.: Trindade" value={neighborhood} onChange={(event) => { neighborhoodEditedRef.current = true; setNeighborhood(event.target.value); }} /></label>
          </div>

          <div className="location-panel" aria-label="Localização da ocorrência">
            <div className="location-panel-heading">
              <span className="location-panel-icon" aria-hidden="true">📍</span>
              <div>
                <strong>Localização da ocorrência <span>(opcional)</span></strong>
                <p>Use a posição atual somente se estiver no local onde o animal foi visto.</p>
              </div>
            </div>
            <div className="location-panel-actions">
              <button
                type="button"
                className="location-button"
                onClick={getCurrentLocation}
                disabled={busy}
                aria-busy={geoStatus === "locating" || isResolving}
              >
                {geoStatus === "locating" ? "Localizando..." : isResolving ? "Consultando endereço..." : geoLocation ? "↻ Atualizar localização" : "◎ Usar minha localização atual"}
              </button>
              {geoLocation && (
                <button type="button" className="location-remove" onClick={removeLocation} disabled={pending}>
                  Remover
                </button>
              )}
            </div>
            {geoMessage && (
              <p className={`location-feedback ${geoStatus === "error" ? "location-feedback-error" : ""}`} role={geoStatus === "error" ? "alert" : "status"}>
                {geoMessage}
              </p>
            )}
            {addressMessage && (
              <p className="location-address-feedback" role="status">{addressMessage}</p>
            )}
            {geoLocation && (
              <div className="location-coordinates">
                <strong>Coordenadas:</strong> {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
                {geoLocation.accuracy !== null && <span> · Precisão estimada: ±{geoLocation.accuracy} m</span>}
              </div>
            )}
            <small>
              Ao usar esta opção, suas coordenadas são consultadas no serviço Nominatim para sugerir cidade e bairro.
              A localização não é rastreada continuamente. Revise os campos; coordenadas só serão enviadas ao VoltaPet quando publicar.
              {" "}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Dados © OpenStreetMap contributors</a>.
            </small>
          </div>

          <PetPhotoInput onChange={setPhotos} disabled={pending} />
          <label>Conte o que aconteceu<textarea name="description" minLength={10} maxLength={2000} required rows="4" placeholder="Cor, porte, onde foi visto pela última vez e outras informações úteis..." /></label>
          <p className="privacy-note">🔒 Não utilize a localização da sua residência se a ocorrência foi em outro lugar. Evite compartilhar endereços privados.</p>
          {alreadyCreated && <p className="location-feedback" role="status">Ocorrência já criada. Ao enviar novamente, apenas as fotos serão adicionadas. Outras alterações nos campos não serão salvas.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{pending ? "Enviando..." : alreadyCreated ? "Tentar enviar fotos novamente" : "Publicar ocorrência"}</button>
        </form>
      </section>
    </div>
  );
}
