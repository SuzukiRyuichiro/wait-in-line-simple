class PartyMailer < ApplicationMailer
  def table_ready(party)
    @party = party

    mail to: party.email, subject: 'Your table is ready'
  end
end
