/*global document: false*/
/*global window: false*/
/*global FigletBreakout: false*/
/*global routie: false*/
/*global decodeURIComponent: false*/
/*global $: false*/

(function(window, $, FigletBreakout) {
  var breakoutFunc = function() {
    var fade_in_add, fade_out_delete, fade_in_out, expand_challenge, reset_challenge;
    var settings = {};
    var large_block_font = 8,
        large_paddle_font = 14,
        small_block_font = 3,
        small_paddle_font = 12;
    var large_collapsed_height = 200, small_collapsed_height = 80;
    var large_expanded_height = 500, small_expanded_height = 200;
    var medium_window = 760;


    fade_in_add = function(el, to_add, callback) {
      el.append(to_add);
      $(to_add).addClass("fadeInDown");  
      if (typeof callback === 'function') { callback(); }
    };

    fade_out_delete = function(el, callback) {
      $(el).addClass("fadeOut");  
      setTimeout(function() {
        el.parentNode.removeChild(el);
        $(el).removeClass("fadeOut");
        if (typeof callback === 'function') { callback(); }
      }, 500);
    };

    fade_in_out = function(msg) {
      var el, to_add;
      el = $("#msg-flash");
      to_add = document.createElement('div');
      to_add.className = "flash animated ";
      to_add.innerHTML = '<span>' + msg + '</span>';
      fade_in_add(el, to_add, function() {
        setTimeout(function() {
          fade_out_delete(to_add);
        }, 2000);
      });
    };

    settings.onToggleSound = function(snd) {
      if (snd) {
        $("#sound-toggle").html("ON");
      } else {
        $("#sound-toggle").html("OFF");
      }
    };

    settings.onGameStart = function() {
      fade_in_out("Welcome to CMD Breakout!");
    };

    settings.onGameOver= function(has_won) {
      if (has_won) {
        fade_in_out("You won CMD breakout!");
      } else {
        fade_in_out("Sorry, try again!");
      }
      reset_challenge();
    };

    settings.onGameFlash = function(msg) {
      fade_in_out(msg);
    };

    settings.figlet_font = "3-d";
    settings.font_name = "pressStart";
    settings.game_str = "You Won the\nCMD\nCHALLENGE!";
    settings.font_size = ($(window).width() < medium_window) ? small_block_font : large_block_font;
    settings.p_font_size = ($(window).width() < medium_window) ? small_paddle_font : large_paddle_font; 
    FigletBreakout.init(settings);

    // Reset the canvas on window resize
    $(window).on("resize", function() {
      reset_challenge();
    });

    reset_challenge = function() {
      if (! FigletBreakout.game) { return; }
      var height = ($(window).width() < medium_window) ? small_collapsed_height : large_collapsed_height;
      $(".sound").hide();
      $("#breakout-box").animate({
        height: height
      }, 100, function() {
        settings.font_size = ($(window).width() < 760) ? 3 : 8;
        settings.p_font_size = ($(window).width() < 760) ? 12 : 14;
        FigletBreakout.reset(settings);
        $("#breakout-box").off("click", expand_challenge);
        $("#breakout-box").one("click", expand_challenge);
      });
    };

    expand_challenge = function() {
      var height = ($(window).width() < medium_window) ? small_expanded_height: large_expanded_height;
      $("#breakout-box").animate({
        height: height
      }, 100, function() {
        $(".sound").show();
        FigletBreakout.reset();
        FigletBreakout.play();
      });
    };
    $("#breakout-box").one("click", expand_challenge);
  };
  if (window.Breakout === undefined) {
    window.Breakout = breakoutFunc;
  }
}(window, $, FigletBreakout));
