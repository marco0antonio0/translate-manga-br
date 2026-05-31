import { migration001InitialSchema } from './001_initial_schema'

export interface SqliteMigration {
  version: number
  name: string
  up: string
}

export const SQLITE_MIGRATIONS: SqliteMigration[] = [
  migration001InitialSchema,
]
