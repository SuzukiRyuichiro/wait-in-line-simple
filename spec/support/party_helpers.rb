module PartyHelpers
  # Parties are created one after another, so created_at (and _id) follow the order of the calls,
  # which is the order of the line.
  def create_party(size: 2, status: "waiting", **attrs)
    @party_counter = (@party_counter || 0) + 1
    Party.create!(name: "Party #{@party_counter}", email: "party#{@party_counter}@example.com", size:, status:, **attrs)
  end

  def capacity = Rails.configuration.x.waitlist.capacity
  def seconds_per_person = Rails.configuration.x.waitlist.service_seconds_per_person
end
