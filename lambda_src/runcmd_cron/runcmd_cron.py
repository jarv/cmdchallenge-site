import logging
import time
import re
import boto3
from boto3.dynamodb.conditions import Key
from cStringIO import StringIO
import json
from os import environ
LOG = logging.getLogger()
LOG.setLevel(logging.WARN)
KEY_PREFIX = "s/solutions"
COMMANDS_TABLE_NAME = environ.get('COMMANDS_TABLE_NAME', 'commands')
SUBMISSIONS_TABLE_NAME = environ.get('SUBMISSIONS_TABLE_NAME', 'submissions')
BUCKET_NAME = environ.get('BUCKET_NAME', 'testing.cmdchallenge.com')


def handler(event, context):
    cmds = set()
    slugs = json.loads(open("ch/all-challenges.json").read())
    # b = boto3.session.Session(profile_name='cmdchallenge', region_name='us-east-1')
    table = boto3.resource('dynamodb').Table(COMMANDS_TABLE_NAME)
    s3 = boto3.client('s3')

    for slug_name in slugs:
        resp = table.query(IndexName='challenge_slug-correct_length-index',
                           KeyConditionExpression=Key('challenge_slug').eq(slug_name) & Key('correct_length').lt(20000000000),
                           ScanIndexForward=True)
        data = resp['Items']
        while 'LastEvaluatedKey' in resp:
            resp = table.query(ExclusiveStartKey=resp['LastEvaluatedKey'],
                               IndexName='challenge_slug-correct_length-index',
                               KeyConditionExpression=Key('challenge_slug').eq(slug_name) & Key('correct_length').lt(20000000000),
                               ScanIndexForward=True)
            data.extend(resp['Items'])
        # For these slugs, randomizers were added at version 5
        if slug_name in ['count_files', 'count_string_in_line', 'delete_files', 'find_tabs_in_a_file', 'list_files', 'nested_dirs', 'sum_all_numbers']:
            data = [i for i in data if i.get('version', 0) >= 5]
        cmds = sorted(list(set(re.sub(r'\s{2,}', ' ', i['cmd'].strip()) for i in data)), key=lambda x: len(x))
        LOG.warn("Found {} results for slug: {}".format(len(cmds), slug_name))
        results = dict(cmds=cmds, ts=time.time())

        fresults = StringIO(json.dumps(results))
        resp = s3.put_object(Bucket=BUCKET_NAME, Key="{}/{}.json".format(KEY_PREFIX, slug_name), Body=fresults.read(),
                             ACL='public-read', CacheControl='no-cache, no-store, must-revalidate',
                             ContentType="application/json")
        if resp['ResponseMetadata']['HTTPStatusCode'] != 200:
            LOG.error("Unable to write to s3 bucket {}: {} {}".format(BUCKET_NAME, results, resp))
            raise Exception("Unable to write to S3: {}".format(resp))
