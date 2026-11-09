class Party
  include Mongoid::Document
  include Mongoid::Timestamps

  STATUSES = %w[waiting ready seated completed].freeze
  ACTIVE_STATUSES = %w[waiting ready seated].freeze

  field :name, type: String
  field :email, type: String
  field :size, type: Integer
  field :status, type: String, default: "waiting"
  field :active, type: Mongoid::Boolean, default: true
  field :token, type: String, default: -> { SecureRandom.urlsafe_base64(16) }
  field :service_ends_at, type: Time
  field :seated_at, type: Time

  index({ token: 1 }, unique: true)
  index({ email: 1 }, unique: true, partial_filter_expression: { active: true })

  before_validation do
    self.email  = email.to_s.strip.downcase
    self.active = ACTIVE_STATUSES.include?(status) # sync the status and activeness
  end

  validates :name, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :size, numericality: { only_integer: true, in: 1..10 } # hardcode range
  validates :status, inclusion: { in: STATUSES }

  scope :waiting, -> { where(status: "waiting") }
  scope :seated, -> { where(status: "seated") }
  scope :in_line_order, -> { order_by(created_at: :asc, _id: :asc) } # rare case but ID is just a tie breaker

  def to_param
    token
  end

  def position
    # Count parties that are waiting, where
    parties_ahead = Party.waiting.any_of(
      { :created_at.lt => created_at },
      { created_at: created_at, :_id.lt => id } # This is very rare in reality cuz they have to be created in the same milliseconds. just a tie breaker
    ).count

    parties_ahead + 1
  end

  # wanted to define AR enum like methods
  def waiting?   = status == "waiting"
  def ready?     = status == "ready"
  def seated?    = status == "seated"
  def completed? = status == "completed"
end
