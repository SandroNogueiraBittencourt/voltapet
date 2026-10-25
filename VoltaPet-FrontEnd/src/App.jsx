import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiError, getPet, listPets, reunitePet } from "./api/client";
import { AuthDialog } from "./components/AuthDialog";
import { PetCard, statusLabels, petTypeLabel } from "./components/PetCard";
import { PublishDialog } from "./components/PublishDialog";
import { PetLocationMap } from "./components/PetLocationMap";
import { PetPhotoGallery } from "./components/PetPhotoGallery";
import { SightingDialog } from "./components/SightingDialog";
import { SightingReports } from "./components/SightingReports";
import { canReportSighting } from "./utils/sightingAccess";
import "./components/PetDetailsLayout.css";
import "./components/PetPhotoInput.css";
import "./components/PetPhotoGallery.css";

function Header({ session, openAuth, logout, openPublish }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link to="/" className="brand-link" aria-label="VoltaPet — página inicial">
          <img src="/voltapet-logo.svg" alt="VoltaPet: o caminho de volta para casa" />
        </Link>
        <nav className="header-nav" aria-label="Navegação principal">
          <Link className="nav-link" to="/#ocorrencias">Ver ocorrências</Link>
          <Link className="nav-link nav-help" to="/#como-funciona">Como funciona</Link>
          {session ? <span className="user-greeting">Olá, {session.user.name.split(" ")[0]}!</span> : null}
          {session ? <button className="nav-link nav-button" onClick={logout}>Sair</button> : <button className="nav-link nav-button" onClick={openAuth}>Entrar</button>}
          <button className="btn btn-header" onClick={() => openPublish("LOST")}>Publicar ocorrência <span aria-hidden="true">↗</span></button>
        </nav>
      </div>
    </header>
  );
}

function Hero({ openPublish }) {
  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> Uma comunidade que cuida</div>
          <h1>Todo reencontro começa com <em>alguém que se importa.</em></h1>
          <p>Uma rede de pessoas conectadas para ajudar animais perdidos a encontrarem o caminho de volta para casa.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => openPublish("LOST")}>🐾 Perdi meu pet <span aria-hidden="true">→</span></button>
            <button className="btn btn-outline" onClick={() => openPublish("FOUND")}>💛 Encontrei um pet</button>
          </div>
          <div className="hero-footnote"><span aria-hidden="true">✦</span> Gratuito e feito para conectar pessoas que querem ajudar.</div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-sun" />
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-companion">🐕</div>
          <div className="hero-home">⌂</div>
          <div className="hero-path path-one">· · · · · · · ·</div>
          <div className="hero-icon-paw">🐾</div>
          <div className="floating-card"><span className="floating-heart">♥</span><span>Um pequeno gesto.<br /><strong>Uma grande chance.</strong></span></div>
          <div className="decor-sparkle sparkle-one">✦</div>
          <div className="decor-sparkle sparkle-two">✳</div>
        </div>
      </div>
    </section>
  );
}

function PetListing() {
  const [status, setStatus] = useState("");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["pets", status, query],
    queryFn: () => listPets({ status, query }),
  });
  return (
    <section className="list-section" id="ocorrencias">
      <div className="shell">
        <div className="section-heading"><div><span className="section-kicker">A REDE ESTÁ EM MOVIMENTO</span><h2>Pets que precisam de <span>um olhar atento.</span></h2><p>Talvez uma dessas histórias esteja perto de você.</p></div><span className="heading-decoration" aria-hidden="true">✳</span></div>
        <div className="filter-panel">
          <div className="filter-tabs" aria-label="Filtrar ocorrências">
            {[{ value: "", label: "Todos" }, { value: "LOST", label: "Desaparecidos" }, { value: "FOUND", label: "Encontrados" }, { value: "REUNITED", label: "Reencontrados" }].map(item => <button key={item.value} className={`filter-tab ${status === item.value ? "active" : ""}`} onClick={() => setStatus(item.value)} aria-pressed={status === item.value}>{item.label}</button>)}
          </div>
          <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar por nome, cidade ou bairro</span><input value={input} onChange={e => setInput(e.target.value)} placeholder="Buscar por pet, bairro ou cidade..." maxLength={100} /></label>
        </div>
        {isPending ? <p className="data-state" role="status">Buscando histórias perto de você...</p> : isError ? <div className="data-state" role="alert"><p>{apiError(error)}</p><button className="btn btn-outline" onClick={() => refetch()}>Tentar novamente</button></div> : data?.content?.length ? <><div className="pet-grid">{data.content.map(pet => <PetCard key={pet.id} pet={pet} />)}</div>{data.totalElements > data.content.length ? <p className="result-note">Mostrando as primeiras {data.content.length} de {data.totalElements} ocorrências. Refine sua busca para localizar outras.</p> : null}</> : <div className="empty-state"><span className="empty-emoji" aria-hidden="true">🐾</span><h3>Nenhuma ocorrência encontrada</h3><p>Tente outra busca ou seja a primeira pessoa a compartilhar uma informação nesta região.</p></div>}
      </div>
    </section>
  );
}

