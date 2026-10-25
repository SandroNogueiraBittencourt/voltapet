import { useEffect, useState } from "react";
import { apiError, getSightingMedia, listSightings } from "../api/client";
import "./Sighting.css";

function SightingAttachment({ petId, sightingId, file, token }) {
  const [source, setSource] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = null;
    getSightingMedia(petId, sightingId, file.slot, token)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSource(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [petId, sightingId, file.slot, token]);
  if (error) return <span className="sighting-media-error">Anexo indisponível</span>;
  if (!source) return <span className="sighting-media-loading">Carregando anexo...</span>;
  return file.mimeType.startsWith("video/") ? <video controls preload="metadata" src={source} aria-label="Vídeo do avistamento" />
    : <a href={source} target="_blank" rel="noopener noreferrer" aria-label="Abrir foto do avistamento"><img src={source} alt="Foto do avistamento" /></a>;
}

function SightingMediaGroup({ report, petId, token }) {
  const [visible, setVisible] = useState(false);
  if (!report.attachments?.length) return null;
  return <div className="sighting-media-group">
    <button type="button" className="btn btn-outline" onClick={() => setVisible(!visible)}>
      {visible ? "Ocultar anexos" : `Visualizar ${report.attachments.length} anexo(s)`}
    </button>
    {visible && <div className="sighting-media-list">{report.attachments.map((file) =>
      <SightingAttachment key={file.slot} petId={petId} sightingId={report.id} file={file} token={token} />)}</div>}
  </div>;
}

export function SightingReports({ petId, token }) {
  const [reports, setReports] = useState([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    listSightings(petId, token)
      .then((data) => { if (active) setReports(data); })
      .catch((err) => { if (active) setError(apiError(err)); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [petId, token]);
  return <section className="sighting-reports" aria-label="Avistamentos recebidos">
    <h2>Avistamentos recebidos</h2>
    <p className="sighting-owner-note">Estas informações são privadas e aparecem apenas para quem publicou a ocorrência.</p>
    {pending && <p role="status">Carregando avistamentos...</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {!pending && !error && reports.length === 0 && <p>Nenhum avistamento informado ainda.</p>}
    {reports.map((report) => <article className="sighting-report-card" key={report.id}>
      <strong>👀 Visto em {new Date(report.seenAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</strong>
      <p>{report.street}, {report.houseNumber} · CEP {report.postalCode}</p>
      {(report.neighborhood || report.city) && <p>📍 {[report.neighborhood, report.city].filter(Boolean).join(", ")}</p>}
      {report.addressDetails && <p>Referência: {report.addressDetails}</p>}
      {report.description && <p>{report.description}</p>}
      <SightingMediaGroup petId={petId} report={report} token={token} />
    </article>)}
  </section>;
}
