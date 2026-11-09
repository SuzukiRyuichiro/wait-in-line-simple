require "rails_helper"

RSpec.describe Waitlist::CheckIn do
  let(:now) { Time.zone.parse("2026-01-01 19:00:00") }

  it "seats a ready party and starts the service timer (size × seconds per person)" do
    party = create_party(size: 4, status: "ready")

    result = described_class.call(party, now:)

    expect(result.status).to eq(:checked_in)
    expect(result.party).to have_attributes(
      status: "seated",
      seated_at: now,
      service_ends_at: now + (4 * seconds_per_person),
    )
    expect(party.reload).to be_seated
  end

  it "refuses a party that is still waiting" do
    party = create_party(status: "waiting")

    result = described_class.call(party, now:)

    expect(result.status).to eq(:not_ready)
    expect(party.reload).to be_waiting
  end

  it "refuses a party that has already finished" do
    party = create_party(status: "completed")

    expect(described_class.call(party, now:).status).to eq(:not_ready)
  end

  it "doesn't restart the timer when an already seated party checks in again" do
    party = create_party(status: "ready")
    described_class.call(party, now:)

    result = described_class.call(party, now: now + 5)

    expect(result.status).to eq(:already_seated)
    expect(party.reload.service_ends_at).to eq(now + (party.size * seconds_per_person))
  end

  it "checks in only once when the button is pressed from several places at once" do
    party = create_party(status: "ready")

    # Each thread has its own copy of the party, like separate requests do.
    results = Array.new(5) { Thread.new { described_class.call(Party.find(party.id), now:) } }.map(&:value)

    expect(results.map(&:status).tally).to eq(checked_in: 1, already_seated: 4)
  end
end
