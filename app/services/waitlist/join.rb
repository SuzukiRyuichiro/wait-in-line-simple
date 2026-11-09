# This service will be called to join (create) a party
# Happy path would create the party and return the party instance
# If it is called on the same email (dup error), it would return the party that already is in the queue
# If it it invalid and fails to create, the controller can re-render the form with the erro

module Waitlist
  class Join
    DUPLICATE_KEY = 11000 # Mongo's error code when rejecting dup index

    Result = Data.define(:status, :party)

    def self.call(params)
      new(params).call
    end

    def initialize(params)
      @party = Party.new(params)
    end

    def call
      return Result.new(:invalid, @party) unless @party.save

      Result.new(:joined, @party)
    rescue Mongo::Error::OperationFailure => e
      raise unless e.code == DUPLICATE_KEY

      Result.new(:duplicate, Party.find_by(email: @party.email, active: true))
    end
  end
end
