variable "submissions_table_name" {}
variable "commands_table_name" {}
variable "ec2_public_dns" {}
variable "code_base64" {}
variable "code_fname" {}
resource "aws_lambda_function" "runcmd_lambda" {
  filename = "${var.code_fname}"
  source_code_hash = "${var.code_base64}"
  function_name = "runcmd-lambda-${terraform.env}"
  role = "${aws_iam_role.runcmd_iam_role.arn}"
  description = "Lambda function for runcmd - Managed by Terraform"
  handler = "runcmd.handler"
  runtime = "python2.7"
  timeout = "20"
  environment {
    variables = {
      SUBMISSIONS_TABLE_NAME = "${var.submissions_table_name}"
      COMMANDS_TABLE_NAME = "${var.commands_table_name}"
      DOCKER_EC2_DNS = "${var.ec2_public_dns}"
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

resource "aws_iam_policy" "runcmd_iam_policy" {
  name   = "runcmd_iam_policy-${terraform.env}"
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
      "arn:aws:dynamodb:us-east-1:*:table/${var.submissions_table_name}"
    ]
  }
  statement {
    actions = [
      "dynamodb:*"
    ]
    resources = [
      "arn:aws:dynamodb:us-east-1:*:table/${var.commands_table_name}"
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

output "arn" { value = "${aws_lambda_function.runcmd_lambda.arn}" }
