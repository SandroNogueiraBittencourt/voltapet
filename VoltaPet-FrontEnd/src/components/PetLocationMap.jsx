import { useEffect, useState } from "react";
import { listSightings } from "../api/client";
import { OwnerSightingMap } from "./SightingMap";
import { localitySearchUrl, locationMapUrls } from "../utils/locationMap";
import "./PetLocationMap.css";

/** Mapa público apenas da região aproximada da ocorrência; não usa GPS do visitante. */
export function PetLocationMap({ pet, token }) {
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState("");
  useEffect(() => {
    if (!token || !pet.isOwner) { setReports([]); setReportsError(""); return; }
    let active = true;
    setLoadingReports(true);
    setReportsError("");
    listSightings(pet.id, token)
      .then((data) => { if (active) setReports(data); })
      .catch(() => { if (active) setReportsError("Não foi possível carregar os pinos dos avistamentos."); })
      .finally(() => { if (active) setLoadingReports(false); });
    return () => { active = false; };
  }, [pet.id, pet.isOwner, token]);
  const urls = locationMapUrls(pet.latitude, pet.longitude);
  const fallback = localitySearchUrl(pet.city, pet.neighborhood);

  return (
    <section className="pet-location-section" aria-labelledby="pet-map-title">
      <div className="pet-location-heading">
        <h2 id="pet-map-title">📍 Localidade da ocorrência</h2>
        <p>{[pet.neighborhood, pet.city].filter(Boolean).join(", ")}</p>
      </div>
      {token && pet.isOwner ? (
        <>
          {loadingReports && <p role="status">Carregando pontos dos avistamentos...</p>}
          {reportsError && <p role="alert" className="form-error">{reportsError}</p>}
          {!loadingReports && !reportsError && <OwnerSightingMap pet={pet} reports={reports} />}
        </>
      ) : urls ? (
        <>
          <div className="pet-map-frame">
            <iframe
              title={`Mapa aproximado da ocorrência: ${pet.neighborhood}, ${pet.city}`}
              src={urls.embedUrl}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <p className="pet-map-hint">O marcador indica uma <strong>região aproximada</strong>, não um endereço exato. A localização deve ser confirmada antes de qualquer deslocamento.</p>
          <a className="pet-map-link" href={urls.fullUrl} target="_blank" rel="noopener noreferrer">
            Abrir mapa ampliado <span aria-hidden="true">↗</span>
          </a>
        </>
      ) : (
        <div className="pet-map-fallback">
          <p>Esta ocorrência não tem coordenadas registradas. Use a cidade e o bairro informados para localizar a região.</p>
          {fallback && (
            <a className="pet-map-link" href={fallback} target="_blank" rel="noopener noreferrer">
              Buscar região no OpenStreetMap <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}
      <p className="pet-map-attribution">Mapa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></p>
    </section>
  );
}
