# Preview all emails at http://localhost:3000/rails/mailers/party_mailer
class PartyMailerPreview < ActionMailer::Preview
  # Preview this email at http://localhost:3000/rails/mailers/party_mailer/table_ready
  def table_ready
    PartyMailer.table_ready(Party.new(name: "Aiko", email: "aiko@example.com", size: 2))
  end
end
