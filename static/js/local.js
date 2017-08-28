/*global jQuery: false*/
/*global alert: false*/
/*global document: false*/
/*global routie: false*/
/*global localStorage: false*/
/*global location: false*/
/*global window: false*/
/*global _: false*/

var GLOBAL_VERSION = 1; // for cache busting
var CMD_URL = "";
var TAB_COMPLETION = ["war_and_peace.txt", "sum-me.txt", "find", "echo",
                      "awk", "sed", "perl", "wc", "grep", "access.log",
                      "cat", "sort", "README", "split-me.txt", "file-with-tabs.txt",
                      "cut", "faces.txt", "random-numbers.txt", "table.csv"];
var STORAGE_CORRECT = "correct_answers";
var BADGE_MSGS = {
  b0: "Are you up for the command line challenge? Solve the tasks printed below in a single line of bash.",
  b1: "You are off to a great start, keep on going!",
  b2: "You have a shrug-man, this means you are doing well!",
  b3: "On your way to becoming a super-duper commandline hacker.",
  b4: "Wow, not many have gotten this far... don't stop!",
  b5: "I'm impressed at how far you have gotten... keep at it!",
  b6: "You are officially a command line master, great job!",
};

var BADGE_CUTOFFS = {
  "100": "b6",
  "80": "b5",
  "50": "b4",
  "25": "b3",
  "10": "b2"
};

