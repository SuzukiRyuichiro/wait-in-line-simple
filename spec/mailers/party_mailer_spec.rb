require "rails_helper"

RSpec.describe PartyMailer, type: :mailer do
  describe "table_ready" do
    let(:mail) { PartyMailer.table_ready }

    it "renders the headers" do
      expect(mail.subject).to eq("Table ready")
      expect(mail.to).to eq(["to@example.org"])
      expect(mail.from).to eq(["from@example.com"])
    end

    it "renders the body" do
      expect(mail.body.encoded).to match("Hi")
    end
  end

end
