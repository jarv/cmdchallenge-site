#!/usr/bin/env python
from __future__ import print_function
from runcmd import DOCKER_HOSTS
import yaml
import os
from challenge import verify_output
from docker_cmd import output_from_cmd


def main(host):
    print("Attempting to connect to {}".format(host))
    script_dir = os.path.abspath(os.path.dirname(__file__))
    y = yaml.load(open(os.path.join(script_dir, "challenges.yaml")).read())
    challenge = y[0]
    cmd = challenge['example']
    print(challenge['slug'], end="")
    tls_settings = dict(
        ca_cert=os.path.join(script_dir, "../../../keys/ca.pem"),
        verify=True,
        client_cert=(os.path.join(script_dir, "../../../keys/cert.pem"), os.path.join(script_dir, "../../../keys/key.pem")))
    output, return_code, test_errors = output_from_cmd(
        cmd, challenge, docker_version='1.23',
        docker_base_url='https://{}:2376'.format(host), tls_settings=tls_settings)
    if return_code != 0 or test_errors is not None:
        print(u"\t\x1b[1;31;40m\u2718\x1b[0m", end="")
        print(u"\t\x1b[0;35;40m{}\x1b[0m".format(output.decode('utf-8')))
        if test_errors:
            print(u"\t\x1b[0;35;40m{}\x1b[0m".format("\n".join(test_errors)))
    print(u"\t\x1b[1;32;40m\u2713\x1b[0m", end="")
    print("\t", end="")
    correct = verify_output(challenge, output, testing=True)
    if not correct:
        print("")
        print(output)
    print("")

for host in DOCKER_HOSTS:
    main(host)