jQuery(function($) {
  var term;
  var current_challenge = {};
  var ret_code;
  var reset_el;
  var cmdchallenges;
	var less = false;
  // Functions
  var get_challenges, send_command, initialize_challenges, colorize, underline_current,
      add_class, remove_class, get_array_from_storage, add_item_to_storage, update_checkmarks,
      add_event_listener, get_next_challenge, color_badges, update_badges, check_for_win,
      update_error_text, page_output, term_clear;

	term_clear = function() {
		if (current_challenge && !less) {
			ret_code = colorize("0", "green");
			current_challenge.description.split(/\n/).forEach(function(l) {
				term.echo(colorize("# " + l, "teal"));
			});
		}
	};

  get_array_from_storage = function(storage_name) {
    var ids;
    try {
      ids = JSON.parse(localStorage.getItem(storage_name));
    } catch(e) {
      ids = [];
    }
    if (ids === null) {
     ids = [];
    }
    return _.uniq(ids);
  };

  add_item_to_storage = function(item, storage_name, callback) {
    var items, json_items;
    items = get_array_from_storage(storage_name);
    
    json_items = JSON.stringify(items.concat([item]));
    localStorage.setItem(storage_name, json_items);

    if (typeof callback === 'function') {
      callback();
    }
  };

  add_event_listener = function(event, obj, fn) {
    if (obj.addEventListener) {
      obj.addEventListener(event, fn, false);
    } else {
      obj.attachEvent("on"+event, fn); // old ie
    }
  };

  check_for_win = function() {
    var completed = get_array_from_storage(STORAGE_CORRECT);
    var won = cmdchallenges.filter(function(c) { return completed.indexOf(c.slug) !== -1; }).length === cmdchallenges.length;
    if (won) {
      document.getElementById("header").style.display = 'none';
      document.getElementById("breakout-box").style.display = 'block';
      $.getScript("js/figlet-breakout.min.js", function() {
        window.Breakout();
      });
    } else {
      document.getElementById("header").style.display = 'block';
      document.getElementById("breakout-box").style.display = 'none';
    }

  };

  update_checkmarks = function(challenges) {
    var checked_challenges = get_array_from_storage(STORAGE_CORRECT);
    challenges.forEach(function(challenge) {
      if (checked_challenges.indexOf(challenge.slug) !== -1) {
        var el = document.getElementById(challenge.slug);
        add_class(el, 'checked');
      }
    });
  };

  colorize = function(msg, color, effect) {
		if (! effect) { 
      effect = ""; 
    }
		/*
			u — underline.
			s — strike.
			o — overline.
			i — italic.
			b — bold.
			g — glow (using css text-shadow).
		*/
    return "[[" + effect + ";" + color + ";black]" + msg + "]";
  };

  underline_current = function(id, challenges) {
    challenges.forEach(function(challenge) {
      var el = document.getElementById(challenge.slug);
      var el_parent = el.parentNode;
      if (el.id === id) {
        add_class(el_parent, 'active_challenge');
      } else {
        remove_class(el_parent, 'active_challenge');
      }
    });
  };

  add_class = function(el, class_name) {
    if (el.classList) {
      el.classList.add(class_name);
    } else {
      el.class_name += ' ' + class_name;
    }
  };

  remove_class = function(el, class_name) {
    if (el.classList) {
      el.classList.remove(class_name);
    } else {
      el.class_name = el.class_name.replace(new RegExp('(^|\\b)' + class_name.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  };

  initialize_challenges = function(challenges, term, callback) {
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
      add_event_listener("click", a, function(e) { 
         e.preventDefault();
         e.stopPropagation();
         routie("/" + challenge.slug);
      });
      if (challenge.author && challenge.author !== "cmdchallenge") {
        ul_user_el.appendChild(li_el);
      } else {
        ul_el.appendChild(li_el);
      }
      routes["/" + challenge.slug] = function() {
        var s_el;
        underline_current(challenge.slug, challenges);
        current_challenge = challenge;
        s_el = document.getElementById("solution");
        s_el.setAttribute("href", "/s/#/" + challenge.slug);
        term.echo(colorize("# ", "teal") + colorize("You have a new challenge!", "white"));
        current_challenge.description.split(/\n/).forEach(function(l) {
          term.echo(colorize("# " + l, "teal"));
        });
        update_error_text('');
      };
    });
    // last user challenge
    var li_el = document.createElement('li');
    var a = document.createElement('a');
    a.href = "https://github.com/jarv/cmdchallenge#contribute";
    a.title = "[ add a challenge ]";
    var ltext = document.createTextNode("[ add a challenge ]");
    a.appendChild(ltext);
    li_el.appendChild(a);
    li_el.id = "add_challenge";
    ul_user_el.appendChild(li_el);
    
    routie(routes);
    if (typeof callback === 'function') { callback(); }
  };

  update_badges = function() {
    update_error_text('');
    var el = document.getElementById("badge_text");
    el.innerHTML = color_badges();
  };

  color_badges = function() {
    // returns the highest achieved
    // badge string

    var i;
    var num_completed = get_array_from_storage(STORAGE_CORRECT).length;
    var cutoffs = Object.keys(BADGE_CUTOFFS).map(function(n) { return Number(n); }).sort(function(a, b) { return a - b; });
    var p_completed = Math.floor(num_completed / cmdchallenges.length * 100);
    var badge_str, badge_el, badge_id;

    if (num_completed === 0) {
      return BADGE_MSGS.b0;
    }
    // update the first badge if a single challenge has
    // been completed
    if (num_completed >= 1) {
      badge_str = BADGE_MSGS.b1;
      badge_el = document.getElementById("b1");
      add_class(badge_el, "completed");
    }
    for (i=0; i < cutoffs.length; i++) {
      badge_id = BADGE_CUTOFFS[cutoffs[i].toString()];
      badge_el = document.getElementById(badge_id);
      if (p_completed >= cutoffs[i]) {
        badge_str = BADGE_MSGS[badge_id];
        add_class(badge_el, "completed");
      } else {
        remove_class(badge_el, "completed");
      }
    }
    return badge_str;
  };


  get_challenges = function(callback) {
    $.ajax({
      dataType: "json",
      url: "/challenges/challenges.json",
      success: function(resp) {
        if (typeof callback === 'function') { callback(resp); }
      },
      error: function() {
        ret_code = "☠️";
        alert("error");
      }
    });
  };

  send_command = function(command, callback) {
    var data;
    data = {
      "cmd": command,
      "challenge_slug": current_challenge.slug,
      "version": current_challenge.version,
      "g_version": GLOBAL_VERSION
    };
    $.ajax({
      type: 'GET',
      url: CMD_URL,
      // dataType: 'json',
      async: true,
      // contentType: "application/json; charset=utf-8",
      data: data,
      success: function(resp) {
        if (typeof callback === 'function') { callback(resp); }
      },
      error: function(resp) {
        if (typeof callback === 'function') { 
          var output = resp.responseText || "Unknown Error :(";
          callback({
            output: output,
            correct: false,
            return_code: "☠️"
          }); 
        }
      }
    });
  };

  update_error_text = function(msg) {
    var el_error = document.getElementById("error_text");
    el_error.innerHTML = msg;
  };

  get_next_challenge = function(slug, challenges) {
    var current_index = challenges.map(function (o) { return o.slug; }).indexOf(slug);
    var checked_challenges = get_array_from_storage(STORAGE_CORRECT);
    var i;
    for (i=(current_index + 1); i < challenges.length; i++) {
      if (checked_challenges.indexOf(challenges[i].slug) === -1) {
        return challenges[i];
      }
    }
    return challenges[0];
  };

	page_output = function(output) {
		var source = output, export_data;
		var rows, resize, lines;
		var print, pos = 0;
		var i = 0;
		var regex;
		less = true;
		print = function() {
			term.clear();
			term.echo(lines.slice(pos, pos+rows-1).join('\n'));
		};
		term.resume();
		export_data = term.export_view();
		rows = term.rows();
		resize = [];
		lines = source.split('\n');
		console.log(lines);
		resize.push(function() {
			if (less) {
				rows = term.rows();
				print();
			}
		});
		print();
		term.push($.noop, {
			keydown: function(e) {
				if (term.get_prompt() !== '/') {
					if (e.which === 191) {
						term.set_prompt('/');
					} else if (e.which === 38 || e.which === 75) { // up
						if (pos > 0) {
							--pos;
							print();
						}
					} else if (e.which === 40 || e.which === 74) { // down
						if (pos < lines.length-1) {
							++pos;
							print();
						}
					} else if (e.which === 34 || e.which === 32) { // Page down
						pos += rows;
						if (pos > lines.length-1-rows) {
							pos = lines.length-1-rows;
						}
						print();
					} else if (e.which === 33) { // Page up
						pos -= rows;
						if (pos < 0) {
							pos = 0;
						}
						print();
					} else if (e.which === 81) { // q
						less = false;
						term.pop().import_view(export_data);
					}
					return false;
				}

				if (e.which === 8 && term.get_command() === '') {
					term.set_prompt(':');
				} else if (e.which === 13) {
					var command = term.get_command();
					// basic search find only first
					// instance and don't mark the result
					if (command.length > 0) {
						regex = new RegExp(command);
						for (i=0; i<lines.length; ++i) {
							if (regex.test(lines[i])) {
								pos = i;
								print();
								term.set_command('');
								break;
							}
						}
						term.set_command('');
						term.set_prompt(':');
					}
					return false;
				}
			},
			prompt: ':'
		});
	};

  // main

	reset_el = document.getElementById("reset");
  ret_code = colorize("0", "green");

  add_event_listener("click", reset_el, function(e) { 
    e.preventDefault();
		localStorage.clear();
		location.reload();
	});

  get_challenges(function(challenges) {
    var new_challenge = null;
    current_challenge = null;
    cmdchallenges = challenges.filter(function(c) {
      return (!c.author || c.author === "cmdchallenge");
    });
    update_badges();

    $('#term_challenge').terminal(function(command, term) {
			// Remove beginning and trailing whitespace
			command = command.replace(/^\s+|\s+$/g, '');
			if (command !== '') {
        term.pause();
        send_command(command, function(resp) {
          if (resp.return_code === 0) {
            ret_code = colorize(resp.return_code, "green");
          } else {
            ret_code = colorize(resp.return_code, "red");
          }
					if (command.match(/^man +[^ ]+/)) {
						page_output(resp.output);
					} else {
						term.echo(resp.output);
					}
          if (resp.correct) {
            term.echo(colorize("# 👍 👍 👍  Correct!", "green"));
            add_item_to_storage(resp.challenge_slug, STORAGE_CORRECT, function() {
              var el = document.getElementById(resp.challenge_slug);
              var el_error = document.getElementById("error_text");
              el_error.innerHTML = '';
              add_class(el, 'checked');
              new_challenge = get_next_challenge(resp.challenge_slug, challenges);
              update_badges();
              check_for_win();

              if (new_challenge) {
                current_challenge = new_challenge;
                routie('/' + current_challenge.slug);
              }
            });
          } else {
            if (resp.test_errors && resp.test_errors.length > 0) {
              update_error_text(resp.test_errors[0] + ' - try again');
            } else if (resp.rand_error) {
              update_error_text('Test against random data failed - try again');
            }
          }
          term.resume();
        });
      } else {
         term.echo('');
      }
    }, {
      greetings: '',
      name: 'js_demo',
      height: 300,
      convertLinks: true,
      prompt: function(callback) {
        callback("bash(" + ret_code + ")> ");
      },
      completion: TAB_COMPLETION,
      onClear: term_clear
    });
    term = $.terminal.active();
    initialize_challenges(challenges, term, function() {
      if (! current_challenge) {
        current_challenge = challenges[0];
        current_challenge.description.split(/\n/).forEach(function(l) {
          term.echo(colorize("# " + l, "teal"));
        });
      }
      update_checkmarks(challenges);
      check_for_win();
    });
  });
});
