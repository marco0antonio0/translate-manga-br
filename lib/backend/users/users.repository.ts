import { db } from '@/lib/backend/shared/database.module'
import type { UserSummary } from './users.types'

interface UserLimitsRow {
  id?: number
  limite?: number
  gerado?: number
  limit_page_upload?: number
}

export class UsersRepository {
  listUsers(): UserSummary[] {
    const rows = db.prepare(`
      SELECT id, name, email, role, limite, gerado, limit_page_upload, foto, created_at
      FROM users
      ORDER BY id ASC
    `).all() as Array<{
      id: number
      name: string
      email: string
      role: number
      limite: number
      gerado: number
      limit_page_upload: number
      foto: string | null
      created_at: string
    }>

    return rows.map((row) => ({
      id: Number(row.id),
      idUser: Number(row.id),
      name: String(row.name ?? ''),
      email: String(row.email ?? ''),
      role: Number(row.role ?? 0),
      limite: Number(row.limite ?? 0),
      gerado: Number(row.gerado ?? 0),
      limit_page_upload: Number(row.limit_page_upload ?? 0),
      foto: row.foto ? String(row.foto) : null,
      createdAt: String(row.created_at ?? ''),
    }))
  }

  emailExists(email: string) {
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
      .get(email) as { id?: number } | undefined
    return Boolean(existing?.id)
  }

  findLimitsById(userId: number): Required<UserLimitsRow> | null {
    const row = db.prepare('SELECT id, limite, gerado, limit_page_upload FROM users WHERE id = ?')
      .get(userId) as UserLimitsRow | undefined
    if (!row?.id) return null
    return {
      id: Number(row.id),
      limite: Number(row.limite ?? 0),
      gerado: Number(row.gerado ?? 0),
      limit_page_upload: Number(row.limit_page_upload ?? 0),
    }
  }

  insertUser(name: string, email: string, passwordHash: string, role: number) {
    const now = new Date().toISOString()
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, limite, gerado, limit_page_upload, created_at, updated_at)
      VALUES (?, ?, ?, ?, 100000, 0, 200, ?, ?)
    `).run(name, email, passwordHash, role, now, now)
    return Number(result.lastInsertRowid)
  }

  updatePasswordHash(userId: number, passwordHash: string) {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(passwordHash, new Date().toISOString(), userId)
  }

  updateLimit(userId: number, limite: number) {
    db.prepare('UPDATE users SET limite = ?, updated_at = ? WHERE id = ?')
      .run(limite, new Date().toISOString(), userId)
  }

  resetUsage(userId: number) {
    db.prepare('UPDATE users SET gerado = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), userId)
  }

  updatePageUploadLimit(userId: number, limitPageUpload: number) {
    db.prepare('UPDATE users SET limit_page_upload = ?, updated_at = ? WHERE id = ?')
      .run(limitPageUpload, new Date().toISOString(), userId)
  }
}
