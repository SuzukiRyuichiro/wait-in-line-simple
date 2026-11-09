class StatusesController < ApplicationController
  # Renders just the status block of a party's page, so the page can refresh it in place
  def show
    party = Party.find_by(token: params[:party_token])
    render partial: "parties/status", locals: { party: party }
  end
end
