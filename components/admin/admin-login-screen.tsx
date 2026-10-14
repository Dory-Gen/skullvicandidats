"use client";

import Link from "next/link";
import type { FormEvent, Dispatch, SetStateAction } from "react";

type AdminLoginScreenProps = {
  busy: boolean;
  email: string;
  error: string;
  password: string;
  setEmail: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function AdminLoginScreen({
  busy,
  email,
  error,
  password,
  setEmail,
  setPassword,
  onSubmit,
}: AdminLoginScreenProps) {
  return (
    <main className="login-screen">
      <Link className="brand login-brand" href="/">
        <span className="brand-light">skullvi</span>
      </Link>
      <div className="login-illustration">
        <span className="login-illustration-spark">✳</span>
        <p>LES BONNES RENCONTRES<br />COMMENCENT EN COULISSES.</p>
        <span className="login-illustration-star">✳</span>
      </div>
      <section className="login-card">
        <p className="eyebrow">ESPACE RECRUTEUR</p>
        <h1>Heureux de vous revoir.</h1>
        <p className="login-subtitle">Connectez-vous pour retrouver vos candidatures et vos offres.</p>
        <form onSubmit={onSubmit} className="login-form">
          <label className="form-field">
            <span>Adresse e-mail</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Mot de passe</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-dark form-submit" type="submit" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"} <span aria-hidden="true">↗</span>
          </button>
        </form>
        <Link className="login-back-link" href="/">← Retour au site</Link>
      </section>
    </main>
  );
}
