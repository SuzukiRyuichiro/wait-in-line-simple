// Countdown for the party that is currently dining
const countdown = document.querySelector("[data-ends-at]")

if (countdown) {
  const endsAt = new Date(countdown.dataset.endsAt)

  const tick = () => {
    const secondsLeft = Math.max(Math.ceil((endsAt - new Date()) / 1000), 0)
    countdown.textContent = secondsLeft
    if (secondsLeft === 0) clearInterval(timer)
  }

  const timer = setInterval(tick, 1000)
  tick()
}
