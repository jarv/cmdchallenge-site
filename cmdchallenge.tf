provider "aws" {
  region = "us-east-1"
  shared_credentials_file = "/home/jarv/.aws/credentials"
  profile = "cmdchallenge"
}

data "aws_region" "current" { current = true }
data "aws_caller_identity" "current" {}

data "archive_file" "lambda_runcmd_zip" {
    type        = "zip"
    source_dir  = "lambda_src/runcmd"
    output_path = "lambda-runcmd.zip"
}

resource "aws_lambda_function" "runcmd_lambda" {
  filename = "lambda-runcmd.zip"
  source_code_hash = "${data.archive_file.lambda_runcmd_zip.output_base64sha256}"
  function_name = "runcmd_lambda"
  role = "${aws_iam_role.runcmd_iam_role.arn}"
  description = "Lambda function for runcmd - Managed by Terraform"
  handler = "runcmd.handler"
  runtime = "python2.7"
  timeout = "20"
  environment {
    variables = {
      SUBMISSIONS_TABLE_NAME = "${aws_dynamodb_table.runcmd_submissions.name}"
      COMMANDS_TABLE_NAME = "${aws_dynamodb_table.runcmd_commands.name}"
    }
  }
}

data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "runcmd_policy_document" {
  statement {
    sid = "1"
    actions = [
      "logs:*"
    ]
    resources = [
      "arn:aws:logs:*:*:*"
    ]
  }
  statement {
    actions = [
      "dynamodb:*"
    ]
    resources = [
      "arn:aws:dynamodb:us-east-1:*:table/${aws_dynamodb_table.runcmd_submissions.name}"
    ]
  }
  statement {
    actions = [
      "dynamodb:*"
    ]
    resources = [
      "arn:aws:dynamodb:us-east-1:*:table/${aws_dynamodb_table.runcmd_commands.name}"
    ]
  }
  statement {
    actions = [
      "sns:*"
    ]
    resources = [
      "arn:aws:sns:*:*:*"
    ]
  }
}

resource "aws_iam_policy" "runcmd_iam_policy" {
  name   = "runcmd_iam_policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.runcmd_policy_document.json}"
}

resource "aws_iam_role" "runcmd_iam_role" {
  assume_role_policy = "${data.aws_iam_policy_document.lambda_assume_role_policy.json}"
}

resource "aws_iam_role_policy_attachment" "runcmd_iam_attach" {
    role       = "${aws_iam_role.runcmd_iam_role.name}"
    policy_arn = "${aws_iam_policy.runcmd_iam_policy.arn}"
}


resource "aws_dynamodb_table" "runcmd_submissions" {
  name           = "runcmd-submissions"
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
    Environment = "production"
  }
}

resource "aws_dynamodb_table" "runcmd_commands" {
  name           = "runcmd-commands"
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
    read_capacity      = 1
    projection_type    = "ALL"
  }

  tags {
    Name        = "dynamodb-table-commands"
    Environment = "production"
  }
}




# API Gateway
resource "aws_api_gateway_rest_api" "runcmd_api" {
  name = "runcmd_api"
}

resource "aws_api_gateway_method" "method" {
  rest_api_id   = "${aws_api_gateway_rest_api.runcmd_api.id}"
  resource_id   = "${aws_api_gateway_rest_api.runcmd_api.root_resource_id}"
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "integration" {
  depends_on              = ["aws_api_gateway_method.method"]
  rest_api_id             = "${aws_api_gateway_rest_api.runcmd_api.id}"
  resource_id             = "${aws_api_gateway_rest_api.runcmd_api.root_resource_id}"
  http_method             = "${aws_api_gateway_method.method.http_method}"
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${aws_lambda_function.runcmd_lambda.arn}/invocations"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.runcmd_lambda.arn}"
  principal     = "apigateway.amazonaws.com"
  source_arn = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_api_gateway_rest_api.runcmd_api.id}/*/${aws_api_gateway_method.method.http_method}/"
}

resource "aws_api_gateway_deployment" "runcmd_deploy" {
  depends_on = ["aws_api_gateway_integration.integration"]
  rest_api_id = "${aws_api_gateway_rest_api.runcmd_api.id}"
  stage_name = "prod"
}


