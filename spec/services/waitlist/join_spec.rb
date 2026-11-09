require "rails_helper"

RSpec.describe Waitlist::Join do
  let(:params) { { name: "Aiko", email: "aiko@example.com", size: 2 } }

  it "adds a new party to the end of the line" do
    result = described_class.call(params)

    expect(result.status).to eq(:joined)
    expect(result.party).to be_persisted
    expect(result.party).to have_attributes(status: "waiting", active: true)
    expect(result.party.token).to be_present
  end

  it "returns the invalid party with errors and saves nothing" do
    result = described_class.call(params.merge(name: "", size: 0))

    expect(result.status).to eq(:invalid)
    expect(result.party.errors).to include(:name, :size)
    expect(Party.count).to eq(0)
  end

  it "rejects a party bigger than the restaurant, since it could never be seated" do
    result = described_class.call(params.merge(size: capacity + 1))

    expect(result.status).to eq(:invalid)
  end

  describe "duplicates" do
    let!(:existing) { described_class.call(params).party }

    it "returns the party already in line instead of creating a second one" do
      result = described_class.call(params)

      expect(result.status).to eq(:duplicate)
      expect(result.party).to eq(existing)
      expect(Party.count).to eq(1)
    end

    it "treats the email case- and whitespace-insensitively" do
      result = described_class.call(params.merge(email: "  AIKO@Example.com "))

      expect(result.status).to eq(:duplicate)
      expect(result.party).to eq(existing)
    end

    it "counts ready and seated parties as still in line" do
      existing.update!(status: "seated")

      expect(described_class.call(params).status).to eq(:duplicate)
    end

    it "lets the same email join again once the previous visit is completed" do
      existing.update!(status: "completed")

      result = described_class.call(params)

      expect(result.status).to eq(:joined)
      expect(result.party).not_to eq(existing)
    end
  end

  it "creates exactly one party when the same email joins from several requests at once" do
    results = Array.new(5) { Thread.new { described_class.call(params) } }.map(&:value)

    expect(Party.count).to eq(1)
    expect(results.map(&:status).tally).to eq(joined: 1, duplicate: 4)
    expect(results.map(&:party).uniq).to eq([ Party.first ])
  end
end
