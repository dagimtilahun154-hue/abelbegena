export type BackendRole = "OWNER" | "ADMIN" | "STUDENT" | string

export type BackendUser = {
  id: number
  fullName: string
  email: string
  phone?: string | null
  status?: string
  roles?: BackendRole[]
  permissions?: string[]
}

export type BackendSession = {
  token: string
  user: BackendUser
}

export type PasswordTokenPreview = {
  type: "ACCOUNT_SETUP" | "PASSWORD_RESET"
  expiresAt: string
  user: BackendUser
  student?: {
    id: number
    admissionNumber: string
    firstName?: string
    middleName?: string | null
    lastName?: string
    fullName: string
    email?: string | null
    phone?: string | null
    profilePhotoUrl?: string | null
    registrationSource?: string
    registrationStatus?: string
    status?: string
    enrollments?: Array<{
      id: number
      enrollmentNumber: string
      status: string
      program?: {
        id: number
        name: string
        code: string
        instrumentFocus?: string | null
        durationMonths?: number
        skillLevel?: string
      } | null
      batch?: {
        id: number
        name: string
        code?: string
        status?: string
      } | null
      group?: {
        id: number
        name: string
        code?: string
        status?: string
      } | null
      songs?: Array<{
        id: number | null
        songId: number
        title: string
        code?: string | null
        status: string
        sortOrder: number
        isRequired: boolean
        level?: {
          id: number
          name: string
          code: string
          sortOrder: number
        } | null
      }>
    }>
  } | null
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
  errors?: unknown
}

type ApiOptions = {
  method?: string
  body?: unknown
  token?: string | null
  auth?: boolean
  query?: Record<string, string | number | boolean | null | undefined>
}

const API_BASE_URL =
  (import.meta.env.VITE_BACKEND_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:5000/api/v1"

const TOKEN_KEY = "abel_backend_token"
const USER_KEY = "abel_backend_user"

export class BackendError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "BackendError"
    this.status = status
    this.details = details
  }
}

