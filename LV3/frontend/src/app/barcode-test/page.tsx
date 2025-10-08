'use client'

import { useState } from 'react'
import BarcodeScanner from '@/components/BarcodeScanner'

export default function BarcodeTestPage() {
  const [scannedCodes, setScannedCodes] = useState<string[]>([])
  const [currentCode, setCurrentCode] = useState<string | null>(null)

  const handleScan = (janCode: string) => {
    setCurrentCode(janCode)
    setScannedCodes(prev => [janCode, ...prev.slice(0, 9)]) // 最新10件を保持
  }

  const handleError = (error: string) => {
    console.error('Barcode scan error:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          JANコード バーコードスキャナー テスト
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* スキャナー部分 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              バーコードスキャナー
            </h2>
            <BarcodeScanner onScan={handleScan} onError={handleError} />
          </div>
          
          {/* 結果表示部分 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              スキャン結果
            </h2>
            
            {/* 最新のスキャン結果 */}
            {currentCode && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded-md">
                <h3 className="font-semibold text-green-800 mb-2">
                  最新スキャン
                </h3>
                <p className="text-green-700 font-mono text-lg">
                  {currentCode}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {currentCode.length === 8 ? 'JAN-8' : 'JAN-13'} 形式
                </p>
              </div>
            )}
            
            {/* スキャン履歴 */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                スキャン履歴 ({scannedCodes.length}件)
              </h3>
              {scannedCodes.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  まだスキャンされていません
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scannedCodes.map((code, index) => (
                    <div
                      key={`${code}-${index}`}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded border"
                    >
                      <span className="font-mono text-sm">{code}</span>
                      <span className="text-xs text-gray-500">
                        {code.length === 8 ? 'JAN-8' : 'JAN-13'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 使用方法 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3 text-blue-800">
            使用方法
          </h2>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>• 「スキャン開始」ボタンをクリックしてカメラを起動</li>
            <li>• 文具などのJANコード（8桁または13桁）をカメラに向ける</li>
            <li>• バーコードが自動的に検出され、右側に結果が表示される</li>
            <li>• QRコードや他の形式のバーコードはエラーになります</li>
            <li>• 同じコードの連続読み取りは1秒間防止されます</li>
          </ul>
        </div>
        
        {/* 戻るリンク */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-block px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            ← メインページに戻る
          </a>
        </div>
      </div>
    </div>
  )
}