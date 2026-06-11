/**
 * 拖拽排序组合式函数
 * 提供拖拽排序的完整逻辑
 */

import { ref, shallowRef } from 'vue'

export interface DragItem<T = unknown> {
  index: number
  data: T
}

export function useDragSort<T = unknown>() {
  const draggingIndex = ref<number | null>(null)
  const dragOverIndex = ref<number | null>(null)
  const items = shallowRef<T[]>([])

  /**
   * 初始化数据
   */
  const setItems = (newItems: T[]) => {
    items.value = [...newItems]
  }

  /**
   * 开始拖拽
   */
  const handleDragStart = (event: DragEvent, index: number) => {
    draggingIndex.value = index

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(index))

      // 设置拖拽时的样式
      if (event.target instanceof HTMLElement) {
        event.target.style.opacity = '0.5'
      }
    }
  }

  /**
   * 拖拽进入目标
   */
  const handleDragEnter = (event: DragEvent, index: number) => {
    event.preventDefault()

    if (draggingIndex.value !== null && draggingIndex.value !== index) {
      dragOverIndex.value = index
    }
  }

  /**
   * 拖拽经过目标
   */
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  /**
   * 离开拖拽目标
   */
  const handleDragLeave = () => {
    dragOverIndex.value = null
  }

  /**
   * 放置
   */
  const handleDrop = (event: DragEvent, targetIndex: number) => {
    event.preventDefault()

    if (draggingIndex.value === null || draggingIndex.value === targetIndex) {
      return
    }

    // 执行移动
    const newItems = [...items.value]
    const draggedItem = newItems[draggingIndex.value]

    // 删除原位置的项
    newItems.splice(draggingIndex.value, 1)

    // 在新位置插入
    newItems.splice(targetIndex, 0, draggedItem)

    items.value = newItems

    // 重置状态
    dragOverIndex.value = null
  }

  /**
   * 拖拽结束
   */
  const handleDragEnd = (event: DragEvent) => {
    // 恢复样式
    if (event.target instanceof HTMLElement) {
      event.target.style.opacity = '1'
    }

    draggingIndex.value = null
    dragOverIndex.value = null
  }

  /**
   * 获取当前项列表
   */
  const getItems = (): T[] => {
    return items.value
  }

  /**
   * 判断是否正在拖拽
   */
  const isDragging = (index: number): boolean => {
    return draggingIndex.value === index
  }

  /**
   * 判断是否是拖拽目标
   */
  const isDragOver = (index: number): boolean => {
    return dragOverIndex.value === index
  }

  /**
   * 手动移动项
   */
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return
    }

    const newItems = [...items.value]
    const item = newItems[fromIndex]

    newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, item)

    items.value = newItems
  }

  /**
   * 移除项
   */
  const removeItem = (index: number) => {
    items.value = items.value.filter((_, i) => i !== index)
  }

  /**
   * 添加项
   */
  const addItem = (item: T, index?: number) => {
    if (index !== undefined && index >= 0 && index <= items.value.length) {
      items.value.splice(index, 0, item)
    } else {
      items.value.push(item)
    }
  }

  /**
   * 清空列表
   */
  const clearItems = () => {
    items.value = []
  }

  return {
    items,
    draggingIndex,
    dragOverIndex,
    setItems,
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    getItems,
    isDragging,
    isDragOver,
    moveItem,
    removeItem,
    addItem,
    clearItems,
  }
}
