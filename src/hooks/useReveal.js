import { useEffect, useRef } from 'react'

export function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    )
    if (ref.current) {
      ref.current.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => observer.observe(el))
    }
    return () => observer.disconnect()
  }, [])
  return ref
}
