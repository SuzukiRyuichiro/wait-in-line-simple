class PartiesController < ApplicationController
  def new
    @party = Party.new(size: 2) # just some default value
  end

  def create
    result = Waitlist::Join.call(party_params)

    case result.status
    when :invalid
      @party = result.party
      render :new, status: :unprocessable_content
    when :duplicate
      redirect_to party_path(result.party), notice: "You are already in the queue", status: :see_other
    else
      redirect_to party_path(result.party), status: :see_other
    end
  end

  def show
    @party = Party.find_by(token: params[:token])

    respond_to do |format|
      format.html
      format.json { render json: { status: @party.status, position: (@party.position if @party.waiting?) } }
    end
  end

  private

  def party_params
    params.expect(party: [ :name, :size, :email ])
  end
end