const buildUrl = (path: string, query?: ApiOptions["query"]) => {
  const url = new URL(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`)

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

export const getStoredSession = (): BackendSession | null => {
  const token = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)

  if (!token || !rawUser) {
    return null
  }

  try {
    return { token, user: JSON.parse(rawUser) as BackendUser }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const saveSession = (session: BackendSession) => {
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const apiFetch = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const storedSession = getStoredSession()
  const token = options.token ?? storedSession?.token
  const headers = new Headers()

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method || (options.body === undefined ? "GET" : "POST"),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (networkError: unknown) {
    // fetch() itself throws when the backend is unreachable (connection refused,
    // DNS failure, CORS blocked, offline, etc.)
    const msg =
      networkError instanceof TypeError
        ? "Cannot connect to the backend server. Make sure it is running on " + API_BASE_URL
        : String(networkError)
    throw new BackendError(msg, 0, { networkError })
  }

  const rawText = await response.text()

  // Guard against non-JSON responses (HTML error pages with <!DOCTYPE>, proxy
  // errors, 502/504 gateway pages, etc.) that would crash JSON.parse.
  let payload: ApiEnvelope<T> = {}

  if (rawText) {
    const contentType = response.headers.get("content-type") || ""
    const looksLikeJson = contentType.includes("application/json") || rawText.trimStart().startsWith("{") || rawText.trimStart().startsWith("[")

    if (!looksLikeJson) {
      // The server returned HTML or plain text instead of JSON.
      throw new BackendError(
        response.ok
          ? "The server returned an unexpected non-JSON response."
          : `Server error (${response.status}). The backend may be starting up or misconfigured.`,
        response.status,
        { rawBody: rawText.substring(0, 500) },
      )
    }

    try {
      payload = JSON.parse(rawText) as ApiEnvelope<T>
    } catch {
      throw new BackendError(
        `Failed to parse server response (${response.status}). The backend may be returning invalid JSON.`,
        response.status,
        { rawBody: rawText.substring(0, 500) },
      )
    }
  }

  if (!response.ok || payload.success === false) {
    throw new BackendError(
      payload.message || `Request failed with status ${response.status}`,
      response.status,
      payload.errors,
    )
  }

  return payload.data as T
}

export const hasRole = (user: BackendUser | null | undefined, roles: BackendRole[]) =>
  Boolean(user?.roles?.some((role) => roles.includes(role)))

export const isAdminUser = (user: BackendUser | null | undefined) =>
  hasRole(user, ["OWNER", "ADMIN"])

export const isStudentUser = (user: BackendUser | null | undefined) =>
  hasRole(user, ["STUDENT"])

export const fileToImageUploadPayload = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new BackendError("Please choose an image file.", 400)
  }

  if (file.size > 3 * 1024 * 1024) {
    throw new BackendError("Image must be 3MB or smaller.", 400)
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new BackendError("Could not read image file.", 400))
    reader.readAsDataURL(file)
  })

  return {
    fileName: file.name,
    dataUrl,
  }
}

export const backendAuth = {
  login: async (email: string, password: string) => {
    const session = await apiFetch<BackendSession>(
      "/auth/login",
      {
        method: "POST",
        body: { email, password },
        auth: false,
      },
    )

    saveSession(session)
    return session
  },

  logout: async () => {
    try {
      await apiFetch<null>("/auth/logout", { method: "POST" })
    } catch {
      // Local logout should still complete if the server is unreachable.
    }
    clearSession()
  },

  me: async () => {
    const result = await apiFetch<{ user: BackendUser }>("/auth/me")
    const session = getStoredSession()

    if (session) {
      saveSession({ token: session.token, user: result.user })
    }

    return result.user
  },

  forgotPassword: (email: string) =>
    apiFetch<{ sent: boolean; resetUrl?: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),

  getPasswordTokenPreview: (token: string, type: "ACCOUNT_SETUP" | "PASSWORD_RESET") =>
    apiFetch<{ preview: PasswordTokenPreview }>("/auth/password-token", {
      query: { token, type },
      auth: false,
    }),

  setupPassword: (token: string, password: string) =>
    apiFetch<{ user: BackendUser }>("/auth/setup-password", {
      method: "POST",
      body: { token, password },
      auth: false,
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ user: BackendUser }>("/auth/reset-password", {
      method: "POST",
      body: { token, password },
      auth: false,
    }),
}

export const backendApi = {
  uploadRegistrationPhoto: (body: unknown) =>
    apiFetch<{ upload: any }>("/public/uploads/registration-photo", {
      method: "POST",
      body,
      auth: false,
    }),

  uploadShopImage: (body: unknown) =>
    apiFetch<{ upload: any }>("/uploads/shop-image", {
      method: "POST",
      body,
    }),

  createPublicRegistration: (body: unknown) =>
    apiFetch<{ student: any }>("/public/student-registrations", {
      method: "POST",
      body,
      auth: false,
    }),

  getPublicRegistrationStatus: (phone: string) =>
    apiFetch<{ registration: any }>("/public/student-registrations/status", {
      query: { phone },
      auth: false,
    }),

  listPublicTrainingPrograms: () =>
    apiFetch<{ programs: any[]; meta?: any }>("/public/training-programs", {
      query: { status: "ACTIVE", limit: 100 },
      auth: false,
    }),

  listTrainingPrograms: () =>
    apiFetch<{ programs: any[]; meta?: any }>("/training-programs", {
      query: { limit: 100 },
    }),

  createTrainingProgram: (body: unknown) =>
    apiFetch<{ program: any }>("/training-programs", {
      method: "POST",
      body,
    }),

  updateTrainingProgram: (id: number | string, body: unknown) =>
    apiFetch<{ program: any }>(`/training-programs/${id}`, {
      method: "PATCH",
      body,
    }),

  listTrainingBatches: () =>
    apiFetch<{ batches: any[]; meta?: any }>("/training-batches", {
      query: { limit: 100 },
    }),

  createTrainingBatch: (body: unknown) =>
    apiFetch<{ batch: any }>("/training-batches", {
      method: "POST",
      body,
    }),

  updateTrainingBatch: (id: number | string, body: unknown) =>
    apiFetch<{ batch: any }>(`/training-batches/${id}`, {
      method: "PATCH",
      body,
    }),

  listTrainingGroups: (query: Record<string, unknown> = {}) =>
    apiFetch<{ groups: any[]; meta?: any }>("/training-groups", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),

  createTrainingGroup: (body: unknown) =>
    apiFetch<{ group: any }>("/training-groups", {
      method: "POST",
      body,
    }),

  updateTrainingGroup: (id: number | string, body: unknown) =>
    apiFetch<{ group: any }>(`/training-groups/${id}`, {
      method: "PATCH",
      body,
    }),

  getSchoolProfile: () => apiFetch<{ school: any }>("/school"),

  updateSchoolProfile: (body: unknown) =>
    apiFetch<{ school: any }>("/school", {
      method: "PATCH",
      body,
    }),

  listSongLevels: () =>
    apiFetch<{ levels: any[]; meta?: any }>("/song-levels", {
      query: { limit: 100 },
    }),

  createSongLevel: (body: unknown) =>
    apiFetch<{ level: any }>("/song-levels", {
      method: "POST",
      body,
    }),

  listSongs: () =>
    apiFetch<{ songs: any[]; meta?: any }>("/songs", {
      query: { limit: 100 },
    }),

  createSong: (body: unknown) =>
    apiFetch<{ song: any }>("/songs", {
      method: "POST",
      body,
    }),

  listProgramSongs: (query: Record<string, unknown> = {}) =>
    apiFetch<{ programSongs: any[]; meta?: any }>("/program-songs", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),

  createProgramSong: (body: unknown) =>
    apiFetch<{ programSong: any }>("/program-songs", {
      method: "POST",
      body,
    }),

  updateStudentSongProgress: (studentId: number | string, songId: number | string, body: unknown) =>
    apiFetch<any>(`/students/${studentId}/song-progress/${songId}`, {
      method: "PATCH",
      body,
    }),

  listStudents: () =>
    apiFetch<{ students: any[]; meta?: any }>("/students", {
      query: { limit: 100 },
    }),

  getOwnStudentProfile: () => apiFetch<{ student: any }>("/students/me"),

  getOwnSongProgress: () => apiFetch<any>("/students/me/song-progress"),

  listEnrollments: () =>
    apiFetch<{ enrollments: any[]; meta?: any }>("/enrollments", {
      query: { limit: 100 },
    }),

  createStudentEnrollment: (studentId: number | string, body: unknown) =>
    apiFetch<{ enrollment: any }>(`/students/${studentId}/enrollments`, {
      method: "POST",
      body,
    }),

  updateEnrollment: (enrollmentId: number | string, body: unknown) =>
    apiFetch<{ enrollment: any }>(`/enrollments/${enrollmentId}`, {
      method: "PATCH",
      body,
    }),

  listAdmissions: (query: Record<string, unknown> = {}) =>
    apiFetch<{ admissions: any[]; meta?: any }>("/admissions", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),

  approveAdmission: (studentId: number | string, body: unknown = {}) =>
    apiFetch<{ student: any; setupEmail?: any }>(`/admissions/${studentId}/approve`, {
      method: "PATCH",
      body,
    }),

  createInPersonRegistration: (body: unknown) =>
    apiFetch<{ student: any; setupEmail?: any }>("/students/in-person-registration", {
      method: "POST",
      body,
    }),

  rejectAdmission: (studentId: number | string, rejectionReason: string) =>
    apiFetch<{ student: any }>(`/admissions/${studentId}/reject`, {
      method: "PATCH",
      body: { rejectionReason },
    }),

  listDashboardReport: () => apiFetch<any>("/reports/dashboard"),

  listAuditLogs: () =>
    apiFetch<{ auditLogs: any[]; meta?: any }>("/audit-logs", {
      query: { limit: 50 },
    }),

  listUsers: (query: Record<string, unknown> = {}) =>
    apiFetch<{ users: any[]; meta?: any }>("/users", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),

  createUser: (body: unknown) =>
    apiFetch<{ user: any }>("/users", {
      method: "POST",
      body,
    }),

  updateUser: (id: number | string, body: unknown) =>
    apiFetch<{ user: any }>(`/users/${id}`, {
      method: "PATCH",
      body,
    }),

  updateUserStatus: (id: number | string, status: string) =>
    apiFetch<{ user: any }>(`/users/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  listRoles: () => apiFetch<{ roles: any[] }>("/roles"),

  listPermissions: () => apiFetch<{ permissions: any[] }>("/permissions"),

  listPublicShopItems: () =>
    apiFetch<{ items: any[]; meta?: any }>("/public/shop/items", {
      query: { isPublished: true, status: "ACTIVE", limit: 100 },
      auth: false,
    }),

  listShopItems: () =>
    apiFetch<{ items: any[]; meta?: any }>("/shop/items", {
      query: { limit: 100 },
    }),

  listShopCategories: () =>
    apiFetch<{ categories: any[]; meta?: any }>("/shop/categories", {
      query: { limit: 100 },
    }),

  createShopCategory: (body: unknown) =>
    apiFetch<{ category: any }>("/shop/categories", {
      method: "POST",
      body,
    }),

  createShopItem: (body: unknown) =>
    apiFetch<{ item: any }>("/shop/items", {
      method: "POST",
      body,
    }),

  updateShopItem: (id: number | string, body: unknown) =>
    apiFetch<{ item: any }>(`/shop/items/${id}`, {
      method: "PATCH",
      body,
    }),

  createStudentShopRequest: (body: unknown) =>
    apiFetch<{ request: any }>("/shop/requests", {
      method: "POST",
      body,
    }),

  createPublicShopRequest: (body: unknown) =>
    apiFetch<{ request: any }>("/public/shop/requests", {
      method: "POST",
      body,
      auth: false,
    }),

  listOwnShopRequests: () => apiFetch<{ requests: any[] }>("/shop/requests/me"),

  listShopRequests: () =>
    apiFetch<{ requests: any[]; meta?: any }>("/shop/requests", {
      query: { limit: 100 },
    }),

  updateShopRequestStatus: (id: number | string, status: string, notes?: string) =>
    apiFetch<{ request: any }>(`/shop/requests/${id}/status`, {
      method: "PATCH",
      body: { status, notes: notes || null },
    }),

  listIncomes: () =>
    apiFetch<{ incomes: any[]; meta?: any }>("/finance/incomes", {
      query: { limit: 100 },
    }),

  listFeePlans: () =>
    apiFetch<{ feePlans: any[]; meta?: any }>("/finance/fee-plans", {
      query: { limit: 100 },
    }),

  createFeePlan: (body: unknown) =>
    apiFetch<{ feePlan: any }>("/finance/fee-plans", {
      method: "POST",
      body,
    }),

  listFeeAssignments: (query: Record<string, unknown> = {}) =>
    apiFetch<{ assignments: any[]; meta?: any }>("/finance/fee-assignments", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),

  createFeeAssignment: (body: unknown) =>
    apiFetch<{ assignment: any }>("/finance/fee-assignments", {
      method: "POST",
      body,
    }),

  listPayments: (query: Record<string, unknown> = {}) =>
    apiFetch<{ payments: any[]; meta?: any }>("/finance/payments", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),

  createPayment: (body: unknown) =>
    apiFetch<{ payment: any }>("/finance/payments", {
      method: "POST",
      body,
    }),

  getStudentFinanceSummary: (studentId: number | string) =>
    apiFetch<any>(`/finance/students/${studentId}/summary`),

  listIncomeCategories: () => apiFetch<{ categories: any[] }>("/finance/income-categories"),

  createIncomeCategory: (body: unknown) =>
    apiFetch<{ category: any }>("/finance/income-categories", {
      method: "POST",
      body,
    }),

  listExpenseCategories: () => apiFetch<{ categories: any[] }>("/finance/expense-categories"),

  createExpenseCategory: (body: unknown) =>
    apiFetch<{ category: any }>("/finance/expense-categories", {
      method: "POST",
      body,
    }),

  listExpenses: () =>
    apiFetch<{ expenses: any[]; meta?: any }>("/finance/expenses", {
      query: { limit: 100 },
    }),

  createIncome: (body: unknown) =>
    apiFetch<{ income: any }>("/finance/incomes", {
      method: "POST",
      body,
    }),

  createExpense: (body: unknown) =>
    apiFetch<{ expense: any }>("/finance/expenses", {
      method: "POST",
      body,
    }),

  getOwnFinanceSummary: () => apiFetch<any>("/finance/me/summary"),

  listStockCategories: () =>
    apiFetch<{ categories: any[]; meta?: any }>("/stock/categories", {
      query: { limit: 100 },
    }),

  createStockCategory: (body: unknown) =>
    apiFetch<{ category: any }>("/stock/categories", {
      method: "POST",
      body,
    }),

  listSuppliers: () =>
    apiFetch<{ suppliers: any[]; meta?: any }>("/stock/suppliers", {
      query: { limit: 100 },
    }),

  createSupplier: (body: unknown) =>
    apiFetch<{ supplier: any }>("/stock/suppliers", {
      method: "POST",
      body,
    }),

  listStockItems: () =>
    apiFetch<{ items: any[]; meta?: any }>("/stock/items", {
      query: { limit: 100 },
    }),

  createStockItem: (body: unknown) =>
    apiFetch<{ item: any }>("/stock/items", {
      method: "POST",
      body,
    }),

  listStockMovements: () =>
    apiFetch<{ movements: any[]; meta?: any }>("/stock/movements", {
      query: { limit: 100 },
    }),

  createStockMovement: (body: unknown) =>
    apiFetch<{ movement: any }>("/stock/movements", {
      method: "POST",
      body,
    }),

  listLowStockItems: () => apiFetch<{ items: any[] }>("/stock/low-stock"),

  listAttendanceSessions: (query: Record<string, unknown> = {}) =>
    apiFetch<{ sessions: any[]; meta?: any }>("/attendance/sessions", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),

  createAttendanceSession: (body: unknown) =>
    apiFetch<{ session: any }>("/attendance/sessions", {
      method: "POST",
      body,
    }),

  updateAttendanceSession: (id: number | string, body: unknown) =>
    apiFetch<{ session: any }>(`/attendance/sessions/${id}`, {
      method: "PATCH",
      body,
    }),

  listAttendanceRecords: (sessionId: number | string) =>
    apiFetch<{ records: any[]; meta?: any }>(`/attendance/sessions/${sessionId}/records`, {
      query: { limit: 100 },
    }),

  createAttendanceRecord: (sessionId: number | string, body: unknown) =>
    apiFetch<{ record: any }>(`/attendance/sessions/${sessionId}/records`, {
      method: "POST",
      body,
    }),

  getDailyAttendanceReport: (query: Record<string, unknown>) =>
    apiFetch<any>("/attendance/reports/daily", {
      query: query as Record<string, string | number | boolean>,
    }),

  getGroupAttendanceSummary: (query: Record<string, unknown> = {}) =>
    apiFetch<any>("/attendance/reports/group-summary", {
      query: query as Record<string, string | number | boolean>,
    }),

  listRecognitionEvents: (query: Record<string, unknown> = {}) =>
    apiFetch<{ recognitionEvents: any[]; meta?: any }>("/attendance/recognition-events", {
      query: { limit: 100, ...(query as Record<string, string | number | boolean>) },
    }),
}

export const getBackendBaseUrl = () => API_BASE_URL
