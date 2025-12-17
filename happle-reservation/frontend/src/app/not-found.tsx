'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full mx-auto mb-8 flex items-center justify-center">
          <span className="text-6xl">🍃</span>
        </div>
        
        {/* Error Code */}
        <div className="mb-4">
          <span className="text-8xl font-display font-bold text-primary-200">404</span>
        </div>
        
        {/* Message */}
        <h1 className="font-display text-2xl font-bold text-accent-900 mb-3">
          ページが見つかりません
        </h1>
        <p className="text-accent-600 mb-8">
          お探しのページは移動または削除された可能性があります。<br />
          URLをご確認いただくか、トップページからお探しください。
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            トップページへ
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            前のページへ戻る
          </button>
        </div>
        
        {/* Help */}
        <div className="mt-12 p-4 bg-accent-50 rounded-xl">
          <p className="text-sm text-accent-600">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  )
}

