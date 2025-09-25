// Demo file để test canvas store trong browser
// Chạy trong console: import('./canvas-store-demo').then(m => m.demo())

import { useCanvasStore } from './canvas-store'

export function demo() {
  console.log('🎨 Canvas Store Demo')
  console.log('==================')
  
  // Test tạo canvas
  console.log('\n1. Tạo canvas mới:')
  const canvas1Id = useCanvasStore.getState().createCanvas('Canvas Demo 1')
  console.log('✅ Created canvas:', canvas1Id)
  
  const canvas2Id = useCanvasStore.getState().createCanvas('Canvas Demo 2')
  console.log('✅ Created canvas:', canvas2Id)
  
  // Test lấy thông tin canvas
  console.log('\n2. Thông tin canvas:')
  const allCanvases = useCanvasStore.getState().getAllCanvases()
  console.log('📋 All canvases:', allCanvases)
  
  const currentCanvas = useCanvasStore.getState().getCurrentCanvas()
  console.log('🎯 Current canvas:', currentCanvas)
  
  // Test chuyển đổi canvas
  console.log('\n3. Chuyển đổi canvas:')
  useCanvasStore.getState().switchCanvas(canvas1Id)
  console.log('🔄 Switched to canvas 1')
  
  const newCurrent = useCanvasStore.getState().getCurrentCanvas()
  console.log('🎯 New current canvas:', newCurrent?.title)
  
  // Test cập nhật canvas
  console.log('\n4. Cập nhật canvas:')
  useCanvasStore.getState().updateCanvas(canvas1Id, {
    title: 'Updated Canvas 1',
    summary: 'This canvas has been updated!'
  })
  
  const updatedCanvas = useCanvasStore.getState().getCanvasById(canvas1Id)
  console.log('✏️ Updated canvas:', updatedCanvas)
  
  // Test cập nhật data
  console.log('\n5. Cập nhật canvas data:')
  const mockData = {
    shapes: [{ id: 'shape1', type: 'node', x: 100, y: 100 }],
    bindings: []
  }
  
  useCanvasStore.getState().updateCanvasData(canvas1Id, mockData)
  
  const canvasWithData = useCanvasStore.getState().getCanvasById(canvas1Id)
  console.log('💾 Canvas with data:', canvasWithData)
  
  // Test xóa canvas
  console.log('\n6. Xóa canvas:')
  useCanvasStore.getState().deleteCanvas(canvas2Id)
  console.log('🗑️ Deleted canvas 2')
  
  const remainingCanvases = useCanvasStore.getState().getAllCanvases()
  console.log('📋 Remaining canvases:', remainingCanvases.length)
  
  console.log('\n✅ Demo hoàn thành! Canvas store hoạt động tốt.')
}

// Auto-run demo nếu được import
if (typeof window !== 'undefined') {
  console.log('🚀 Canvas Store Demo sẵn sàng! Chạy demo() để test.')
}
