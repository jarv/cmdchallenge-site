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

output "ami_id" {
  value = "${module.ec2.coreos_ami_id}"
}

output "ec2_public_ip" {
  value = "${module.ec2.public_ip}"
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

data "aws_region" "current" {
  current = true
}

data "aws_caller_identity" "current" {}

resource "null_resource" "pre_archive" {
  # Create CA and client key if they don't already exist
  provisioner "local-exec" {
    command = "${path.root}/../bin/create-ca-keys"
  }

  provisioner "local-exec" {
    command = "${path.root}/../bin/create-client-keys"
  }

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
  ec2_public_dns         = "${module.ec2.public_dns}"
  code_base64            = "${data.archive_file.lambda_runcmd_zip.output_base64sha256}"
  code_fname             = "${data.archive_file.lambda_runcmd_zip.output_path}"
  ws_name                = "${data.null_data_source.ws_data.inputs["ws_name"]}"
  is_prod                = "${data.null_data_source.ws_data.inputs["is_prod"]}"
}

module "lambda-cron" {
  source                 = "./modules/lambda-cron"
  submissions_table_name = "${module.dynamo.submissions_table_name}"
  commands_table_name    = "${module.dynamo.commands_table_name}"
  code_base64            = "${data.archive_file.lambda_runcmd_cron_zip.output_base64sha256}"
  code_fname             = "${data.archive_file.lambda_runcmd_cron_zip.output_path}"
  ws_name                = "${data.null_data_source.ws_data.inputs["ws_name"]}"
  bucket_name            = "${terraform.workspace == "prod" ? "cmdchallenge.com" : "testing.cmdchallenge.com"}"
}

module "ec2" {
  source  = "./modules/ec2"
  ws_name = "${data.null_data_source.ws_data.inputs["ws_name"]}"
  is_prod = "${data.null_data_source.ws_data.inputs["is_prod"]}"
}
