resource "aws_dynamodb_table" "runcmd_commands" {
  name           = "${terraform.env == "prod" ? "commands" : "runcmd-commands-${terraform.env}"}"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "id"

  attribute {
    name = "correct_length"
    type = "N"
  }

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "challenge_slug"
    type = "S"
  }

  global_secondary_index {
    name               = "challenge_slug-correct_length-index"
    hash_key           = "challenge_slug"
    range_key          = "correct_length"
    write_capacity     = 1
    read_capacity      = "${terraform.env == "prod" ? 20 : 1}"
    projection_type    = "ALL"
  }

  tags {
    Name        = "dynamodb-table-commands"
    Environment = "${terraform.env}"
  }
}
resource "aws_dynamodb_table" "runcmd_submissions" {
  name           = "${terraform.env == "prod" ? "submissions" : "runcmd-submissions-${terraform.env}"}"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "source_ip"
  range_key      = "create_time"
  attribute {
    name = "source_ip"
    type = "S"
  }

  attribute {
    name = "create_time"
    type = "N"
  }

  tags {
    Name        = "dynamodb-table-submissions"
    Environment = "${terraform.env}"
  }
}
output "submissions_table_name" { value = "${aws_dynamodb_table.runcmd_submissions.name}" }
output "commands_table_name" { value = "${aws_dynamodb_table.runcmd_commands.name}" }