function HowItWorks() {
  return <section className="how-section" id="como-funciona"><div className="shell"><div className="section-heading centered"><span className="section-kicker">SIMPLES ASSIM</span><h2>Quando a comunidade se une, <span>a esperança encontra um caminho.</span></h2></div><div className="steps-grid"><div className="step-card"><span className="step-num">01</span><div className="step-icon">📍</div><h3>Compartilhe</h3><p>Conte sobre o pet desaparecido ou encontrado e onde foi visto.</p></div><div className="step-card"><span className="step-num">02</span><div className="step-icon">👀</div><h3>Conecte as pistas</h3><p>Veja ocorrências na comunidade e identifique informações importantes.</p></div><div className="step-card"><span className="step-num">03</span><div className="step-icon">💛</div><h3>Aproxime o reencontro</h3><p>Ajude a reunir as informações que podem levar o pet de volta.</p></div></div></div></section>;
}

function Home({ openPublish }) {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const section = document.getElementById(hash.substring(1));
      section?.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);
  return <><Hero openPublish={openPublish} /><PetListing /><HowItWorks /><section className="cta-section"><div className="shell cta-inner"><div><span className="section-kicker">UMA COMUNIDADE INTEIRA FAZ A DIFERENÇA</span><h2>Você pode ser parte de um reencontro.</h2><p>Compartilhe uma ocorrência e ajude a ampliar essa rede de cuidado.</p></div><button className="btn btn-cream" onClick={() => openPublish("LOST")}>Quero ajudar agora →</button></div></section></>;
}

