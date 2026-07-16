$env:HMS_POSTGRES_HOST = "localhost"
$env:HMS_POSTGRES_PORT = "5432"
$env:HMS_POSTGRES_USER = "postgres"
$env:HMS_POSTGRES_PASSWORD = "replace-with-your-postgres-password"

$env:Security__Jwt__SigningKey = "replace-with-at-least-32-random-characters"
$env:Seed__DefaultPassword = "replace-with-a-local-dev-password"

# Optional local RabbitMQ configuration. Leave unset when RabbitMQ is not running locally.
# $env:HMS_RABBITMQ_HOST = "localhost"
# $env:HMS_RABBITMQ_PORT = "5672"
# $env:HMS_RABBITMQ_USERNAME = "replace-with-rabbitmq-user"
# $env:HMS_RABBITMQ_PASSWORD = "replace-with-rabbitmq-password"
