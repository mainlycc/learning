import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card'

describe('Card', () => {
  it('should render card with children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should have data-slot attribute', () => {
    render(<Card>Test</Card>)
    expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'card')
  })

  it('should apply custom className', () => {
    render(<Card className="custom-class">Test</Card>)
    expect(screen.getByText('Test')).toHaveClass('custom-class')
  })

  it('should have default card styles', () => {
    render(<Card>Test</Card>)
    const card = screen.getByText('Test')
    expect(card).toHaveClass('bg-card')
    expect(card).toHaveClass('rounded-xl')
    expect(card).toHaveClass('border')
  })
})

describe('CardHeader', () => {
  it('should render header with children', () => {
    render(<CardHeader>Header content</CardHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })

  it('should have data-slot attribute', () => {
    render(<CardHeader>Test</CardHeader>)
    expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'card-header')
  })

  it('should apply custom className', () => {
    render(<CardHeader className="custom-class">Test</CardHeader>)
    expect(screen.getByText('Test')).toHaveClass('custom-class')
  })
})

describe('CardTitle', () => {
  it('should render title with children', () => {
    render(<CardTitle>Title text</CardTitle>)
    expect(screen.getByText('Title text')).toBeInTheDocument()
  })

  it('should have data-slot attribute', () => {
    render(<CardTitle>Test</CardTitle>)
    expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'card-title')
  })

  it('should have font-semibold class', () => {
    render(<CardTitle>Test</CardTitle>)
    expect(screen.getByText('Test')).toHaveClass('font-semibold')
  })
})

describe('CardDescription', () => {
  it('should render description with children', () => {
    render(<CardDescription>Description text</CardDescription>)
    expect(screen.getByText('Description text')).toBeInTheDocument()
  })

  it('should have data-slot attribute', () => {
    render(<CardDescription>Test</CardDescription>)
    expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'card-description')
  })

  it('should have muted text color', () => {
    render(<CardDescription>Test</CardDescription>)
    expect(screen.getByText('Test')).toHaveClass('text-muted-foreground')
  })
})

describe('CardContent', () => {
  it('should render content with children', () => {
    render(<CardContent>Content text</CardContent>)
    expect(screen.getByText('Content text')).toBeInTheDocument()
  })

  it('should have data-slot attribute', () => {
    render(<CardContent>Test</CardContent>)
    expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'card-content')
  })

  it('should have padding class', () => {
    render(<CardContent>Test</CardContent>)
    expect(screen.getByText('Test')).toHaveClass('px-6')
  })
})

describe('CardFooter', () => {
  it('should render footer with children', () => {
    render(<CardFooter>Footer content</CardFooter>)
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('should have data-slot attribute', () => {
    render(<CardFooter>Test</CardFooter>)
    expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'card-footer')
  })

  it('should have flex layout', () => {
    render(<CardFooter>Test</CardFooter>)
    expect(screen.getByText('Test')).toHaveClass('flex')
  })
})

describe('CardAction', () => {
  it('should render action with children', () => {
    render(<CardAction>Action button</CardAction>)
    expect(screen.getByText('Action button')).toBeInTheDocument()
  })

  it('should have data-slot attribute', () => {
    render(<CardAction>Test</CardAction>)
    expect(screen.getByText('Test')).toHaveAttribute('data-slot', 'card-action')
  })
})

describe('Card composition', () => {
  it('should render full card with all parts', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description goes here</CardDescription>
          <CardAction>
            <button>Action</button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Main content</p>
        </CardContent>
        <CardFooter>
          <button>Footer button</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card description goes here')).toBeInTheDocument()
    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Footer button' })).toBeInTheDocument()
  })
})
