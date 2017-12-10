variable "submissions_table_name" {}
variable "commands_table_name" {}
variable "code_base64" {}
variable "code_fname" {}
variable "ws_name" {}
variable "bucket_name" {}
variable "count" {}

resource "aws_cloudwatch_event_rule" "every_one_day" {
  count               = "${var.count}"
  name                = "runcmd-lambda-cron-every-one-day-${var.ws_name}-${count.index}"
  description         = "Fires every one day"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "runcmd_lambda_cron_every_one_day" {
  count     = "${var.count}"
  rule      = "${aws_cloudwatch_event_rule.every_one_day.*.name[count.index]}"
  target_id = "runcmd_lambda_cron"
  arn       = "${aws_lambda_function.runcmd_lambda_cron.*.arn[count.index]}"
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_runcmd_lambda_cron" {
  count         = "${var.count}"
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.runcmd_lambda_cron.*.function_name[count.index]}"
  principal     = "events.amazonaws.com"
  source_arn    = "${aws_cloudwatch_event_rule.every_one_day.*.arn[count.index]}"
}

resource "aws_lambda_function" "runcmd_lambda_cron" {
  count            = "${var.count}"
  filename         = "${var.code_fname}"
  source_code_hash = "${var.code_base64}"
  function_name    = "runcmd-lambda-cron-${var.ws_name}-${count.index}"
  role             = "${aws_iam_role.runcmd_iam_role.arn}"
  description      = "Lambda cron function for runcmd - Managed by Terraform"
  handler          = "runcmd_cron.handler"
  runtime          = "python2.7"
  timeout          = "300"

  environment {
    variables = {
      SUBMISSIONS_TABLE_NAME = "${var.submissions_table_name}"
      COMMANDS_TABLE_NAME    = "${var.commands_table_name}"
      BUCKET_NAME            = "${var.bucket_name}"
      COUNT_INDEX            = "${count.index}"
      COUNT                  = "${var.count}"
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
  name   = "runcmd_iam_policy-cron-${var.ws_name}"
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
      "logs:*",
    ]

    resources = [
      "arn:aws:logs:*:*:*",
    ]
  }

  statement {
    actions = [
      "*",
    ]

    resources = [
      "arn:aws:s3:::cmdchallenge.com/*",
      "arn:aws:s3:::testing.cmdchallenge.com/*",
    ]
  }

  statement {
    actions = [
      "dynamodb:*",
    ]

    resources = [
      "arn:aws:dynamodb:us-east-1:*:table/${var.commands_table_name}",
      "arn:aws:dynamodb:us-east-1:*:table/${var.commands_table_name}/index/*",
      "arn:aws:dynamodb:us-east-1:*:table/${var.submissions_table_name}",
      "arn:aws:dynamodb:us-east-1:*:table/${var.submissions_table_name}/index/*",
    ]
  }

  statement {
    actions = [
      "sns:*",
    ]

    resources = [
      "arn:aws:sns:*:*:*",
    ]
  }
}

output "arn" {
  value = "${aws_lambda_function.runcmd_lambda_cron.*.arn}"
}
