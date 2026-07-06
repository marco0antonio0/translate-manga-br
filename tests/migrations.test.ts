import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { SQLITE_MIGRATIONS } from '../lib/backend/shared/migrations'

describe('SQLite migrations', () => {
  it('apply cleanly to an empty database and create core tables', () => {
    const db = new Database(':memory:')

    db.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `)

    for (const migration of SQLITE_MIGRATIONS) {
      db.exec(migration.up)
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, new Date().toISOString())
    }

    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      ORDER BY name ASC
    `).all() as Array<{ name: string }>

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'users',
        'sessions',
        'sections',
        'section_images',
        'section_image_ocr_items',
        'kv_store',
        'schema_migrations',
      ])
    )

    const applied = db.prepare('SELECT version, name FROM schema_migrations').all()
    expect(applied).toEqual([{ version: 1, name: '001_initial_schema' }])
    db.close()
  })
})
