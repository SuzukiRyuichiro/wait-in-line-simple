const tick = () => {
  const countdown = document.querySelector("[data-ends-at]")
  if (!countdown) return

  const secondsLeft = Math.max(Math.ceil((new Date(countdown.dataset.endsAt) - new Date()) / 1000), 0)
  countdown.textContent = secondsLeft
}

setInterval(tick, 1000)

// Refresh the status block every 3 seconds
const statusBox = document.querySelector("[data-status-url]")

if (statusBox) {
  setInterval(async () => {
    const response = await fetch(statusBox.dataset.statusUrl)
    if (!response.ok) return
    statusBox.innerHTML = await response.text()
    tick()
  }, 3000)
}
