variable "timestamp" {}

resource "google_compute_firewall" "cmdchallenge" {
  name    = "cmdchallenge"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["2376", "22"]
  }

  source_ranges = ["0.0.0.0/0"]

  target_tags = ["cmdchallenge"]
}

resource "google_compute_instance" "cmdchallenge" {
  name         = "cmdchallenge-${var.timestamp}"
  machine_type = "g1-small"

  metadata_startup_script = "${file("${path.module}/bootstrap.bash")}"
  project                 = "cmdchallenge-1"
  zone                    = "us-east1-b"

  lifecycle {
    create_before_destroy = false
  }

  network_interface {
    network = "default"

    access_config {
      // Ephemeral IP
    }
  }

  scheduling {
    preemptible       = false
    automatic_restart = true
  }

  boot_disk {
    auto_delete = true

    initialize_params {
      image = "coreos-stable-1576-5-0-v20180105"
    }
  }

  tags = [
    "cmdchallenge",
  ]

  connection {
    type        = "ssh"
    user        = "jarv"
    timeout     = "10m"
    private_key = "${file("${path.root}/../private/ssh/cmd_rsa")}"
  }

  provisioner "remote-exec" {
    inline = [
      "mkdir -p runcmd/private",
    ]
  }

  provisioner "file" {
    source      = "${path.root}/../cmdchallenge/ro_volume"
    destination = "runcmd"
  }

  provisioner "file" {
    source      = "${path.root}/../docker_cfg_files"
    destination = "runcmd"
  }

  provisioner "local-exec" {
    command = "${path.root}/../bin/create-ca-keys"
  }

  provisioner "local-exec" {
    command = "${path.root}/../bin/create-client-keys"
  }

  provisioner "local-exec" {
    command = "${path.root}/../bin/create-server-keys cmdchallenge-${var.timestamp}.c.cmdchallenge.com"
  }

  provisioner "file" {
    source      = "${path.root}/../private/ca/ca.pem"
    destination = "runcmd/private/ca.pem"
  }

  provisioner "file" {
    source      = "${path.root}/../private/server/cmdchallenge-${var.timestamp}.c.cmdchallenge.com/server-cert.pem"
    destination = "runcmd/private/server-cert.pem"
  }

  provisioner "file" {
    source      = "${path.root}/../private/server/cmdchallenge-${var.timestamp}.c.cmdchallenge.com/server-key.pem"
    destination = "runcmd/private/server-key.pem"
  }

  provisioner "remote-exec" {
    script = "${path.module}/bootstrap.bash"
  }

  provisioner "remote-exec" {
    inline = [
      "uname -a",
    ]
  }
}

resource "aws_route53_record" "default" {
  zone_id = "Z3TFJ1MMW7EJ7R"
  name    = "cmdchallenge-${var.timestamp}.c.cmdchallenge.com"
  type    = "A"
  ttl     = "300"
  records = ["${google_compute_instance.cmdchallenge.network_interface.0.access_config.0.assigned_nat_ip}"]
}

output "public_ip" {
  value = "${google_compute_instance.cmdchallenge.network_interface.0.access_config.0.assigned_nat_ip}"
}

output "public_dns" {
  value = "cmdchallenge-${var.timestamp}.c.cmdchallenge.com"
}
