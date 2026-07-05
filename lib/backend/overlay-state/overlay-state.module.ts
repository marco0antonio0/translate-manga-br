import { OverlayStateRepository } from './overlay-state.repository'
import { OverlayStateService } from './overlay-state.service'

const overlayStateRepository = new OverlayStateRepository()
export const overlayStateService = new OverlayStateService(overlayStateRepository)
