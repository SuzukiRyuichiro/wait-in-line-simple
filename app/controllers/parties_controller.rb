class PartiesController < ApplicationController
  def new
    active_party = Party.where(token: cookies.signed[:party_token], active: true).first if cookies.signed[:party_token]
    return redirect_to party_path(active_party) if active_party

    @party = Party.new(size: 2) # just some default value
  end

  def create
    result = Waitlist::Join.call(party_params)

    case result.status
    when :invalid
      @party = result.party
      render :new, status: :unprocessable_content
    when :duplicate
      remember_party(result.party)
      redirect_to party_path(result.party), notice: "You are already in the queue", status: :see_other
    else
      remember_party(result.party)
      redirect_to party_path(result.party), status: :see_other
    end
  end

  def show
    @party = Party.find_by(token: params[:token])
  end

  private

  def remember_party(party)
    cookies.signed.permanent[:party_token] = { value: party.token, httponly: true }
  end

  def party_params
    params.expect(party: [ :name, :size, :email ])
  end
end
