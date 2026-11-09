require "rails_helper"

RSpec.describe Waitlist::Tick do
  let(:now) { Time.zone.parse("2026-01-01 19:00:00") }
  let(:emails) { ActionMailer::Base.deliveries }

  before { emails.clear }

  def tick(at: now) = described_class.call(now: at)
  def statuses(*parties) = parties.map { |party| party.reload.status }

  describe "calling parties from the line" do
    it "makes the front party ready and emails them" do
      party = create_party(size: 2)

      tick

      expect(party.reload).to be_ready
      expect(emails.map(&:to)).to eq([ [ party.email ] ])
    end

    it "calls as many parties as fit, in the order they joined" do
      first  = create_party(size: 4)
      second = create_party(size: 6)
      third  = create_party(size: 1)

      tick

      expect(statuses(first, second, third)).to eq(%w[ready ready waiting])
    end

    it "fills the restaurant exactly to capacity" do
      parties = Array.new(capacity) { create_party(size: 1) }

      tick

      expect(parties.map { |party| party.reload.status }.uniq).to eq([ "ready" ])
    end

    it "never lets a smaller party skip the front party that doesn't fit yet" do
      create_party(size: 8, status: "seated", service_ends_at: now + 60)
      front  = create_party(size: 4) # needs 4, only 2 free
      behind = create_party(size: 2) # would fit, but must wait its turn

      tick

      expect(statuses(front, behind)).to eq(%w[waiting waiting])
      expect(emails).to be_empty
    end

    it "counts ready parties as holding their seats, even before they check in" do
      create_party(size: 6, status: "ready")
      waiting = create_party(size: 6)

      tick

      expect(waiting.reload).to be_waiting
    end

    it "breaks a tie in join time by _id" do
      joined_at = now - 60
      first  = create_party(size: 6, created_at: joined_at)
      second = create_party(size: 6, created_at: joined_at)

      tick

      expect(statuses(first, second)).to eq(%w[ready waiting])
    end

    it "doesn't email a party again on later ticks" do
      create_party(size: 2)

      tick
      tick(at: now + 1)

      expect(emails.size).to eq(1)
    end

    it "still calls the party when the email fails to send" do
      party = create_party(size: 2)
      allow(PartyMailer).to receive(:table_ready).and_raise(Net::SMTPServerBusy)

      expect { tick }.not_to raise_error
      expect(party.reload).to be_ready
    end
  end

  describe "finishing service" do
    let!(:seated) { create_party(size: 10, status: "seated", seated_at: now - 30, service_ends_at: now) }

    it "keeps the party seated until the service time is over" do
      tick(at: now - 1)

      expect(seated.reload).to be_seated
    end

    it "completes the party once the service time is over, and takes it out of the line" do
      tick(at: now)

      expect(seated.reload).to have_attributes(status: "completed", active: false)
    end

    it "gives the freed seats to the next party in the same tick" do
      waiting = create_party(size: 10)

      tick(at: now - 1)
      expect(waiting.reload).to be_waiting

      tick(at: now)
      expect(waiting.reload).to be_ready
    end
  end
end
