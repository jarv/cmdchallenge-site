# Summary

This repo contains static assets for the [cmdchallenge.com](https://cmdchallenge.com) website and terraform
configuration to build it in AWS.

The default terraform configuration creates infrastructure that is within the AWS free tier account.
This is also the same configuration that is used for the production site!
With just terraform you can have your own version of cmdchallenge running in AWS in less than 5 minutes in 5 easy steps.

## Architecture diagram:

```

+---------------------+
|    API Gateway      |
+---------------------+
           |
  +-----------------+
  |                 |
  | Lambda Function |    +----------+
  |                 |--- |          |
  +-----------------+   \| DynamoDB |
           |             |          |
   +--------------+      +----------+
   | EC2 t2.micro |
   |   (coreos)   |
   +--------------+
  
```

## Requirements

Creating your own version of cmdchallenge is extremely simple, there are three prerequisites for your mac or linux workstation:

* terraform ([download the appropriate binary](https://www.terraform.io/downloads.html) and put it in your path)
* openssl (for generating keys)
* python (for serving static content locally)


## Create your own cmdchallenge

### Step 1: Clone this repository

```
git clone https://github.com/jarv/cmdchallenge-site
git submodule update --init --recursive
```

### Step 2: Create SSH keys for the EC2 instance

```
$ ./bin/create-ssh-keys
Creating keypair for ssh
Generating public/private rsa key pair.
Your identification has been saved in cmd_rsa.
Your public key has been saved in cmd_rsa.pub.
...
```

This will create a `private/ssh` directory in the repostory root which contains the private and public keypair for the instance used for cmdchallenge.
This `private/` directory is ignored by github and should be kept safe, don't check it in.

### Step 3: Update the AWS configuration for terraform

Modify `terraform/site.tf` with your AWS credentials. By default it looks for a profile named "cmdchallenge".
See the [terraform documentation](https://www.terraform.io/docs/providers/aws/) if you want to use something other than an aws profile
```
provider "aws" {
  region = "us-east-1"
  shared_credentials_file = "${pathexpand("~/.aws/credentials")}"
  profile = "cmdchallenge"
}
```

### Step 4: Run terraform

```
cd terraform
terraform init
terraform apply
```

The process of bringing up all the resources in AWS takes around 4 or 5 minutes.
At the very end you will have something that looks like the following:

### Step 5: Serve assets

```
make serve
```




