import { useState } from "react";
import { authenticate, apiError } from "../api/client";

export function AuthDialog({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await authenticate(mode, payload);
      onSuccess(result);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="close-button" onClick={onClose} aria-label="Fechar">×</button>
        <div className="modal-icon" aria-hidden="true">💛</div>
        <h2 id="auth-title">{mode === "login" ? "Que bom ter você aqui!" : "Faça parte dessa rede"}</h2>
        <p className="modal-subtitle">{mode === "login" ? "Entre para publicar e acompanhar ocorrências." : "Juntos, podemos ajudar mais pets a voltar."}</p>
        <form onSubmit={submit} className="stacked-form">
          {mode === "register" && <label>Seu nome<input name="name" minLength={2} maxLength={100} required autoComplete="name" placeholder="Como podemos chamar você?" /></label>}
          <label>E-mail<input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" /></label>
          <label>Senha<input name="password" type="password" minLength={mode === "register" ? 8 : undefined} maxLength={72} required autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Sua senha" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={pending}>{pending ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta"}</button>
        </form>
        <p className="form-switch">{mode === "login" ? "Ainda não tem uma conta?" : "Já participa?"}{" "}
          <button className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Cadastre-se" : "Entrar"}</button>
        </p>
      </section>
    </div>
  );
}
