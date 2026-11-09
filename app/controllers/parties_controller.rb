class PartiesController < ApplicationController
  def new
    @party = Party.new(size: 2) # just some default value
  end

  def create
    @party = Party.new(party_params)
    @party.save

    redirect_to party_path(@party)
  end

  def show
    @party = Party.find_by(token: params[:token])
  end

  private

  def party_params
    params.expect(party: [ :name, :size, :email ])
  end
end
