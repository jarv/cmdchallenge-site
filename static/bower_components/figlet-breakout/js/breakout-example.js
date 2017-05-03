/*global document: false*/
/*global window: false*/
/*global FigletBreakout: false*/
/*global routie: false*/
/*global decodeURIComponent: false*/

(function() {
  var fade_in_add, fade_out_delete, fade_in_out, add_class, remove_class;
  var settings = {};

  remove_class = function(el, class_name) {
    if (el.classList) {
      el.classList.remove(class_name);
    } else {
      el.class_name = el.class_name.replace(new RegExp('(^|\\b)' + class_name.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  };
  add_class = function(el, class_name) {
    if (el.classList) {
      el.classList.add(class_name);
    } else {
      el.class_name += ' ' + class_name;
    }
  };
  fade_in_add = function(el, to_add, callback) {
    el.appendChild(to_add);
    add_class(to_add, "fadeInDown");  
    if (typeof callback === 'function') { callback(); }
  };
  fade_out_delete = function(el, callback) {
    add_class(el, "fadeOut");  
    setTimeout(function() {
      el.parentNode.removeChild(el);
      remove_class(el, "fadeOut");
      if (typeof callback === 'function') { callback(); }
    }, 500);
  };
  fade_in_out = function(msg) {
    var el, to_add;
    el = document.getElementById("msg-flash");
    to_add = document.createElement('div');
    to_add.className = "flash animated ";
    to_add.innerHTML = '<span>' + msg + '</span>';
    fade_in_add(el, to_add, function() {
      setTimeout(function() {
        fade_out_delete(to_add);
      }, 2000);
    });
  };


  routie("/:str?/:font?/:size?", function(str, font, font_size)  {
    if (str) {
      settings.game_str = decodeURIComponent(str);
    }
    if (font) {
      settings.figlet_font = decodeURIComponent(font);
    }
    if (font_size) {
      settings.font_size = +decodeURIComponent(font_size);
      settings.p_font_size = +decodeURIComponent(font_size);
    }      
    settings.onGamePoints = function(pts) {
      document.getElementById("points").innerHTML = pts;
    };
    settings.onGameLives = function(lives) {
      document.getElementById("lives").innerHTML = lives;
    };
    settings.onGameBonus = function(multiplier, num) {
      document.getElementById("bonuses").innerHTML = num;
      document.getElementById("bonus-multiplier").innerHTML = "x" + multiplier;
    };
    settings.onGameFlash = function(msg) {
      fade_in_out(msg);
    };
    settings.onToggleSound = function(snd) {
      if (snd) {
        document.getElementById("sound-toggle").innerHTML = "ON";
      } else {
        document.getElementById("sound-toggle").innerHTML = "OFF";
      }
    };
    settings.figlet_font = "3-D";
    settings.game_str = "You Won the CMD CHALLENGE!!";
    settings.font_size = 6;
    settings.font_name = "pressStart";
    settings.p_font_size = 6;
    FigletBreakout.start(settings);
  });
}(window));
