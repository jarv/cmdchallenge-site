variable "region"       {}
variable "account_id"   {}
variable "lambda_arn"   {}

resource "aws_api_gateway_rest_api" "runcmd_api" {
  name = "runcmd-api-${terraform.env}"
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
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/${var.lambda_arn}/invocations"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${var.lambda_arn}"
  principal     = "apigateway.amazonaws.com"
  source_arn = "arn:aws:execute-api:${var.region}:${var.account_id}:${aws_api_gateway_rest_api.runcmd_api.id}/*/${aws_api_gateway_method.method.http_method}/"
}

resource "aws_api_gateway_deployment" "runcmd_deploy" {
  depends_on = ["aws_api_gateway_integration.integration"]
  rest_api_id = "${aws_api_gateway_rest_api.runcmd_api.id}"
  stage_name = "prod"
  provisioner "local-exec" {
    command = "echo ${aws_api_gateway_deployment.runcmd_deploy.invoke_url} > ${path.root}/${terraform.env}-runcmd-api-gateway-endpoint"
  }
  provisioner "local-exec" {
    when = "destroy"
    command = "rm -f ${path.root}/${terraform.env}-runcmd-api-gateway-endpoint"
  }
}

output "invoke_url" { value = "${aws_api_gateway_deployment.runcmd_deploy.invoke_url}" }
