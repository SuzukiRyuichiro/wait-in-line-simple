module Waitlist
  class Tick
    def self.call(now: Time.current)
      new(now).call
    end

    def initialize(now)
      @now = now
    end

    def call
      # On each tick, we would have to determine who have ended the service
      # Then, we would have to determine who would be seated from the waiting line
      #
      finish_service
      ready_next_parties
    end

    private

    def finish_service
      Party.seated.where(:service_ends_at.lte => @now).update_all(status: "completed", active: false)
    end

    def ready_next_parties
      # Ready parties from the front of the line while they fit.
      # Seats in use = sum of sizes of ready + seated parties (ready parties hold their seats, like reserved seats).
      # Stop making parties ready at the first waiting party that doesn't fit. Nobody behind it
      # skips ahead, even a smaller party that would fit (there's technically 3 seats unoccupied in the restaurant
      # there's a party of 1 2nd in line, but the 1st in line party is 3 people and just haven't pressed check-in)

      Party.waiting.in_line_order.each do |party|
        seats_in_use = Party.in(status: [ "ready", "seated" ]).sum(:size)
        if seats_in_use + party.size <= Rails.configuration.x.waitlist.capacity
          party.update!(status: "ready")
          notify(party)
        else
          return
        end
      end
    end

    def notify(party)
      PartyMailer.table_ready(party).deliver_now # don't have the job handler for simplicity so
    rescue StandardError => e
      # even when email fails to send, they are ready anyways so rescue. worst case, they can refresh the show page and check in
      Rails.logger.error("table_ready email failed for party #{party.id}: #{e.message}")
    end
  end
end
