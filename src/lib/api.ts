import axios from "axios"
import type { AxiosRequestConfig, Method } from "axios"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"

export class ApiError extends Error {
    statusCode: number
    requestId?: string
    userMessage?: string
    /** Full parsed response body for non-2xx responses. Lets callers read
     *  structured fields (e.g. `sessionId` on a `session_in_progress` 409)
     *  without reparsing. */
    data?: unknown

    constructor(
        statusCode: number,
        message: string,
        requestId?: string,
        userMessage?: string,
        data?: unknown,
    ) {
        super(message)
        this.name = "ApiError"
        this.statusCode = statusCode
        this.requestId = requestId
        this.userMessage = userMessage
        this.data = data
    }

    toString() {
        const id = this.requestId ? ` (req: ${this.requestId})` : ""
        return `ApiError ${this.statusCode}: ${this.userMessage || this.message}${id}`
    }
}

export type RequestOptions = {
    params?: Record<string, string | number | boolean>
    query?: Record<string, string | number | boolean | undefined>
    body?: unknown
    headers?: Record<string, string>
    signal?: AbortSignal
}

let onUnauthorized: (() => void) | null = null

export function configureApi(opts: { onUnauthorized?: () => void }) {
    if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized
}

export async function request<T = unknown>(
    method: Method,
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const { params = {}, query = {}, body, headers = {}, signal } = options

    let url = BASE_URL + path
    url = url.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = params[key]
        if (value === undefined) {
            throw new Error(`Missing path param "${key}" for ${path}`)
        }
        delete params[key]
        return encodeURIComponent(String(value))
    })

    const cleanQuery = Object.fromEntries(
        Object.entries(query).filter(([, v]) => v !== undefined),
    ) as Record<string, string>
    const qs = new URLSearchParams(cleanQuery).toString()
    if (qs) url += `?${qs}`

    const finalHeaders: Record<string, string> = {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
    }

    const config: AxiosRequestConfig = {
        method,
        url,
        headers: finalHeaders,
        data: body,
        signal,
        withCredentials: true,
        validateStatus: () => true,
    }

    let response
    try {
        response = await axios.request(config)
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        throw new ApiError(-1, "Network error", undefined, message)
    }

    if (response.status >= 200 && response.status < 300) {
        return response.data as T
    }

    if (response.status === 401 && onUnauthorized) onUnauthorized()

    const data = response.data
    const userMessage =
        (data && typeof data === "object" && (data.error || data.message || data.detail)) ||
        (typeof data === "string" ? data : undefined) ||
        response.statusText ||
        "Request failed"
    const requestId =
        (response.headers?.["x-request-id"] as string | undefined) ?? undefined

    throw new ApiError(
        response.status,
        response.statusText || "Request failed",
        requestId,
        userMessage,
        data,
    )
}

export const api = {
    get: <T = unknown>(path: string, options?: RequestOptions) =>
        request<T>("get", path, options),
    post: <T = unknown>(path: string, options?: RequestOptions) =>
        request<T>("post", path, options),
    put: <T = unknown>(path: string, options?: RequestOptions) =>
        request<T>("put", path, options),
    patch: <T = unknown>(path: string, options?: RequestOptions) =>
        request<T>("patch", path, options),
    delete: <T = unknown>(path: string, options?: RequestOptions) =>
        request<T>("delete", path, options),
}
