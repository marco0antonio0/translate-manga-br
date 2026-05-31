import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { SQLITE_MIGRATIONS } from './migrations'

const dataDir = path.resolve(process.cwd(), 'storage')
const dbFile = path.resolve(dataDir, 'local.sqlite')

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbFile)
db.pragma('busy_timeout = 10000')

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)
}

function runMigrations() {
  ensureMigrationsTable()

  const appliedVersions = new Set<number>(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => Number((row as { version: number }).version))
      .filter((version) => Number.isFinite(version))
  )

  const applyMigrationStatement = db.prepare(`
    INSERT INTO schema_migrations (version, name, applied_at)
    VALUES (?, ?, ?)
  `)

  const pendingMigrations = SQLITE_MIGRATIONS
    .slice()
    .sort((a, b) => a.version - b.version)
    .filter((migration) => !appliedVersions.has(migration.version))

  for (const migration of pendingMigrations) {
    db.transaction(() => {
      db.exec(migration.up)
      applyMigrationStatement.run(migration.version, migration.name, new Date().toISOString())
    })()
  }
}

const shouldRunMigrations = process.env.SKIP_DB_BOOTSTRAP !== '1'

if (shouldRunMigrations) {
  db.pragma('journal_mode = WAL')
  runMigrations()
}

export { db }
