import { api } from "../api"
import type { UserExercise, UserExerciseInput } from "../../schemas/user-exercise"

export type ListUserExercisesResponse = { items: UserExercise[] }
export type UserExerciseResponse = { exercise: UserExercise }

export const userExercisesApi = {
    list: (query: { includeArchived?: boolean } = {}) =>
        api.get<ListUserExercisesResponse>("/user-exercises", {
            query: { includeArchived: query.includeArchived ? "1" : undefined },
        }),

    create: (body: UserExerciseInput) =>
        api.post<UserExerciseResponse>("/user-exercises", { body }),

    update: (id: string, body: Partial<UserExerciseInput>) =>
        api.patch<UserExerciseResponse>("/user-exercises/{id}", {
            params: { id },
            body,
        }),

    archive: (id: string) =>
        api.post<UserExerciseResponse>("/user-exercises/{id}/archive", {
            params: { id },
        }),

    restore: (id: string) =>
        api.post<UserExerciseResponse>("/user-exercises/{id}/restore", {
            params: { id },
        }),
}
