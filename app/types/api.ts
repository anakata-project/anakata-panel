import type { components } from '../../../anakata-ui/app/types/api'

export type {
  BusinessRulesDocument,
  BusinessRulesVersion,
  CancellationBand,
  ChangeHistoryEntry,
  ConfigChange,
  ConfigPublisher,
  ConfigValidation,
  ConfigVersion,
  ConfigVersionDetail,
  ConfigVersionSummary,
  ConfigWarning,
  AvailabilityCounts,
  BlockReason,
  CabinAvailability,
  CabinState,
  CalendarCell,
  CalendarDeparture,
  CalendarGrid,
  CalendarRow,
  ClaimHolder,
  ClaimSummary,
  Departure,
  DepartureKpis,
  DepartureListItem,
  DepartureLocks,
  DepartureMutationResponse,
  DepartureStatus,
  EngineLabel,
  EngineLabelTone,
  EngineSettingsDocument,
  EngineSettingsValidation,
  EngineSettingsVersion,
  GenerateSeasonResult,
  HoldType,
  Itinerary,
  ItineraryCompleteness,
  ItineraryDefaults,
  ItineraryGradient,
  ItineraryListItem,
  ItineraryPair,
  ItineraryStatus,
  Me,
  NoRate,
  Paginated,
  PermissionItem,
  PriceCheckRow,
  Quote,
  RatesDocument,
  RatesVersion,
  Role,
  RuleGroup,
  RuleRegistryCounts,
  RuleRegistryRow,
  RuleStatus,
  RuleWhere,
  UserListItem,
  Yacht
} from '../../../anakata-ui/app/types'

export type Permission = components['schemas']['Permission']
export type UserStatus = components['schemas']['UserStatus']
export type InviteUserRequest = components['schemas']['InviteUserRequest']
export type UpdateUserRequest = components['schemas']['UpdateUserRequest']
export type DisableUserRequest = components['schemas']['DisableUserRequest']
export type StoreRoleRequest = components['schemas']['StoreRoleRequest']
export type UpdateRoleRequest = components['schemas']['UpdateRoleRequest']
