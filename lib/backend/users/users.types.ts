export interface UserSummary {
  id: number
  idUser: number
  name: string
  email: string
  role: number
  limite: number
  gerado: number
  limit_page_upload: number
  foto: string | null
  createdAt: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: number
}

export interface UserLimits {
  id: number
  limite: number
  gerado: number
  limit_page_upload: number
}

export type CreateUserResult =
  | { ok: true; id: number }
  | { ok: false; error: 'email-conflict' }
