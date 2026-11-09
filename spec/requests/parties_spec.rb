require 'rails_helper'

RSpec.describe "Parties", type: :request do
  describe "GET /new" do
    it "returns http success" do
      get "/parties/new"
      expect(response).to have_http_status(:success)
    end
  end
end
