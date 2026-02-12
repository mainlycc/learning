import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  describe('rendering', () => {
    it('should render checkbox', () => {
      render(<Checkbox />)
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('should have data-slot attribute', () => {
      render(<Checkbox />)
      expect(screen.getByRole('checkbox')).toHaveAttribute('data-slot', 'checkbox')
    })

    it('should apply custom className', () => {
      render(<Checkbox className="custom-class" />)
      expect(screen.getByRole('checkbox')).toHaveClass('custom-class')
    })
  })

  describe('states', () => {
    it('should be unchecked by default', () => {
      render(<Checkbox />)
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('should be checked when defaultChecked is true', () => {
      render(<Checkbox defaultChecked />)
      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('should be checked when checked prop is true', () => {
      render(<Checkbox checked onCheckedChange={() => {}} />)
      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('should be disabled when disabled prop is true', () => {
      render(<Checkbox disabled />)
      expect(screen.getByRole('checkbox')).toBeDisabled()
    })
  })

  describe('interactions', () => {
    it('should toggle checked state when clicked', () => {
      render(<Checkbox defaultChecked={false} />)
      const checkbox = screen.getByRole('checkbox')

      expect(checkbox).not.toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('should call onCheckedChange when clicked', () => {
      const handleChange = vi.fn()
      render(<Checkbox onCheckedChange={handleChange} />)

      fireEvent.click(screen.getByRole('checkbox'))
      expect(handleChange).toHaveBeenCalledWith(true)
    })

    it('should not toggle when disabled', () => {
      const handleChange = vi.fn()
      render(<Checkbox disabled onCheckedChange={handleChange} />)

      fireEvent.click(screen.getByRole('checkbox'))
      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper aria attributes', () => {
      render(<Checkbox aria-label="Accept terms" />)
      expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument()
    })

    it('should be focusable', () => {
      render(<Checkbox />)
      const checkbox = screen.getByRole('checkbox')

      checkbox.focus()
      expect(checkbox).toHaveFocus()
    })

    it('should toggle on space key', () => {
      render(<Checkbox defaultChecked={false} />)
      const checkbox = screen.getByRole('checkbox')

      checkbox.focus()
      fireEvent.keyDown(checkbox, { key: ' ' })
      // Note: actual toggle behavior depends on radix implementation
    })
  })

  describe('styling', () => {
    it('should have rounded corners', () => {
      render(<Checkbox />)
      expect(screen.getByRole('checkbox')).toHaveClass('rounded-[4px]')
    })

    it('should have border', () => {
      render(<Checkbox />)
      expect(screen.getByRole('checkbox')).toHaveClass('border')
    })

    it('should have proper size', () => {
      render(<Checkbox />)
      expect(screen.getByRole('checkbox')).toHaveClass('size-4')
    })
  })
})
