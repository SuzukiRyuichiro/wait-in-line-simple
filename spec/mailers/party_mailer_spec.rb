require "rails_helper"

RSpec.describe PartyMailer, type: :mailer do
  describe "table_ready" do
    let(:party) { create_party(status: "ready") }
    let(:mail) { described_class.table_ready(party) }

    it "is sent to the party" do
      expect(mail.subject).to eq("Your table is ready")
      expect(mail.to).to eq([ party.email ])
    end

    it "links to the party's page so they can check in" do
      expect(mail.text_part.body.to_s).to include("/parties/#{party.token}")
      expect(mail.html_part.body.to_s).to include("/parties/#{party.token}")
    end
  end
end
