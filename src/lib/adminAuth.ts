export const ADMIN_ALIAS = "abeladmin"
export const ADMIN_ALIAS_EMAIL = "abeladmin@abelbegena.local"
export const ADMIN_DEFAULT_PASSWORD = "admin@abel123"

export const normalizeLogin = (value: string) => {
  const trimmed = value.trim()
  return trimmed.toLowerCase() === ADMIN_ALIAS ? ADMIN_ALIAS_EMAIL : trimmed
}

export const isAdminLogin = (value: string) => {
  const normalized = value.trim().toLowerCase()
  return normalized === ADMIN_ALIAS || normalized === ADMIN_ALIAS_EMAIL
}

export const isBootstrapAdminEmail = (email?: string | null) => {
  return email?.trim().toLowerCase() === ADMIN_ALIAS_EMAIL
}

export const isInvalidCredentials = (error: unknown) => {
  return error instanceof Error && error.message.toLowerCase().includes("invalid login credentials")
}