function PetDetails({ session, openAuth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: pet, isPending, isError } = useQuery({
    queryKey: ["pet", id, session?.token ?? null],
    queryFn: () => getPet(id, session?.token),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sightingOpen, setSightingOpen] = useState(false);
  const [wantsSighting, setWantsSighting] = useState(false);
  const [sent, setSent] = useState(false);
  const [showReports, setShowReports] = useState(false);

  // Depois do login, confirmar na API se a pessoa é autora.
  useEffect(() => {
    if (!session || !wantsSighting || isPending) return;
    setWantsSighting(false);
    if (canReportSighting(pet)) setSightingOpen(true);
  }, [session, wantsSighting, isPending, pet]);

  // Evita abrir o formulário para o autor, inclusive se a sessão mudou.
  useEffect(() => {
    if (!canReportSighting(pet)) setSightingOpen(false);
  }, [pet?.id, pet?.isOwner, pet?.status]);

  function seen() {
    if (!canReportSighting(pet)) return;
    if (!session) { setWantsSighting(true); openAuth(); return; }
    setSightingOpen(true);
  }

  async function reunited() {
    if (!session || !pet.isOwner) return;
    setBusy(true);
    setError("");
    try {
      await reunitePet(id, session.token);
      await queryClient.invalidateQueries({ queryKey: ["pet", id] });
      await queryClient.invalidateQueries({ queryKey: ["pets"] });
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  }

  if (isPending) return <main className="shell details-page"><p>Carregando ocorrência...</p></main>;
  if (isError) return <main className="shell details-page"><h1>Ocorrência não encontrada</h1><Link to="/" className="btn btn-outline">Voltar ao início</Link></main>;
  return <main className="shell details-page pet-details-page">
    <button className="back-button" onClick={() => navigate(-1)}>← Voltar</button>
    <div className="pet-details-overview">
      <PetPhotoGallery key={pet.id} pet={pet} />
      <article className="details-content pet-details-summary">
        <span className={`status-pill status-${pet.status.toLowerCase()}`}>{statusLabels[pet.status]}</span>
        <h1>{pet.name}</h1>
        <p className="details-species">{petTypeLabel(pet)}</p>
        <p className="details-location">📍 {pet.neighborhood}, {pet.city}</p>
        <h2>Sobre essa ocorrência</h2>
        <p className="details-description">{pet.description}</p>
        <p className="details-date">Publicado em {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(pet.createdAt))}</p>
        <div className="details-actions">
          {canReportSighting(pet) && <button type="button" className="btn btn-primary" onClick={seen}>👀 Visto</button>}
          {pet.isOwner && pet.status !== "REUNITED" && <button type="button" className="btn btn-outline sighting-secondary-action" disabled={busy} onClick={reunited}>{busy ? "Atualizando..." : "Marcar como reencontrado"}</button>}
          {pet.isOwner && <button type="button" className="btn btn-outline sighting-secondary-action" onClick={() => setShowReports(value => !value)}>{showReports ? "Ocultar avistamentos" : "Ver avistamentos recebidos"}</button>}
        </div>
        {canReportSighting(pet) && <p className="privacy-note">Viu este pet? Clique em <strong>Visto</strong> para registrar o endereço, data e horário. Os detalhes serão enviados em segurança ao autor da ocorrência.</p>}
        {sent && <p className="sighting-success" role="status">Avistamento enviado! Obrigado por ajudar.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </article>
    </div>
    <div className="pet-details-map-panel"><PetLocationMap pet={pet} /></div>
    {pet.isOwner && showReports && session && <SightingReports petId={pet.id} token={session.token} />}
    {sightingOpen && session && canReportSighting(pet) && <SightingDialog pet={pet} session={session} onClose={() => setSightingOpen(false)} onReported={() => { setSightingOpen(false); setSent(true); }} />}
  </main>;
}

function Footer() { return <footer className="site-footer"><div className="shell footer-inner"><div><strong>🐾 VoltaPet</strong><p>O caminho de volta para casa.</p></div><span>Feito com cuidado, para quem faz a diferença. 💛</span></div></footer>; }

export default function App() {
  const [session, setSession] = useState(null); // Token somente em memória: não persiste após atualizar a página.
  const [authOpen, setAuthOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);
  const [pendingPublish, setPendingPublish] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  function openPublish(status) {
    if (!session) { setPendingPublish(status); setAuthOpen(true); return; }
    setPublishStatus(status);
  }
  function onAuth(result) {
    setSession(result);
    setAuthOpen(false);
    if (pendingPublish) { setPublishStatus(pendingPublish); setPendingPublish(null); }
  }
  function logout() { setSession(null); setPublishStatus(null); }
  async function onPublished(pet) {
    setPublishStatus(null);
    await queryClient.invalidateQueries({ queryKey: ["pets"] });
    navigate(`/pets/${pet.id}`);
  }
  return <><Header session={session} openAuth={() => setAuthOpen(true)} logout={logout} openPublish={openPublish} /><Routes><Route path="/" element={<Home openPublish={openPublish} />} /><Route path="/pets/:id" element={<PetDetails session={session} openAuth={() => setAuthOpen(true)} />} /><Route path="*" element={<main className="shell details-page"><h1>Página não encontrada</h1><Link to="/" className="btn btn-primary">Voltar ao início</Link></main>} /></Routes><Footer />{authOpen && <AuthDialog onClose={() => { setAuthOpen(false); setPendingPublish(null); }} onSuccess={onAuth} />}{publishStatus && session && <PublishDialog defaultStatus={publishStatus} session={session} onClose={() => setPublishStatus(null)} onPublished={onPublished} />}</>;
}
