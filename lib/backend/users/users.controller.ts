import type { UsersService } from './users.service'
import type { CreateUserInput } from './users.types'

export class UsersController {
  constructor(private readonly service: UsersService) {}

  listUsers() {
    return this.service.listUsers()
  }

  createUser(input: CreateUserInput) {
    return this.service.createUser(input)
  }

  updatePassword(userId: number, newPassword: string) {
    return this.service.updatePassword(userId, newPassword)
  }

  updateLimit(userId: number, limite: number) {
    return this.service.updateLimit(userId, limite)
  }

  resetUsage(userId: number) {
    return this.service.resetUsage(userId)
  }

  updatePageUploadLimit(userId: number, limitPageUpload: number) {
    return this.service.updatePageUploadLimit(userId, limitPageUpload)
  }
}
