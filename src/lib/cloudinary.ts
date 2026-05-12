// Unsigned Cloudinary uploads. The cloud name + unsigned preset are public
// env vars (VITE_*), so anyone with them can upload; for v1 that's fine
// because uploads are gated behind a logged-in coach session. Move to
// signed uploads (backend issues a signature) when production-ready.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
    | string
    | undefined
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
    | string
    | undefined

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]

export function isCloudinaryConfigured(): boolean {
    return !!(CLOUD_NAME && UPLOAD_PRESET)
}

export type UploadResult = {
    /** https:// URL — what we send to the backend / model. */
    secureUrl: string
    /** Cloudinary internal id, for future deletion / management. */
    publicId: string
    width: number
    height: number
    bytes: number
}

export async function uploadImage(file: File): Promise<UploadResult> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error(
            "Cloudinary not configured — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET",
        )
    }

    if (file.size > MAX_BYTES) {
        throw new Error("Image is too large (max 10 MB)")
    }
    // Some iOS file pickers don't fill `type`; be lenient.
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
        throw new Error("Please pick a JPEG, PNG, or WebP image")
    }

    const form = new FormData()
    form.append("file", file)
    form.append("upload_preset", UPLOAD_PRESET)

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: form },
    )

    if (!res.ok) {
        let detail = ""
        try {
            const body = await res.json()
            detail =
                (typeof body?.error === "object"
                    ? body.error?.message
                    : body?.error) || ""
        } catch {
            /* ignore */
        }
        throw new Error(
            detail || `Cloudinary upload failed (${res.status})`,
        )
    }

    const data = await res.json()
    return {
        secureUrl: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
    }
}
