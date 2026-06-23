import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Request from '../pages/Request'

function renderRequest() {
  return render(
    <BrowserRouter>
      <Request />
    </BrowserRouter>
  )
}

describe('Job Submit page', () => {
  it('renders the submission form', () => {
    renderRequest()
    expect(screen.getByText('Submit Job')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Job Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Your Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderRequest()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows file upload area', () => {
    renderRequest()
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument()
  })

  it('shows dimension field with unit selector', () => {
    renderRequest()
    expect(screen.getByText(/max\.? overall dimension/i)).toBeInTheDocument()
    expect(screen.getByText('mm')).toBeInTheDocument()
    expect(screen.getByText('in')).toBeInTheDocument()
  })
})
