// src/app/demo/page.tsx
'use client'

import { useCanvasStore } from '@/lib/canvas-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export default function DemoPage() {
  const {
    canvases,
    currentCanvasId,
    createCanvas,
    switchCanvas,
    updateCanvas,
    deleteCanvas,
    getCurrentCanvas,
    getAllCanvases
  } = useCanvasStore()

  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const currentCanvas = getCurrentCanvas()
  const allCanvases = getAllCanvases()

  const handleCreateCanvas = () => {
    const title = prompt('Nhập tên canvas:') || 'Canvas mới'
    const canvasId = createCanvas(title)
    addLog(`✅ Tạo canvas mới: ${title} (ID: ${canvasId})`)
  }

  const handleSwitchCanvas = (canvasId: string) => {
    switchCanvas(canvasId)
    const canvas = getCurrentCanvas()
    addLog(`🔄 Chuyển sang canvas: ${canvas?.title}`)
  }

  const handleUpdateCanvas = (canvasId: string) => {
    const newTitle = prompt('Nhập tên mới:') || 'Canvas đã cập nhật'
    updateCanvas(canvasId, { title: newTitle })
    addLog(`✏️ Cập nhật canvas: ${newTitle}`)
  }

  const handleDeleteCanvas = (canvasId: string) => {
    const canvas = getCanvasById(canvasId)
    if (confirm(`Bạn có chắc muốn xóa canvas "${canvas?.title}"?`)) {
      deleteCanvas(canvasId)
      addLog(`🗑️ Xóa canvas: ${canvas?.title}`)
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const handleRunDemo = () => {
    addLog('�� Bắt đầu demo...')
    
    // Tạo canvas 1
    const canvas1Id = createCanvas('Demo Canvas 1')
    addLog(`✅ Tạo canvas 1: ${canvas1Id}`)
    
    // Tạo canvas 2
    const canvas2Id = createCanvas('Demo Canvas 2')
    addLog(`✅ Tạo canvas 2: ${canvas2Id}`)
    
    // Chuyển sang canvas 1
    switchCanvas(canvas1Id)
    addLog('🔄 Chuyển sang canvas 1')
    
    // Cập nhật canvas 1
    updateCanvas(canvas1Id, { 
      title: 'Updated Demo Canvas 1',
      summary: 'This canvas has been updated!'
    })
    addLog('✏️ Cập nhật canvas 1')
    
    // Cập nhật data cho canvas 1
    const mockData = {
      shapes: [
        { id: 'shape1', type: 'node', x: 100, y: 100 },
        { id: 'shape2', type: 'node', x: 200, y: 200 }
      ],
      bindings: []
    }
    updateCanvasData(canvas1Id, mockData)
    addLog('�� Cập nhật data cho canvas 1')
    
    // Chuyển sang canvas 2
    switchCanvas(canvas2Id)
    addLog('🔄 Chuyển sang canvas 2')
    
    // Xóa canvas 2
    deleteCanvas(canvas2Id)
    addLog('��️ Xóa canvas 2')
    
    addLog('✅ Demo hoàn thành!')
  }

  // Auto-run demo khi component mount
  useEffect(() => {
    addLog('🎨 Canvas Store Demo đã sẵn sàng!')
    addLog('📋 Sử dụng các nút bên dưới để test canvas store')
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">🎨 Canvas Store Demo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Điều khiển</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleCreateCanvas} className="flex-1">
                ➕ Tạo Canvas Mới
              </Button>
              <Button onClick={handleRunDemo} variant="outline">
                🚀 Chạy Demo
              </Button>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Danh sách Canvas:</h3>
              {allCanvases.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có canvas nào</p>
              ) : (
                allCanvases.map((canvas) => (
                  <div key={canvas.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{canvas.title}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(canvas.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        ID: {canvas.id}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSwitchCanvas(canvas.id)}
                        disabled={canvas.id === currentCanvasId}
                      >
                        {canvas.id === currentCanvasId ? '✓' : 'Chọn'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateCanvas(canvas.id)}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCanvas(canvas.id)}
                      >
                        ��️
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Canvas Info */}
        <Card>
          <CardHeader>
            <CardTitle>Canvas Hiện Tại</CardTitle>
          </CardHeader>
          <CardContent>
            {currentCanvas ? (
              <div className="space-y-4">
                <div>
                  <strong>ID:</strong> 
                  <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                    {currentCanvas.id}
                  </code>
                </div>
                <div>
                  <strong>Tiêu đề:</strong> {currentCanvas.title}
                </div>
                <div>
                  <strong>Tóm tắt:</strong> {currentCanvas.summary}
                </div>
                <div>
                  <strong>Tạo lúc:</strong> {new Date(currentCanvas.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Cập nhật lúc:</strong> {new Date(currentCanvas.updatedAt).toLocaleString()}
                </div>
                <div>
                  <strong>Dữ liệu:</strong> 
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(currentCanvas.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có canvas nào được chọn</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <strong>Tổng số canvas:</strong> {Object.keys(canvases).length}
            </div>
            <div>
              <strong>Canvas hiện tại:</strong> {currentCanvasId || 'Không có'}
            </div>
            <div>
              <strong>LocalStorage key:</strong> canvas-store
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Logs:</h3>
              <Button size="sm" variant="outline" onClick={handleClearLogs}>
                🗑️ Xóa logs
              </Button>
            </div>
            <div className="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có log nào</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Hướng dẫn sử dụng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>1. Tạo Canvas Mới:</strong> Nhấn nút "➕ Tạo Canvas Mới" và nhập tên</p>
            <p><strong>2. Chuyển đổi Canvas:</strong> Nhấn nút "Chọn" để chuyển sang canvas khác</p>
            <p><strong>3. Cập nhật Canvas:</strong> Nhấn nút "✏️" để đổi tên canvas</p>
            <p><strong>4. Xóa Canvas:</strong> Nhấn nút "🗑️" để xóa canvas</p>
            <p><strong>5. Chạy Demo:</strong> Nhấn nút "🚀 Chạy Demo" để test tự động</p>
            <p><strong>6. Kiểm tra LocalStorage:</strong> Mở DevTools → Application → Local Storage</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}