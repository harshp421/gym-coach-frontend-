import { useCallback, useRef, useState } from "react"
import { ApiError } from "../lib/api"

export type QueryState<T> = {
    data: T | null
    error: ApiError | null
    loading: boolean
}

export type UseQueryReturn<TArgs extends unknown[], TResult> = {
    state: QueryState<TResult>
    call: (...args: TArgs) => Promise<TResult>
    reset: () => void
}

const initial = <T,>(): QueryState<T> => ({
    data: null,
    error: null,
    loading: false,
})

/**
 * Wraps an async API call and exposes its state plus a trigger.
 *
 *   const { state, call } = useQuery(authApi.login)
 *   await call({ email, password })
 *   state.loading | state.error | state.data
 */
export function useQuery<TArgs extends unknown[], TResult>(
    apiFn: (...args: TArgs) => Promise<TResult>,
): UseQueryReturn<TArgs, TResult> {
    const [state, setState] = useState<QueryState<TResult>>(initial<TResult>())
    const reqId = useRef(0)

    const call = useCallback(
        async (...args: TArgs): Promise<TResult> => {
            const id = ++reqId.current
            setState({ data: null, error: null, loading: true })
            try {
                const data = await apiFn(...args)
                if (id === reqId.current) {
                    setState({ data, error: null, loading: false })
                }
                return data
            } catch (err) {
                const error =
                    err instanceof ApiError
                        ? err
                        : new ApiError(
                              -1,
                              err instanceof Error ? err.message : "Unknown error",
                          )
                if (id === reqId.current) {
                    setState({ data: null, error, loading: false })
                }
                throw error
            }
        },
        [apiFn],
    )

    const reset = useCallback(() => {
        reqId.current++
        setState(initial<TResult>())
    }, [])

    return { state, call, reset }
}
