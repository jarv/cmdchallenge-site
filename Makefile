BASEDIR=$(CURDIR)
OUTPUTDIR=$(BASEDIR)/static

serve:
	./bin/simple-server

serve_prod:
	./bin/simple-server prod
update:
	./bin/update-challenges-for-site
wsass:
	sass --watch sass:static/css --style compressed
