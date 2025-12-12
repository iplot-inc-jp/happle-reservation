/**
 * API Client
 * バックエンドAPIとの通信を行うクライアント
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return {
        error: data.error || 'API request failed',
        message: data.message,
      }
    }
    
    return { data }
  } catch (error) {
    console.error('API request error:', error)
    return {
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ==================== Types ====================

export interface Studio {
  id: number
  name: string
  code: string
  address: string
  tel: string
  business_hours: string
}

export interface Program {
  id: number
  name: string
  code: string
  description: string
  duration: number
  capacity: number
  price: number
  thumbnail: string | null
}

export interface ScheduleSlot {
  id: number
  studio_id: number
  program_id: number
  program_name: string
  instructor_id: number
  instructor_name: string
  start_at: string
  end_at: string
  capacity: number
  reserved_count: number
  available: number
  is_reservable: boolean
}

export interface Reservation {
  id: number
  member_id: number
  studio_lesson_id: number
  status: string
  created_at: string
}

export interface ReservationRequest {
  studio_lesson_id: number
  guest_name: string
  guest_name_kana?: string
  guest_email: string
  guest_phone: string
  guest_note?: string
  studio_id?: number
}

// ==================== API Functions ====================

export async function getStudios(): Promise<Studio[]> {
  const response = await fetchApi<{ studios: Studio[] }>('/api/studios')
  return response.data?.studios || []
}

export async function getStudio(studioId: number): Promise<Studio | null> {
  const response = await fetchApi<{ studio: Studio }>(`/api/studios/${studioId}`)
  return response.data?.studio || null
}

export async function getPrograms(studioId?: number): Promise<Program[]> {
  const params = studioId ? `?studio_id=${studioId}` : ''
  const response = await fetchApi<{ programs: Program[] }>(`/api/programs${params}`)
  return response.data?.programs || []
}

export async function getProgram(programId: number): Promise<Program | null> {
  const response = await fetchApi<{ program: Program }>(`/api/programs/${programId}`)
  return response.data?.program || null
}

export async function getSchedule(params: {
  studio_id?: number
  program_id?: number
  start_date?: string
  end_date?: string
}): Promise<ScheduleSlot[]> {
  const searchParams = new URLSearchParams()
  if (params.studio_id) searchParams.set('studio_id', params.studio_id.toString())
  if (params.program_id) searchParams.set('program_id', params.program_id.toString())
  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  
  const query = searchParams.toString()
  const response = await fetchApi<{ schedule: ScheduleSlot[] }>(`/api/schedule${query ? `?${query}` : ''}`)
  return response.data?.schedule || []
}

export async function createReservation(
  data: ReservationRequest
): Promise<{ success: boolean; reservation?: Reservation; error?: string; message?: string }> {
  const response = await fetchApi<{ success: boolean; reservation: Reservation; message: string }>(
    '/api/reservations',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
  
  if (response.error) {
    return { success: false, error: response.error, message: response.message }
  }
  
  return {
    success: response.data?.success || false,
    reservation: response.data?.reservation,
    message: response.data?.message,
  }
}

export async function getReservation(reservationId: number): Promise<Reservation | null> {
  const response = await fetchApi<{ reservation: Reservation }>(`/api/reservations/${reservationId}`)
  return response.data?.reservation || null
}

export async function cancelReservation(
  reservationId: number
): Promise<{ success: boolean; error?: string }> {
  const response = await fetchApi<{ success: boolean }>(
    `/api/reservations/${reservationId}/cancel`,
    { method: 'POST' }
  )
  
  if (response.error) {
    return { success: false, error: response.error }
  }
  
  return { success: response.data?.success || false }
}

