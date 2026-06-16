import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Status from '../pages/Status'

function renderStatus() {
  return render(
    <BrowserRouter>
      <Status />
    </BrowserRouter>
  )
}

describe('Job Submit page', () => {
  it('renders the submission form', () => {
    renderStatus()
    expect(screen.getByLabelText(/Enter your email address/)).toBeInTheDocument()
  })

  it('renders a search button', () => {
    renderStatus()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

})
