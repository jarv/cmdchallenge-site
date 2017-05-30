output "invoke_url" { value = "${module.api.invoke_url}" }
output "test_hello_world" { value = "curl '${module.api.invoke_url}/?cmd=echo+hello+world&challenge_slug=hello_world'" }
output "ami_id" { value = "${module.ec2.coreos_ami_id}" }
output "ec2_public_ip" { value = "${module.ec2.public_ip}" }

provider "aws" {
  region = "us-east-1"
  shared_credentials_file = "${pathexpand("~/.aws/credentials")}"
  profile = "cmdchallenge"
}

data "aws_region" "current" { current = true }
data "aws_caller_identity" "current" {}

resource "null_resource" "pre_archive" {
  # Create CA and client key if they don't already exist
  provisioner "local-exec" {
    command = "${path.root}/../bin/create-ca-keys"
  }
  provisioner "local-exec" {
    command = "${path.root}/../bin/create-client-keys"
  }
  # Ensure lambda func symlinks point to the keys in the
  # private dir.
  # provisioner "local-exec" {
  #   command = "${path.root}/../bin/create-key-symlinks"
  # }
  # Stage files that are shared and keys needed for the lambda function
  provisioner "local-exec" {
    command = "cp ${path.root}/../cmdchallenge/bin/challenge.py ${path.root}/../lambda_src/runcmd/challenge.py"
  }
  provisioner "local-exec" {
    command = "cp ${path.root}/../cmdchallenge/bin/docker_cmd.py ${path.root}/../lambda_src/runcmd/docker_cmd.py"
  }
  provisioner "local-exec" {
    command = "cp ${path.root}/../cmdchallenge/ro_volume/ch/* ${path.root}/../lambda_src/runcmd/ch/"
  }

  provisioner "local-exec" {
    command = "cp ${path.root}/../private/ca/ca.pem ${path.root}/../lambda_src/runcmd/keys/"
  }
  provisioner "local-exec" {
    command = "cp ${path.root}/../private/client/cert.pem ${path.root}/../lambda_src/runcmd/keys/"
  }
  provisioner "local-exec" {
    command = "cp ${path.root}/../private/client/key.pem ${path.root}/../lambda_src/runcmd/keys/"
  }
}

data "archive_file" "lambda_runcmd_zip" {
  type        = "zip"
  source_dir  = "../lambda_src/runcmd"
  output_path = "lambda-runcmd.zip"
  depends_on = ["null_resource.pre_archive"]
}

module "dynamo" { source = "./modules/dynamo" }

module "api" { 
  source = "./modules/api" 
  region = "${data.aws_region.current.name}"
  account_id = "${data.aws_caller_identity.current.account_id}"
  lambda_arn = "${module.lambda.arn}"
}

module "lambda" {
  source = "./modules/lambda"
  submissions_table_name = "${module.dynamo.submissions_table_name}"
  commands_table_name = "${module.dynamo.commands_table_name}"
  ec2_public_dns = "${module.ec2.public_dns}"
  code_base64 = "${data.archive_file.lambda_runcmd_zip.output_base64sha256}"
  code_fname = "${data.archive_file.lambda_runcmd_zip.output_path}"
}   

module "ec2" {
  source = "./modules/ec2"
}
