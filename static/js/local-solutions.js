/*global document: false*/
/*global window: false*/
/*global FigletBreakout: false*/
/*global routie: false*/
/*global decodeURIComponent: false*/
/*global $: false*/
/*jslint devel: true*/
/*global XMLHttpRequest: false*/
/*global document: false*/
/*global Awesomplete: false*/
/*global localStorage: false*/
/*global XDomainRequest: false*/
/*global _: false*/
/*global hljs: false*/


(function() {
  var get_slug, create_cors_request, escape_html, get_challenges, date_delta;

  document.getElementById("header").style.display = 'block';
	date_delta = function(last_updated) {
				var time_disp = "";
				var cur_time = (new Date()).getTime() / 1000;
				var delta = Math.round(cur_time - last_updated);
				var minutes_delta = Math.floor(delta / 60);
				var seconds_delta = delta % 60;
				if (minutes_delta) {
					if (minutes_delta === 1) {
						time_disp += minutes_delta + " minute ";
					} else {
						time_disp += minutes_delta + " minutes ";
					}
				}
				if (seconds_delta === 1) {
					time_disp += seconds_delta + " second";
				} else {
					time_disp += seconds_delta + " seconds";
				}
				return time_disp;
	};

  create_cors_request = function(method, url) {
    var xhr = new XMLHttpRequest();
    if (xhr.withCredentials !== undefined) {

      // Check if the XMLHttpRequest object has a "withCredentials" property.
      // "withCredentials" only exists on XMLHTTPRequest2 objects.
      xhr.open(method, url, true);

    } else if (XDomainRequest !== "undefined") {

      // Otherwise, check if XDomainRequest.
      // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
      xhr = new XDomainRequest();
      xhr.open(method, url);
    } else {
      // Otherwise, CORS is not supported by the browser.
      xhr = null;
    }
    return xhr;
  };

  escape_html = function(unsafe) {
      return unsafe
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;")
           .replace(/\n/g, "\n  ");
  };

  get_slug = function(challenge) {
    var data, request, desc_el, cmds_el, name_el, title, date_el;
    request = create_cors_request("GET", "/s/solutions/" + challenge.slug + ".json");
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        data = JSON.parse(request.responseText);
        name_el = document.getElementById("name");
			  date_el = document.getElementById("date");	
        cmds_el = document.getElementById("cmds");
        desc_el = document.getElementById("desc");
        if (challenge.disp_title) {
          title = challenge.disp_title;
        } else {
          title = challenge.slug.replace(/_/g, " ").replace(/\b\w/g, function(l) { return l.toUpperCase(); });
        }
        name_el.innerHTML = '<a href="/#/' + challenge.slug + '">' + title + '</a>';
        date_el.innerHTML = "Updated " + date_delta(data.ts) + " ago";
        name_el.style.display = 'block';
        cmds_el.innerHTML = data.cmds.map(escape_html).join("\n");
        desc_el.innerHTML = challenge.description;
        hljs.highlightBlock(cmds_el);
      }
    };
    request.send();
  };

  get_challenges = function(callback) {
    var request, challenges;
    request = create_cors_request("GET", "/challenges/challenges.json");
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        challenges = JSON.parse(request.responseText);
        if (typeof callback === 'function') { callback(challenges); }
      }
    };
    request.send();
  };

  /* create routes */
	get_challenges(function(challenges) {
    var ul_el = document.getElementById('challenges');
    var ul_user_el = document.getElementById('user-challenges');
    var routes = {};
    challenges.forEach(function(challenge) {
      var a = document.createElement('a');
      a.id = challenge.slug;
      a.href = "#/" + challenge.slug;
      a.title = challenge.slug;
      var ltext = document.createTextNode(challenge.slug + "/");
      a.appendChild(ltext);
      var li_el = document.createElement('li');
      li_el.appendChild(a);

      if (challenge.author && challenge.author !== "cmdchallenge") {
        ul_user_el.appendChild(li_el);
      } else {
        ul_el.appendChild(li_el);
      }
      routes["/" + challenge.slug] = function() {
        get_slug(challenge);
      };
    });
    routie(routes);
    // get_slug(challenges[0]); 
	});


}(window));
