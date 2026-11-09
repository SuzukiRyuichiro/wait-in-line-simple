class CheckInsController < ApplicationController
  def create
    # Find the party
    @party = Party.find_by(token: params[:party_token])
    result = Waitlist::CheckIn.call(@party)

    case result.status
    when :checked_in
      redirect_to party_path(result.party), notice: "You're checked in. Have a nice meal", status: :see_other
    when :already_seated
      redirect_to party_path(result.party), notice: "You're already checked in.", status: :see_other
    else
      redirect_to party_path(result.party), alert: "Table isn't ready to check in.", status: :see_other
    end
  end
end
