import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should have data-slot attribute', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'badge')
    })

    it('should apply custom className', () => {
      render(<Badge className="custom-class">Test</Badge>)
      expect(screen.getByText('Test')).toHaveClass('custom-class')
    })

    it('should render as span by default', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test').tagName).toBe('SPAN')
    })
  })

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Badge variant="default">Default</Badge>)
      const badge = screen.getByText('Default')
      expect(badge).toHaveClass('bg-primary')
      expect(badge).toHaveClass('text-primary-foreground')
    })

    it('should render secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>)
      const badge = screen.getByText('Secondary')
      expect(badge).toHaveClass('bg-secondary')
      expect(badge).toHaveClass('text-secondary-foreground')
    })

    it('should render destructive variant', () => {
      render(<Badge variant="destructive">Error</Badge>)
      const badge = screen.getByText('Error')
      expect(badge).toHaveClass('bg-destructive')
    })

    it('should render outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>)
      const badge = screen.getByText('Outline')
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('asChild', () => {
    it('should render as child element when asChild is true', () => {
      render(
        <Badge asChild>
          <a href="/link">Link Badge</a>
        </Badge>
      )

      const link = screen.getByRole('link', { name: 'Link Badge' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/link')
    })
  })

  describe('styling', () => {
    it('should have rounded corners', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test')).toHaveClass('rounded-md')
    })

    it('should have inline-flex display', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test')).toHaveClass('inline-flex')
    })

    it('should have proper font size', () => {
      render(<Badge>Test</Badge>)
      expect(screen.getByText('Test')).toHaveClass('text-xs')
    })
  })
})
