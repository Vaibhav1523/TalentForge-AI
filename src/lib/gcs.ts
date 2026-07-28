import type { Bucket } from "@google-cloud/storage";
import { Storage } from "@google-cloud/storage";

let storageSingleton: Storage | null = null;

/**
 * Shared GCS client.
 * - If `GCS_SERVICE_ACCOUNT_JSON` is set: uses that key (local / legacy cross-project).
 * - Otherwise: Application Default Credentials (Cloud Run default compute SA).
 *   Grant that SA `roles/storage.objectAdmin` on each bucket (`scripts/grant-cloud-run-bucket-access.sh`).
 */
export function getGcsStorage(): Storage {
    if (storageSingleton) return storageSingleton;
    const raw = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
    if (raw) {
        const credentials = JSON.parse(raw) as Record<string, unknown>;
        storageSingleton = new Storage({ credentials });
    } else {
        storageSingleton = new Storage();
    }
    return storageSingleton;
}

function requireEnv(name: "GCS_BUCKET_RESUMES" | "GCS_BUCKET_IMAGES" | "GCS_BUCKET_TEAM_PHOTOS"): string {
    const v = process.env[name]?.trim();
    if (!v) throw new Error(`${name} is not set`);
    return v;
}

export function getResumesBucket(): Bucket {
    return getGcsStorage().bucket(requireEnv("GCS_BUCKET_RESUMES"));
}

export function getImagesBucket(): Bucket {
    return getGcsStorage().bucket(requireEnv("GCS_BUCKET_IMAGES"));
}

export function getTeamPhotosBucket(): Bucket {
    return getGcsStorage().bucket(requireEnv("GCS_BUCKET_TEAM_PHOTOS"));
}

/** Legacy full HTTPS URL for resume objects (used for DB matching / migrations). */
export function getPublicResumeUrl(objectName: string): string {
    const bucket = requireEnv("GCS_BUCKET_RESUMES");
    const path = objectName
        .split("/")
        .map((s) => encodeURIComponent(s))
        .join("/");
    return `https://storage.googleapis.com/${encodeURIComponent(bucket)}/${path}`;
}

/** App-relative URL served by `/api/images/[...path]` (logos, profile-images). */
export function getPublicImageUrl(objectName: string): string {
    return `/api/images/${objectName}`;
}

/** App-relative URL for team bucket objects (served via `team/` prefix in images route). */
export function getPublicTeamPhotoUrl(objectName: string): string {
    return `/api/images/team/${objectName}`;
}

function decodeGcsPath(path: string): string {
    return path
        .split("/")
        .map((seg) => {
            try {
                return decodeURIComponent(seg);
            } catch {
                return seg;
            }
        })
        .join("/");
}

/**
 * Normalise a stored resume reference to the object path inside `GCS_BUCKET_RESUMES`.
 * Accepts bare `resumes/...`, `gs://bucket/...`, or `https://storage.googleapis.com/bucket/...`.
 */
export function parseResumeObjectNameFromUrl(raw: string): string | null {
    const bucket = process.env.GCS_BUCKET_RESUMES?.trim();
    if (!bucket) return null;
    const t = raw.trim();
    if (!t) return null;

    // Legacy bug: bare `resumes/...` was prefixed with `https://`, yielding `https://resumes/...`.
    if (/^https?:\/\/resumes\//i.test(t)) {
        return t.replace(/^https?:\/\//i, "");
    }

    if (!/^https?:/i.test(t) && !t.startsWith("gs://") && t.startsWith("resumes/")) {
        return t;
    }

    const esc = bucket.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const gs = t.match(new RegExp(`^gs://${esc}/(.+)$`));
    if (gs?.[1]) return decodeGcsPath(gs[1]);

    const api = t.match(
        new RegExp(`^https?://storage\\.googleapis\\.com/${esc}/(.+?)(?:\\?|#|$)`, "i")
    );
    if (api?.[1]) return decodeGcsPath(api[1]);

    const alt = t.match(
        new RegExp(`^https?://storage\\.cloud\\.google\\.com/${esc}/(.+?)(?:\\?|#|$)`, "i")
    );
    if (alt?.[1]) return decodeGcsPath(alt[1]);

    return null;
}
