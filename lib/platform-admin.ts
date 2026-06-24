export const PLATFORM_ADMIN_EMAIL = 'zoran2@gmail.com'

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()
}
