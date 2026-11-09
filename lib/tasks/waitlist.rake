namespace :waitlist do
  desc "Run the tick every second"
  task tick_forever: :environment do
    loop do
      # Settle the queue
      Waitlist::Tick.call
    rescue StandardError => e
      # Single failure should not let the tick stop
      Rails.logger.error(e.full_message)
    ensure
      sleep 1
    end
  end
end
