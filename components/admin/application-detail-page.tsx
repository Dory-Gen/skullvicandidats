"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ApplicationDrawer from "@/components/admin/application-drawer";
import type { AdminApplication, ApplicationAssessment } from "@/components/admin/types";
import type { ApplicationStatus, FormField } from "@/lib/types";

type ApplicationDetailResponse = {
  application: AdminApplication;
  fields: FormField[];
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? "Une erreur est survenue.");
  }
  return result as T;
}

export default function ApplicationDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    requestJson<ApplicationDetailResponse>(`/api/admin/applications/${id}`)
      .then((result) => {
        if (!active) return;
        setApplication(result.application);
        setFields(result.fields);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof Error && reason.message === "Authentification requise.") {
          setUnauthorized(true);
        } else {
          setError(reason instanceof Error ? reason.message : "Impossible de charger la candidature.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function updateApplication(payload: Record<string, unknown>) {
    if (!application) return;
    setBusy(true);
    setError("");
    try {
      await requestJson("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: application.id, ...payload }),
      });
      setApplication((current) => current ? { ...current, ...payload } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La candidature n’a pas pu être mise à jour.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadResume(applicationId: string) {
    setBusy(true);
    setError("");
    try {
      const { url } = await requestJson<{ url: string }>(
        `/api/admin/applications/${applicationId}/resume`,
      );
      window.location.assign(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le CV n’a pas pu être téléchargé.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteApplication(candidate: AdminApplication) {
    if (!window.confirm(`Supprimer définitivement la candidature de ${candidate.fullName} et son CV ?`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/applications/${candidate.id}`, { method: "DELETE" });
      router.push("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La candidature n’a pas pu être supprimée.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="admin-loading"><span className="loading-mark">k.</span><p>Chargement du profil…</p></main>;
  }

  if (unauthorized) {
    return (
      <main className="application-detail-message">
        <h1>Connexion requise</h1>
        <p>Connectez-vous à l’espace recruteur pour consulter les informations de ce candidat.</p>
        <a className="button button-dark" href="/admin">Accéder à l’administration</a>
      </main>
    );
  }

  if (!application) {
    return (
      <main className="application-detail-message">
        <h1>Candidature indisponible</h1>
        <p>{error || "Cette candidature n’existe plus."}</p>
        <a className="button button-dark" href="/admin">Retour aux candidatures</a>
      </main>
    );
  }

  return (
    <>
      {error ? <div className="admin-alert application-detail-alert" role="alert">{error}</div> : null}
      <ApplicationDrawer
        application={application}
        busy={busy}
        fields={fields}
        onChangeStatus={(_candidate, status: ApplicationStatus) => void updateApplication({ status })}
        onSaveAssessment={(_candidate, assessment: ApplicationAssessment) => void updateApplication(assessment)}
        onDelete={deleteApplication}
        onDownloadResume={downloadResume}
      />
    </>
  );
}
