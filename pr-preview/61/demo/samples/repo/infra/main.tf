resource "aws_sqs_queue" "reviews" {
  name = "reviews"
}

resource "aws_s3_bucket" "rendered" {
  bucket = "acme-rendered-reviews"
}

module "network" {
  source = "./network"
}
