import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUploadFiles } from '@/hooks/use-upload-files'

// Helper to create mock File objects
function createMockFile(name: string, size: number = 1024, type: string = 'text/plain'): File {
  const content = new Array(size).fill('a').join('')
  return new File([content], name, { type })
}

describe('useUploadFiles', () => {
  describe('initialization', () => {
    it('should initialize with empty files array', () => {
      const { result } = renderHook(() => useUploadFiles())
      expect(result.current.control.files).toEqual([])
    })

    it('should return control object with all methods', () => {
      const { result } = renderHook(() => useUploadFiles())
      const { control } = result.current

      expect(control).toHaveProperty('files')
      expect(control).toHaveProperty('addFile')
      expect(control).toHaveProperty('removeFile')
      expect(control).toHaveProperty('clearFiles')
      expect(control).toHaveProperty('setFiles')
      expect(typeof control.addFile).toBe('function')
      expect(typeof control.removeFile).toBe('function')
      expect(typeof control.clearFiles).toBe('function')
      expect(typeof control.setFiles).toBe('function')
    })
  })

  describe('addFile', () => {
    it('should add a file to the files array', () => {
      const { result } = renderHook(() => useUploadFiles())
      const mockFile = createMockFile('test.txt')

      act(() => {
        result.current.control.addFile(mockFile)
      })

      expect(result.current.control.files).toHaveLength(1)
      expect(result.current.control.files[0].name).toBe('test.txt')
    })

    it('should not exceed maxFiles limit (default is 1)', () => {
      const { result } = renderHook(() => useUploadFiles())
      const file1 = createMockFile('file1.txt')
      const file2 = createMockFile('file2.txt')

      act(() => {
        result.current.control.addFile(file1)
        result.current.control.addFile(file2)
      })

      expect(result.current.control.files).toHaveLength(1)
      expect(result.current.control.files[0].name).toBe('file1.txt')
    })

    it('should respect custom maxFiles option', () => {
      const { result } = renderHook(() => useUploadFiles({ maxFiles: 3 }))
      const files = [
        createMockFile('file1.txt'),
        createMockFile('file2.txt'),
        createMockFile('file3.txt'),
        createMockFile('file4.txt'),
      ]

      act(() => {
        files.forEach(file => result.current.control.addFile(file))
      })

      expect(result.current.control.files).toHaveLength(3)
    })
  })

  describe('removeFile', () => {
    it('should remove a file by index', () => {
      const { result } = renderHook(() => useUploadFiles({ maxFiles: 3 }))
      const files = [
        createMockFile('file1.txt'),
        createMockFile('file2.txt'),
        createMockFile('file3.txt'),
      ]

      act(() => {
        files.forEach(file => result.current.control.addFile(file))
      })

      act(() => {
        result.current.control.removeFile(1)
      })

      expect(result.current.control.files).toHaveLength(2)
      expect(result.current.control.files[0].name).toBe('file1.txt')
      expect(result.current.control.files[1].name).toBe('file3.txt')
    })

    it('should handle removing first file', () => {
      const { result } = renderHook(() => useUploadFiles({ maxFiles: 2 }))
      const file1 = createMockFile('file1.txt')
      const file2 = createMockFile('file2.txt')

      act(() => {
        result.current.control.addFile(file1)
        result.current.control.addFile(file2)
      })

      act(() => {
        result.current.control.removeFile(0)
      })

      expect(result.current.control.files).toHaveLength(1)
      expect(result.current.control.files[0].name).toBe('file2.txt')
    })

    it('should handle removing last file', () => {
      const { result } = renderHook(() => useUploadFiles({ maxFiles: 2 }))
      const file1 = createMockFile('file1.txt')
      const file2 = createMockFile('file2.txt')

      act(() => {
        result.current.control.addFile(file1)
        result.current.control.addFile(file2)
      })

      act(() => {
        result.current.control.removeFile(1)
      })

      expect(result.current.control.files).toHaveLength(1)
      expect(result.current.control.files[0].name).toBe('file1.txt')
    })

    it('should handle invalid index gracefully', () => {
      const { result } = renderHook(() => useUploadFiles())
      const file = createMockFile('file.txt')

      act(() => {
        result.current.control.addFile(file)
      })

      act(() => {
        result.current.control.removeFile(10)
      })

      expect(result.current.control.files).toHaveLength(1)
    })
  })

  describe('clearFiles', () => {
    it('should remove all files', () => {
      const { result } = renderHook(() => useUploadFiles({ maxFiles: 3 }))
      const files = [
        createMockFile('file1.txt'),
        createMockFile('file2.txt'),
        createMockFile('file3.txt'),
      ]

      act(() => {
        files.forEach(file => result.current.control.addFile(file))
      })

      expect(result.current.control.files).toHaveLength(3)

      act(() => {
        result.current.control.clearFiles()
      })

      expect(result.current.control.files).toHaveLength(0)
    })

    it('should work on empty files array', () => {
      const { result } = renderHook(() => useUploadFiles())

      act(() => {
        result.current.control.clearFiles()
      })

      expect(result.current.control.files).toHaveLength(0)
    })
  })

  describe('setFiles', () => {
    it('should replace all files with new array', () => {
      const { result } = renderHook(() => useUploadFiles({ maxFiles: 5 }))
      const file1 = createMockFile('old.txt')

      act(() => {
        result.current.control.addFile(file1)
      })

      const newFiles = [
        createMockFile('new1.txt'),
        createMockFile('new2.txt'),
      ]

      act(() => {
        result.current.control.setFiles(newFiles)
      })

      expect(result.current.control.files).toHaveLength(2)
      expect(result.current.control.files[0].name).toBe('new1.txt')
      expect(result.current.control.files[1].name).toBe('new2.txt')
    })

    it('should set empty array', () => {
      const { result } = renderHook(() => useUploadFiles())
      const file = createMockFile('file.txt')

      act(() => {
        result.current.control.addFile(file)
      })

      act(() => {
        result.current.control.setFiles([])
      })

      expect(result.current.control.files).toHaveLength(0)
    })
  })
})
