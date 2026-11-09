module Waitlist
  class CheckIn
    Result = Data.define(:status, :party)

    def self.call(party, now: Time.current)
      new(party, now).call
    end

    def initialize(party, now)
      @party = party
      @now = now
    end

    def call
      updated = Party.where(_id: @party.id, status: "ready").find_one_and_update(
        { "$set" => { status: "seated", seated_at: @now, service_ends_at: @now + service_time, updated_at: @now } },
        return_document: :after
      )
      return Result.new(:checked_in, updated) if updated

      @party.reload
      Result.new(@party.seated? ? :already_seated : :not_ready, @party)
    end

    private

    def service_time
      @party.size * Rails.configuration.x.waitlist.service_seconds_per_person
    end
  end
end
