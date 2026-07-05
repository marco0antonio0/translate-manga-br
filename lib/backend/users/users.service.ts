import bcrypt from 'bcryptjs'
import type { UsersRepository } from './users.repository'
import type { CreateUserInput, CreateUserResult, UserLimits } from './users.types'

export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  listUsers() {
    return this.repository.listUsers()
  }

  createUser(input: CreateUserInput): CreateUserResult {
    if (this.repository.emailExists(input.email)) {
      return { ok: false, error: 'email-conflict' }
    }

    const passwordHash = bcrypt.hashSync(input.password, 10)
    const id = this.repository.insertUser(input.name, input.email, passwordHash, input.role)
    return { ok: true, id }
  }

  /** Retorna os limites atualizados, ou null se o usuário não existe. */
  updatePassword(userId: number, newPassword: string): boolean {
    const existing = this.repository.findLimitsById(userId)
    if (!existing) return false

    this.repository.updatePasswordHash(userId, bcrypt.hashSync(newPassword, 10))
    return true
  }

  updateLimit(userId: number, limite: number): UserLimits | null {
    const existing = this.repository.findLimitsById(userId)
    if (!existing) return null

    this.repository.updateLimit(userId, limite)
    return { ...existing, limite }
  }

  resetUsage(userId: number): UserLimits | null {
    const existing = this.repository.findLimitsById(userId)
    if (!existing) return null

    this.repository.resetUsage(userId)
    return { ...existing, gerado: 0 }
  }

  updatePageUploadLimit(userId: number, limitPageUpload: number): UserLimits | null {
    const existing = this.repository.findLimitsById(userId)
    if (!existing) return null

    this.repository.updatePageUploadLimit(userId, limitPageUpload)
    return { ...existing, limit_page_upload: limitPageUpload }
  }
}
