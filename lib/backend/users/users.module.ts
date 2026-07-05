import { UsersController } from './users.controller'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

const usersRepository = new UsersRepository()
const usersService = new UsersService(usersRepository)
export const usersController = new UsersController(usersService)
