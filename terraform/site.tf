variable "timestamp" {
  default = "none"
}

terraform {
  backend "s3" {
    bucket  = "terraform-cmdchallenge"
    region  = "us-east-1"
    profile = "cmdchallenge-cicd"
    key     = "cicd"
  }
}

output "invoke_url" {
  value = "${module.api.invoke_url}"
}

output "test_hello_world" {
  value = "curl '${module.api.invoke_url}/?cmd=echo+hello+world&challenge_slug=hello_world'"
}

data "null_data_source" "ws_data" {
  inputs = {
    ws_name = "${terraform.env}"
    is_prod = "${terraform.workspace == "prod" ? "yes" : "no"}"
  }
}

provider "aws" {
  region                  = "us-east-1"
  shared_credentials_file = "${pathexpand("~/.aws/credentials")}"
  profile                 = "cmdchallenge-cicd"
}

provider "google" {
  credentials = "${file("../private/google/cmdchallenge.json")}"
  project     = "cmdchallenge-1"
  region      = "us-east1"
}

data "aws_region" "current" {
  current = true
}

data "aws_caller_identity" "current" {}

resource "null_resource" "pre_archive" {
  # Stage files that are shared and keys needed for the lambda function
  provisioner "local-exec" {
    command = "${path.root}/../bin/copy-files-for-lambda"
  }
}

data "archive_file" "lambda_runcmd_zip" {
  type        = "zip"
  source_dir  = "../lambda_src/runcmd"
  output_path = "lambda-runcmd.zip"
  depends_on  = ["null_resource.pre_archive"]
}

data "archive_file" "lambda_runcmd_cron_zip" {
  type        = "zip"
  source_dir  = "../lambda_src/runcmd_cron"
  output_path = "lambda-runcmd-cron.zip"
  depends_on  = ["null_resource.pre_archive"]
}

module "dynamo" {
  source  = "./modules/dynamo"
  ws_name = "${data.null_data_source.ws_data.inputs["ws_name"]}"
  is_prod = "${data.null_data_source.ws_data.inputs["is_prod"]}"
}

module "api" {
  source     = "./modules/api"
  region     = "${data.aws_region.current.name}"
  account_id = "${data.aws_caller_identity.current.account_id}"
  lambda_arn = "${module.lambda.arn}"
  ws_name    = "${data.null_data_source.ws_data.inputs["ws_name"]}"
  is_prod    = "${data.null_data_source.ws_data.inputs["is_prod"]}"
}

module "lambda" {
  source                 = "./modules/lambda"
  submissions_table_name = "${module.dynamo.submissions_table_name}"
  commands_table_name    = "${module.dynamo.commands_table_name}"

  ec2_public_dns = "${module.gce.public_dns}"
  code_base64    = "${data.archive_file.lambda_runcmd_zip.output_base64sha256}"
  code_fname     = "${data.archive_file.lambda_runcmd_zip.output_path}"
  ws_name        = "${data.null_data_source.ws_data.inputs["ws_name"]}"
  is_prod        = "${data.null_data_source.ws_data.inputs["is_prod"]}"
}

module "lambda-cron" {
  source                 = "./modules/lambda-cron"
  count                  = 10
  submissions_table_name = "${module.dynamo.submissions_table_name}"
  commands_table_name    = "${module.dynamo.commands_table_name}"
  code_base64            = "${data.archive_file.lambda_runcmd_cron_zip.output_base64sha256}"
  code_fname             = "${data.archive_file.lambda_runcmd_cron_zip.output_path}"
  ws_name                = "${data.null_data_source.ws_data.inputs["ws_name"]}"
  bucket_name            = "${terraform.workspace == "prod" ? "cmdchallenge.com" : "testing.cmdchallenge.com"}"
}

module "gce" {
  source = "./modules/gce"
  timestamp = "${var.timestamp}"
}
