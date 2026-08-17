// Erişim/kiracılık çekirdeğinin barrel'ı (diagnosis ve playbook ile aynı desen).
export type { AccessIdentity, AccessRole, OwnershipQuery, RecordOwner } from "./ownership";
export {
  canManageMembers,
  canReadRecord,
  canViewOrganization,
  canWriteRecord,
  isUnowned,
  ownershipQuery,
} from "./ownership";
export type { CredentialTokenFacts, CredentialTokenKind, LoginDecision, LoginFacts } from "./account-policy";
export {
  normalizeEmail,
  organizationSlug,
  TOKEN_TTL_HOURS,
  credentialTokenUsable,
  invitationAcceptable,
  loginDecision,
  membershipMutable,
  seatAvailable,
  seatLimitReducible,
  tokenExpiryFrom,
} from "./account-policy";
