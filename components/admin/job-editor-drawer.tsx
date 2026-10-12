"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { FormField, JobStatus } from "@/lib/types";
import type { JobDraft } from "@/components/admin/types";

export default function JobEditorDrawer({
  busy,
  draft,
  editingJobId,
  error,
  onAddField,
  onClose,
  onRemoveField,
  onSave,
  onUpdateField,
  setDraft,
}: {
  busy: boolean;
  draft: JobDraft;
  editingJobId: string | null;
  error: string;
  onAddField: () => void;
  onClose: () => void;
  onRemoveField: (index: number) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: (index: number, patch: Partial<FormField>) => void;
  setDraft: Dispatch<SetStateAction<JobDraft>>;
}) {
  return (
    <div className="drawer-backdrop editor-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="job-editor" aria-label={editingJobId ? "Modifier une offre" : "Créer une offre"}>
        <div className="drawer-header">
          <div>
            <span className="eyebrow">{editingJobId ? "VOTRE RECRUTEMENT" : "NOUVELLE OPPORTUNITÉ"}</span>
            <h2>{editingJobId ? "Modifier l’offre" : "Créer une offre"}</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <form className="editor-form" onSubmit={onSave}>
          <div className="editor-section-title"><span>01</span><h3>L’annonce</h3></div>
          <label className="form-field">
            <span>Intitulé du poste *</span>
            <input required maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex. Product designer" />
          </label>
          <div className="editor-two-column">
            <label className="form-field">
              <span>Équipe / département *</span>
              <input required maxLength={80} value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} placeholder="Ex. Produit" />
            </label>
            <label className="form-field">
              <span>Localisation *</span>
              <input required maxLength={100} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Ex. Paris" />
            </label>
          </div>
          <div className="editor-two-column">
            <label className="form-field">
              <span>Type de contrat *</span>
              <input required maxLength={80} value={draft.contractType} onChange={(event) => setDraft({ ...draft, contractType: event.target.value })} placeholder="Ex. CDI" />
            </label>
            <label className="form-field">
              <span>Mode de travail *</span>
              <input required maxLength={60} value={draft.workMode} onChange={(event) => setDraft({ ...draft, workMode: event.target.value })} placeholder="Ex. Hybride" />
            </label>
          </div>
          <label className="form-field">
            <span>En quelques mots *</span>
            <input required maxLength={240} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="La phrase qui donne envie de nous rejoindre." />
          </label>
          <label className="form-field">
            <span>Description du poste *</span>
            <textarea required maxLength={15000} rows={8} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Missions, profil recherché, avantages…" />
          </label>
          <div className="editor-two-column">
            <label className="form-field">
              <span>Statut *</span>
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as JobStatus })}>
                <option value="draft">Brouillon</option>
                <option value="published">Publier l’offre</option>
                <option value="closed">Clôturée</option>
              </select>
            </label>
            <label className="form-field">
              <span>Date de clôture</span>
              <input type="date" value={draft.closingAt} onChange={(event) => setDraft({ ...draft, closingAt: event.target.value })} />
            </label>
          </div>
          <div className="editor-section-title editor-form-section">
            <span>02</span>
            <div><h3>Le formulaire de candidature</h3><p>Les coordonnées et le CV sont toujours demandés.</p></div>
          </div>
          <div className="field-builder">
            {draft.fields.map((field, index) => {
              const fixed = ["full_name", "email", "phone"].includes(field.id);
              return (
                <div className="field-builder-card" key={`${field.id}-${index}`}>
                  <div className="field-builder-heading">
                    <span>QUESTION {String(index + 1).padStart(2, "0")}</span>
                    {fixed ? <span className="fixed-question">OBLIGATOIRE</span> : (
                      <button type="button" onClick={() => onRemoveField(index)} aria-label={`Supprimer ${field.label}`}>×</button>
                    )}
                  </div>
                  <label className="form-field">
                    <span>Intitulé</span>
                    <input required maxLength={100} value={field.label} disabled={fixed} onChange={(event) => onUpdateField(index, { label: event.target.value })} />
                  </label>
                  <div className="field-builder-options">
                    <label className="form-field">
                      <span>Type de réponse</span>
                      <select
                        disabled={fixed}
                        value={field.type}
                        onChange={(event) => onUpdateField(index, {
                          type: event.target.value as FormField["type"],
                          options: event.target.value === "select" ? ["Option 1", "Option 2"] : undefined,
                        })}
                      >
                        <option value="text">Réponse courte</option>
                        <option value="textarea">Réponse longue</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Téléphone</option>
                        <option value="select">Choix dans une liste</option>
                      </select>
                    </label>
                    <label className="required-toggle">
                      <input type="checkbox" checked={field.required} disabled={fixed} onChange={(event) => onUpdateField(index, { required: event.target.checked })} />
                      Réponse obligatoire
                    </label>
                  </div>
                  {field.type === "select" ? (
                    <label className="form-field">
                      <span>Choix (séparés par des virgules)</span>
                      <input
                        value={(field.options ?? []).join(", ")}
                        onChange={(event) => onUpdateField(index, {
                          options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean).slice(0, 20),
                        })}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
            <button type="button" className="add-question-button" disabled={draft.fields.length >= 20} onClick={onAddField}>
              ＋ Ajouter une question
            </button>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="editor-footer">
            <button type="button" className="button button-quiet" onClick={onClose}>Annuler</button>
            <button className="button button-dark" type="submit" disabled={busy}>
              {busy ? "Enregistrement…" : editingJobId ? "Enregistrer les changements" : "Créer l’offre"} <span>↗</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
