VERSION=1.0.0
UGLIFY=uglifyjs
JSLINT=/usr/local/bin/jslint

ALL: figlet-min

js/figlet-$(VERSION).js: js/figlet-breakout-src.js
	cp js/figlet-breakout-src.js js/figlet-breakout-$(VERSION).js
	cp js/figlet-src.js js/figlet-$(VERSION).js
	cp css/figlet-breakout-src.css js/figlet-breakout-$(VERSION).css

js/figlet-$(VERSION).min.js: js/figlet-$(VERSION).js
	$(UGLIFY) -o js/figlet-breakout-$(VERSION).min.js --comments --mangle -- js/figlet-breakout-$(VERSION).js
	$(UGLIFY) -o js/figlet-$(VERSION).min.js --comments --mangle -- js/figlet-$(VERSION).js

figlet-min:  js/figlet-$(VERSION).min.js
	cp js/figlet-$(VERSION).min.js js/figlet.min.js
	cp js/figlet-breakout-$(VERSION).min.js js/figlet-breakout.min.js

serve:
	python -m SimpleHTTPServer 8000
