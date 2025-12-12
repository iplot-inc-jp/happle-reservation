'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getChoiceSchedule, ChoiceSchedule } from '@/lib/api'
import { format, addDays, parseISO, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'

interface TimeSlot {
  time: string
  startAt: string
  available: boolean
  instructorCount: number
}

function FreeScheduleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studioRoomId = searchParams.get('studio_room_id')
  const studioId = searchParams.get('studio_id')

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [schedule, setSchedule] = useState<ChoiceSchedule | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 日付リスト（今日から14日間）
  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

  useEffect(() => {
    async function loadSchedule() {
      if (!studioRoomId) {
        setError('スタジオルームが指定されていません')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const scheduleData = await getChoiceSchedule(parseInt(studioRoomId), dateStr)
        setSchedule(scheduleData)

        // タイムスロットを生成
        if (scheduleData) {
          const slots = generateTimeSlots(scheduleData, selectedDate)
          setTimeSlots(slots)
        }
      } catch (err) {
        setError('スケジュールの読み込みに失敗しました')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadSchedule()
  }, [studioRoomId, selectedDate])

  // 営業時間とスタッフのシフトから予約可能なタイムスロットを生成
  function generateTimeSlots(schedule: ChoiceSchedule, date: Date): TimeSlot[] {
    const slots: TimeSlot[] = []
    const scheduleNick = schedule.studio_room_service?.schedule_nick || 30 // デフォルト30分刻み

    // 営業時間を取得
    const businessHour = schedule.shift_studio_business_hour?.find(
      (bh) => !bh.is_holiday && isSameDay(parseISO(bh.date), date)
    )

    if (!businessHour) {
      return [] // 営業日ではない
    }

    const startTime = parseISO(businessHour.start_at)
    const endTime = parseISO(businessHour.end_at)

    // スタッフのシフトを取得
    const shiftInstructors = schedule.shift_instructor || []
    
    // 予約済みのスタッフ時間を取得
    const reservedSlots = schedule.reservation_assign_instructor || []

    // 時間スロットを生成
    let currentTime = new Date(startTime)
    while (currentTime < endTime) {
      const slotEndTime = new Date(currentTime.getTime() + scheduleNick * 60 * 1000)
      
      // この時間帯に空いているスタッフをカウント
      let availableCount = 0
      for (const instructor of shiftInstructors) {
        const instStart = parseISO(instructor.start_at)
        const instEnd = parseISO(instructor.end_at)
        
        // スタッフのシフト時間内かチェック
        if (currentTime >= instStart && slotEndTime <= instEnd) {
          // 予約が入っていないかチェック
          const isReserved = reservedSlots.some(
            (res) =>
              res.entity_id === instructor.instructor_id &&
              parseISO(res.start_at) < slotEndTime &&
              parseISO(res.end_at) > currentTime
          )
          if (!isReserved) {
            availableCount++
          }
        }
      }

      const dateStr = format(date, 'yyyy-MM-dd')
      const timeStr = format(currentTime, 'HH:mm:ss')

      slots.push({
        time: format(currentTime, 'HH:mm'),
        startAt: `${dateStr} ${timeStr}.000`,
        available: availableCount > 0,
        instructorCount: availableCount,
      })

      currentTime = slotEndTime
    }

    return slots
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return

    const params = new URLSearchParams()
    params.set('studio_room_id', studioRoomId!)
    params.set('start_at', slot.startAt)
    params.set('date', format(selectedDate, 'yyyy-MM-dd'))
    params.set('time', slot.time)
    if (studioId) params.set('studio_id', studioId)
    router.push(`/free-booking?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-accent-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😢</div>
          <p className="text-accent-600 mb-4">{error}</p>
          <button onClick={() => router.back()} className="btn-secondary">
            戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-accent-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        メニュー選択に戻る
      </button>

      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-accent-900 mb-2">
          日時を選択
        </h2>
        <p className="text-accent-600">
          ご希望の日時をお選びください
        </p>
      </div>

      {/* Date Selection */}
      <div className="mb-8 animate-fade-in-delay-1">
        <h3 className="font-display font-bold text-lg text-accent-800 mb-4">日付</h3>
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate)
            const isToday = isSameDay(date, new Date())
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-4 py-3 rounded-xl text-center transition-all min-w-[72px] ${
                  isSelected
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white border border-accent-200 text-accent-700 hover:border-primary-300'
                }`}
              >
                <div className="text-xs font-medium mb-1">
                  {format(date, 'E', { locale: ja })}
                  {isToday && <span className="ml-1 text-xs">(今日)</span>}
                </div>
                <div className="text-lg font-bold">{format(date, 'd')}</div>
                <div className="text-xs">{format(date, 'M月')}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Slots */}
      <div className="animate-fade-in-delay-2">
        <h3 className="font-display font-bold text-lg text-accent-800 mb-4">時間</h3>
        
        {timeSlots.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-accent-600">
              この日は予約可能な時間帯がありません
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleSlotSelect(slot)}
                disabled={!slot.available}
                className={`p-3 rounded-xl text-center transition-all ${
                  slot.available
                    ? 'bg-white border border-accent-200 text-accent-700 hover:border-primary-300 hover:bg-primary-50'
                    : 'bg-accent-100 text-accent-400 cursor-not-allowed'
                }`}
              >
                <div className="font-bold text-lg">{slot.time}</div>
                <div className="text-xs mt-1">
                  {slot.available ? (
                    <span className="text-primary-600">
                      {slot.instructorCount}名空き
                    </span>
                  ) : (
                    <span className="text-accent-400">満席</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-primary-50 rounded-xl text-sm text-accent-600">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            空いているスタッフが自動的に割り当てられます。
            ご希望の時間帯をお選びください。
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FreeSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-accent-600">読み込み中...</p>
          </div>
        </div>
      }
    >
      <FreeScheduleContent />
    </Suspense>
  )
}

