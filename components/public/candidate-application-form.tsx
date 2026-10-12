"use client";

import { useState, type FormEvent } from "react";
import type {
  FormField,
} from "@/lib/types";

export default function CandidateApplicationForm({
  slug,
  fields,
}: {
  slug: string;
  fields: FormField[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Ajoutez votre CV au format PDF pour continuer.");
      return;
    }
    if (file.size > 8 * 1024 * 1024 || file.type !== "application/pdf") {
      setError("Votre CV doit être un fichier PDF de 8 Mo maximum.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.set("jobSlug", slug);
      body.set("answers", JSON.stringify(answers));
      body.set("resume", file);
      const response = await fetch("/api/public/applications", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Votre candidature n’a pas pu être envoyée.");
        return;
      }
      setSent(true);
    } catch {
      setError("La connexion a échoué. Vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="application-success" role="status">
        <span>✓</span>
        <h3>Votre candidature est bien arrivée.</h3>
        <p>Merci pour votre confiance. Notre équipe revient vers vous au plus vite.</p>
      </div>
    );
  }

  return (
    <form className="application-form" onSubmit={submit}>
      {fields.map((field) => (
        <label className="form-field" key={field.id}>
          <span>{field.label}{field.required ? <span className="required-mark"> *</span> : null}</span>
          {field.type === "textarea" ? (
            <textarea
              required={field.required}
              maxLength={4000}
              rows={4}
              value={answers[field.id] ?? ""}
              onChange={(event) => setAnswers({ ...answers, [field.id]: event.target.value })}
            />
          ) : field.type === "select" ? (
            <select
              required={field.required}
              value={answers[field.id] ?? ""}
              onChange={(event) => setAnswers({ ...answers, [field.id]: event.target.value })}
            >
              <option value="">Choisir une option</option>
              {(field.options ?? []).map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : (
            <input
              type={field.type === "phone" ? "tel" : field.type}
              autoComplete={field.id === "email" ? "email" : field.id === "full_name" ? "name" : undefined}
              required={field.required}
              maxLength={4000}
              value={answers[field.id] ?? ""}
              onChange={(event) => setAnswers({ ...answers, [field.id]: event.target.value })}
            />
          )}
        </label>
      ))}
      <label className="form-field resume-field">
        <span>Votre CV <span className="required-mark">*</span></span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <small>PDF uniquement · 8 Mo maximum · fichier privé</small>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-dark form-submit" type="submit" disabled={submitting}>
        {submitting ? "Envoi en cours…" : "Envoyer ma candidature"} <span aria-hidden="true">↗</span>
      </button>
      <p className="privacy-note">Vos informations restent confidentielles et ne sont utilisées que pour le suivi de votre candidature.</p>
    </form>
  );
}
