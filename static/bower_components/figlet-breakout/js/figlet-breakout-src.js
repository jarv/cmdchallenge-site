/*global document: false*/
/*global Figlet: false*/
/*global window: false*/
/*global routie: false*/
/*global alert: false*/
/*global Howl: false*/
/*global XMLHttpRequest: false*/
/*global XDomainRequest: false*/
/*global Rectangles: false*/
/*global _: false*/

(function(window) {
  
  var breakoutFunc = function() {

    var _breakoutObj = {};

    var newBonus, addPoints, checkBallCollision, createBoardDisp, createLineBreaks, ctx, ctx_g, dispBoard, doBonus, drawAsciiBall, drawPaddle, fallingBlocks, game, gameLoop, game_defaults, settings = {}, genDispData, getBallHeight, getColor, getRotatedCorners, handleBallCollision, inc_w_limit, msgFlash, playSound, processBoardDisp, removeLives, resetBonuses, resetLives, resetPoints, showOver, showPaused, showRunning, showWin, sign, updateBoardCfg, addEventListener, paddleMove, addAllEventListeners, createCorsRequest, reset;

    var animFrame, recursiveAnim;
    var el, game_canvas, brick_canvas;

    createCorsRequest = function(method, url) {
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


    /*******
      Game states
       - running
       - paused
       - over
       - win
     *******/

    sign = function(x) {
      return x > 0 ? 1 : x < 0 ? -1 : 0;
    };

    showWin = function() {
      updateBoardCfg();
      game.ball_locked = true;
      game.state = "not-started";
      if (typeof game.onGameOver === 'function') {
        game.onGameOver(true); 
      }
    };

    showRunning = function() {
      playSound('unpause');
      game.state = "running";
      if (typeof game.onGamePaused === 'function') {
        game.onPaused(false); 
      }
    };

    showOver = function() {
      updateBoardCfg();
      game.state = "not-started";
      if (typeof game.onGameOver === 'function') {
        game.onGameOver(false); 
      }
    };

    showPaused = function() {
      playSound('pause');
      game.state = "paused";
      if (typeof game.onGamePaused === 'function') {
        game.onGamePaused(true); 
      }
    };

    msgFlash = function(str) {
      if (typeof game.onGameFlash === 'function') {
        game.onGameFlash(str); 
      }
    };

    resetPoints = function() {
      game.points = game_defaults.points;
      if (typeof game.onGamePoints === 'function') {
        game.onGamePoints(game.points); 
      }
    };

    addPoints = function(val) {
      game.points += val * game.bonus_multiplier;
      if (typeof game.onGamePoints === 'function') {
        game.onGamePoints(game.points); 
      }
    };

    resetLives = function() {
      game.lives = game_defaults.lives;
      if (typeof game.onGameLives === 'function') {
        game.onGameLives(game.lives); 
      }
    };

    removeLives = function(val) {
      var l;
      game.lives -= val;
      if (typeof game.onGameLives === 'function') {
        game.onGameLives(game.lives); 
      }
      if (!game.lives) {
        showOver();
      } else {
        updateBoardCfg();
        if (game.lives > 1) {
          l = game.lives + " lives remaining";
        } else {
          l = "One life remaining";
        }
        msgFlash(l);
        game.ball_locked = true;
      }
    };

    newBonus = function(msg, multiplier) {
      game.bonus_multiplier += multiplier;
      msgFlash(msg);
      if (typeof game.onGameBonus === 'function') { 
        game.onGameBonus(game.bonus_multiplier, game.num_bonuses - game.bonuses.length); 
      }
    };

    resetBonuses = function() {
      game.bonus_multiplier = game_defaults.bonus_multiplier;
      game.bonuses = _.range(game_defaults.num_bonuses);
      game.paddle = _.cloneDeep(game_defaults.paddle);
      game.ball = _.cloneDeep(game_defaults.ball);
      game.fall_interval = game_defaults.fall_interval;
      game.brick_bounce = true;
      if (typeof game.onGameBonus === 'function') { 
        game.onGameBonus(game.bonus_multiplier, game.num_bonuses - game.bonuses.length); 
      }
    };

    getColor = function(num) {
      var index;
      index = num % game.ascii_colors.length;
      return game.ascii_colors[index];
    };

    paddleMove = function(e) {
      var cX;
      switch (game.state) {
        case "running":
          if (game.m_timeout !== null) {
            clearTimeout(game.m_timeout);
          }
          game.m_timeout = setTimeout(function() {
            game.m_timeout = null;
            game.paddle_dir = 0;
          }, 50);
          if (e.targetTouches) {
            cX = e.targetTouches[0].pageX;
          } else {
            cX = e.pageX;
          }
          if (cX > game.mouse_min_x && cX < game.mouse_max_x) {
            if (cX - game.mouse_min_x < game.paddle_x) {
              game.paddle_dir = -1;
            } else if (cX - game.mouse_min_x > game.paddle_x) {
              game.paddle_dir = 1;
            }
            game.l_paddle_x = game.paddle_x;
            game.paddle_x = cX - game.mouse_min_x;
          }
          break;
      }
    };

    drawAsciiBall = function(x, y) {
      var c, ll, lr, max_x, max_y, min_x, min_y, r, row, ul, ur;
      ctx_g.save();
      ctx_g.translate(game.l_x + game.ball.w_h, game.l_y + game.ball.h_h);
      ctx_g.rotate(game.l_ball_angle);
      ctx_g.clearRect(-game.ball.w_h - game.p_char_w, -game.ball.h_h - game.p_font_size, game.ball.w + game.p_char_w * 3, game.ball.h + game.p_font_size * 3);
      ctx_g.restore();
      ctx_g.fillStyle = game.paddle_color;
      ctx_g.save();
      ctx_g.translate(x + game.ball.w_h, y + game.ball.h_h);
      ctx_g.rotate(game.ball_angle);
      row = _.times(game.ball.cols, function() { return "O"; }).join("");
      for (r = 0; r < game.ball.rows; r++) {
        ctx_g.fillText(row, -game.ball.w_h, -game.ball.h_h + r * game.p_font_size);
      }
      ctx_g.restore();
      if (game.loop_cnt % game.ball_spin_speed === 0) {
        game.l_ball_angle = game.ball_angle;
        game.ball_angle += game.ball_spin * game.ball_da;
        ul = [game.x, game.y];
        ur = [game.x + game.ball.w, game.y];
        lr = [game.x + game.ball.w, game.y + game.ball.h];
        ll = [game.x, game.y + game.ball.h];
        c = getRotatedCorners(ul, ur, lr, ll);
        max_y = Math.floor(Math.max.apply(null, _.zip.apply(_, c)[1]));
        min_y = Math.ceil(Math.min.apply(null, _.zip.apply(_, c)[1]));
        max_x = Math.floor(Math.max.apply(null, _.zip.apply(_, c)[0]));
        min_x = Math.ceil(Math.min.apply(null, _.zip.apply(_, c)[0]));
        if (min_x < 0) {
          game.x -= min_x;
        }
        if (max_x > game.w) {
          game.x -= max_x - game.w;
        }
        if (min_y < 0) {
          game.y -= min_y;
        }
        if (max_y > game.h - game.paddle.h) {
          game.y -= max_y - (game.h - game.paddle.h);
        }
      }
    };

    inc_w_limit = function(value, inc, max, min) {
      if (inc < 0) {
        return Math.max(min, value + inc);
      } 
      if (inc >= 0) {
        return Math.min(max, value + inc);
      }
    };

    drawPaddle = function(paddle_x) {
      var paddle;
      ctx_g.clearRect(0, game.h - game.paddle.h - 1, game.w, game.paddle.h + 1);
      ctx_g.fillStyle = game.paddle_color;
      paddle = "[" + _.times(game.paddle.cols - 2, function() { return "O"; }).join("") + "]";
      ctx_g.fillText(paddle, paddle_x, game.h - game.paddle.h);
    };

    Figlet.loadFont = function(name, fn) {
      var url, request;
      url = "fonts/" + name + ".flf";
      request = createCorsRequest("GET", url);
      request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
          fn(request.responseText);
        }
      };
      request.send();
    };

    genDispData = function(str) {
			game.board_disp = [];
      Figlet.parsePhrase(str, game.figlet_font, function(disp_data, word_boundaries, space_w, line_breaks) {
        game.space_w = space_w;
        if (game.wrap) {
          line_breaks = createLineBreaks(disp_data, word_boundaries);
        }
        game.board_disp = createBoardDisp(disp_data, line_breaks, word_boundaries, space_w);
        updateBoardCfg();
      });
    };

    createLineBreaks = function(disp_data, word_boundaries) {
      var index, last_word_boundary, line_breaks, xpos, _len;
      line_breaks = [];
      xpos = 0;
      last_word_boundary = false;
      if (!disp_data || disp_data.length === 0) {
        return [];
      }
      for (index = 0, _len = disp_data[0].length; index < _len; index++) {
        xpos += game.char_w;
        if (xpos < game.w) {
          if (word_boundaries.indexOf(index) >= 0) {
            last_word_boundary = index;
          }
        } else if (xpos > game.w) {
          if (last_word_boundary) {
            line_breaks.push(last_word_boundary);
            xpos = game.char_w * (index - last_word_boundary);
            last_word_boundary = false;
          } else {
            line_breaks.push(index);
            xpos = 0;
          }
        }
      }

      if (line_breaks.length === 0) {
        line_breaks.push(disp_data[0].length);
      } else if (line_breaks[line_breaks.length - 1] < disp_data[0].length) {
        line_breaks.push(disp_data[0].length);
      }
      return line_breaks;
    };

    /*
    pointInBrick = function(ul, lr, brick_x, brick_y) {
      if ((ul[0] + game.dx > brick_x + game.char_w) || 
					(lr[0] + game.dx < brick_x) || 
					(ul[1] + game.dy > brick_y + game.font_size) || 
					(lr[1] + game.dy < brick_y)) {
        return false;
      }
      return true;
    };
    */

    checkBallCollision = function(brick_x, brick_y) {
      var lr, ul, xpos, ypos, c, ur, ll, A, B, square;
      
      square = game.ball.cols === game.ball.rows;
      xpos = game.x;
      ypos = game.y;

			var ball_width = game.p_char_w * game.ball.cols;
			var ball_height = game.p_font_size * game.ball.rows;

      ul = [xpos, ypos];
      ur = [xpos + ball_width, ypos];
      lr = [xpos + ball_width, ypos + ball_height];
      ll = [xpos, ypos + ball_height];

      c = getRotatedCorners(ul, ur, lr, ll);  
      // ctx.fillStyle = 'red';
      // ctx.fillRect(c[0][0], c[0][1], 2, 2);
      // ctx.fillStyle = 'green';
      // ctx.fillRect(c[2][0], c[2][1], 2, 2);
      A = {
        x1: square ? ul[0] + game.dx : c[0][0] + game.dx,
        y1: square ? ul[1] + game.dy : c[0][1] + game.dy,
        x2: square ? lr[0] + game.dx : c[2][0] + game.dx,
        y2: square ? lr[1] + game.dy : c[2][1] + game.dy
      };

      B = {
        x1: brick_x, y1: brick_y,
        x2: brick_x + game.char_w, y2: brick_y + game.font_size
      };

      if (Rectangles.intersect(Rectangles.normalize(A), Rectangles.normalize(B))) {
        addPoints(1);
        var ball_center = [Math.round(ul[0] + ball_width / 2), Math.round(ul[1] + ball_height / 2)];
        // ctx.fillStyle = 'blue';
        // ctx.fillRect(ball_center[0] - game.dx, ball_center[1] - game.dy, 2, 2);
        return [ball_center[0] - game.dx, ball_center[1] - game.dy];
      }
      return false;
    };

    handleBallCollision = function(c, brick_x, brick_y) {
      var aoa, c_brick_x, c_brick_y;
      if (!game.brick_bounce) {
        return true;
      }

      // center point of the brick
      c_brick_x = brick_x + game.char_w_h;
      c_brick_y = brick_y + game.font_size_h;
      /*
      ctx.strokeStyle = 'yellow';
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(c_brick_x, c_brick_y);
      ctx.stroke();
      */

      /****************
        -------
       | \ b / |
       |c \ / a|
       |  / \  |
       | / d \ |
       --------
     
      a = PI/4 to -PI/4
      b = -PI/4 to -3PI/4
      c = -3PI/4 to -PI or 3PI/4 to PI
      d = PI/4 to 3PI/4

      angle of (brick) attack
      *****************/

      aoa = Math.atan2(c[1] - c_brick_y, c[0] - c_brick_x);
      if (aoa <= Math.PI / 4 && aoa > -Math.PI / 4) {
        if (game.dx <= 0) {
          game.dx = -game.dx;
        }
      } else if (aoa <= -Math.PI / 4 && aoa > -3 * Math.PI / 4) {
        if (game.dy >= 0) {
          game.dy = -game.dy;
        }
      } else if ((aoa <= -3 * Math.PI / 4 && aoa >= -Math.PI) || (aoa <= Math.PI && aoa >= 3 * Math.PI / 4)) {
        if (game.dx >= 0) {
          game.dx = -game.dx;
        }
      } else if (aoa <= 3 * Math.PI / 4 && aoa > Math.PI / 4) {
        if (game.dy <= 0) {
          game.dy = -game.dy;
        }
      }
    };

    createBoardDisp = function(disp_data, line_breaks, word_boundaries, space_w) {
      var board_disp, break_pos, last_break, line_cnt, row, row_index, sliced_row, space_offset, _i, _j, _len, _len1;
      board_disp = [];
      line_cnt = 0;
      last_break = 0;
      space_offset = 0;
      for (_i = 0, _len = line_breaks.length; _i < _len; _i++) {
        break_pos = line_breaks[_i];
        for (row_index = _j = 0, _len1 = disp_data.length; _j < _len1; row_index = ++_j) {
          row = disp_data[row_index];
          if (word_boundaries.indexOf(break_pos) >= 0 && last_break !== 0) {
            space_offset = space_w;
          }
          sliced_row = row.slice(last_break + space_offset, break_pos);
          board_disp[row_index + (line_cnt * disp_data.length)] = sliced_row;
        }
        last_break = break_pos;
        line_cnt += 1;
      }
      return board_disp;
    };
    processBoardDisp = function() {
      var column, column_index, has_won, row, row_index, xpos, ypos, _i, _j, _len, _len1, _ref;
      var ul = { x: undefined, y: undefined };
      var lr = { x: undefined, y: undefined };
      var c, hit;
      ypos = 0;
      has_won = true;
      _ref = game.board_disp;
      for (row_index = _i = 0, _len = _ref.length; _i < _len; row_index = ++_i) {
        row = _ref[row_index];
        xpos = game.w_h - Math.round(row.length * game.char_w / 2);
        for (column_index = _j = 0, _len1 = row.length; _j < _len1; column_index = ++_j) {
          column = row[column_index];
          if (column !== " ") {
            has_won = false;
            c = checkBallCollision(xpos, ypos);
            if (c) {
              hit = c;
              if (ul.x === undefined) {
                ul = {x: xpos, y: ypos};
                lr = {x: xpos + game.char_w, y: ypos + game.font_size};
              } else {
                ul.x = xpos < ul.x ? xpos : ul.x;
                ul.y = ypos < ul.y ? ypos : ul.y;
                lr.x = xpos + game.char_w > lr.x ? xpos + game.char_w : lr.x;
                lr.y = ypos + game.font_size > lr.y ? ypos + game.font_size : lr.y;
              }
              game.board_disp[row_index][column_index] = " ";
              ctx.clearRect(xpos, ypos, game.char_w, game.font_size);
            }
          }
          xpos += game.char_w;
        }
        ypos += game.font_size;
      }
      if (hit) {
        playSound('hit');
        var x = ul.x + Math.round((lr.x - ul.x) / 2);
        var y = ul.y + Math.round((lr.y - ul.y) / 2);
        handleBallCollision(hit, x, y);
      }
      return game.block_rotations.length === 0 && has_won;
    };


    doBonus = function() {
      if (game.loop_cnt - game.last_bonus < game.bonus_cooldown) {
        playSound('hit');
        return;
      } 
      playSound('upgrade');
      game.last_bonus = game.loop_cnt;
      if (game.bonuses.length === 0) {
        resetBonuses();
      }
      switch (game.bonuses.pop()) {
        case 0:
          newBonus("Small Paddle!", 10);
          game.paddle.cols = 5;
          break;
        case 1:
          newBonus("Double Paddle!", 2);
          game.brick_bounce = true;
          game.paddle.cols = game.paddle.cols * 2;
          break;
        case 2:
          newBonus("Small ball!", 5);
          game.ball.cols = 1;
          game.ball.rows = 1;
          break;
        case 3:
          newBonus("More falling bricks!", 0);
          game.fall_interval = 10;
          break;
        case 4:
          newBonus("Super ball!!", 0);
          game.brick_bounce = false;
          game.ball.cols = 4;
          game.ball.rows = 4;
          break;
        case 5:
          newBonus("Long ball!!", 0);
          game.brick_bounce = true;
          game.ball.cols = 1;
          game.ball.rows = 4;
          break;

      }
      updateBoardCfg();
    };


    fallingBlocks = function() {
      var clearFallingBlock, index, last_row, non_spaces, row_index, value, xpos, _j, _len1;
      clearFallingBlock = function(r) {
        ctx.save();
        ctx.translate(r.x + game.char_w_h, r.l_y + game.font_size_h);
        ctx.rotate(r.l_r);
        ctx.clearRect(-game.char_w_h - game.char_w, -game.font_size_h - game.font_size, game.char_w * 3, game.font_size * 3);
        ctx.restore();
      };
      game.block_rotations = game.block_rotations.filter(function(elem) {
        return elem.d === true;
      });
      game.block_rotations.forEach(function(r) {
        if ((r.y + game.font_size > game.h - game.paddle.h) && (r.x + game.char_w > game.paddle_x && r.x < game.paddle_x + game.paddle.w)) {
          r.d = false;
          addPoints(1);
          doBonus();
          updateBoardCfg();
        } else {
          if (game.state === "running") {
            if (game.loop_cnt % r.s === 0) {
              if (r.l_y) {
                clearFallingBlock(r);
              }
              ctx.save();
              ctx.translate(r.x + game.char_w_h, r.y + game.font_size_h);
              ctx.rotate(r.r);
              ctx.fillText(r.c, -game.char_w_h, -game.font_size_h);
              ctx.restore();
              r.l_y = r.y;
              r.y += game.font_size;
              r.l_r = r.r;
              r.r += Math.PI / 4;
              if (r.y > game.h) {
                r.d = false;
                clearFallingBlock(r);
              }
            }
          }
        }
      });

      if (game.state === "running") {
        if (game.loop_cnt % game.fall_interval === 0) {

          game.board_disp.forEach(function(row, row_index) {
            if (row.some(function(elem) { return elem !== " "; })) {
              game.l_char_row_index = row_index;
            }
          });
          last_row = game.board_disp[game.l_char_row_index];
          non_spaces = [];
          for (index = _j = 0, _len1 = last_row.length; _j < _len1; index = ++_j) {
            value = last_row[index];
            if (value !== " ") {
              non_spaces.push(index);
            }
          }
          if (non_spaces.length === 0) {
            return;
          }
          row_index = non_spaces[Math.floor(Math.random() * non_spaces.length)];
          xpos = game.w_h - Math.round(last_row.length * game.char_w / 2);
          game.block_rotations.push({
            x: xpos + game.char_w * row_index,
            y: game.l_char_row_index * game.font_size + game.font_size,
            l_y: null,
            l_r: null,
            r: 0,
            rs: Math.floor(Math.random() * 10 + 3),
            c: last_row[row_index],
            s: game.fall_speed(),
            d: true
          });
          last_row[row_index] = " ";
          ctx.clearRect(xpos + game.char_w * row_index, game.l_char_row_index * game.font_size, game.char_w, game.font_size);
        }
      }
    };

    dispBoard = function() {
      var text_color, xpos, ypos;
      ypos = 0;
      game.board_disp.forEach(function(row, row_index) {
        xpos = game.w_h - Math.round(row.length * game.char_w / 2);
        text_color = getColor(row_index);
        if (row.some(function(elem) { return elem !== " "; })) {
          game.l_char_row_index = row_index;
        }
        ctx.fillStyle = text_color;
        ctx.fillText(row.join(""), xpos, ypos);
        ypos += game.font_size;
      });
    };

    getRotatedCorners = function(ul, ur, lr, ll) {
      var ball_cos, ball_sin, r_x, r_y;
      if (Math.round(100 * game.ball_angle) % Math.round(100 * Math.PI) === 0) {
        return [ul, ur, lr, ll];
      }
      r_x = game.x + game.ball.w_h;
      r_y = game.y + game.ball.h_h;
      ball_cos = Math.cos(-game.ball_angle);
      ball_sin = Math.sin(-game.ball_angle);
      return [
				[r_x + (ul[0] - r_x) * ball_cos + (ul[1] - r_y) * ball_sin, r_y - (ul[0] - r_x) * ball_sin + (ul[1] - r_y) * ball_cos],
				[r_x + (ur[0] - r_x) * ball_cos + (ur[1] - r_y) * ball_sin, r_y - (ur[0] - r_x) * ball_sin + (ur[1] - r_y) * ball_cos], 
				[r_x + (lr[0] - r_x) * ball_cos + (lr[1] - r_y) * ball_sin, r_y - (lr[0] - r_x) * ball_sin + (lr[1] - r_y) * ball_cos], 
				[r_x + (ll[0] - r_x) * ball_cos + (ll[1] - r_y) * ball_sin, r_y - (ll[0] - r_x) * ball_sin + (ll[1] - r_y) * ball_cos]];
    };

    getBallHeight = function() {
      var c, max_y, min_y, ll, lr, ul, ur;
      ul = [game.x, game.y];
      ur = [game.x + game.ball.w, game.y];
      lr = [game.x + game.ball.w, game.y + game.ball.h];
      ll = [game.x, game.y + game.ball.h];
      c = getRotatedCorners(ul, ur, lr, ll);

      max_y = Math.floor(Math.max.apply(null, _.zip.apply(_, c)[1]));
      min_y = Math.ceil(Math.min.apply(null, _.zip.apply(_, c)[1]));

      return max_y - min_y;
    };


    gameLoop = function() {
      var c, ll, lr, max_x, max_y, min_x, min_y, ul, ur, won;
      if (game.state === "running") {
        won = processBoardDisp();
        if (won && game.board_disp.length > 0) {
          showWin();
        }
        if (game.ball_locked) {
          game.l_x = game.x;
          game.l_y = game.y;
          game.ball_angle = game_defaults.ball_angle;
          game.ball_spin = game_defaults.ball_spin;
          game.dx = game_defaults.dx;
          game.dy = game_defaults.dy;
          game.x = game.paddle_x + game.paddle.w_h - game.ball.w_h;
          game.y = game.h - game.paddle.h - game.ball.h - (getBallHeight() / 2 - game.ball.h_h);
        }
        if (game.l_char_row_index >= 0) {
          fallingBlocks();
        }
        drawAsciiBall(game.x, game.y);
        if (game.right_down) {
          if (game.paddle_x + game.paddle.w < game.w) {
            game.l_paddle_x = game.paddle_x;
            game.paddle_x += Math.floor(5 + game.right_acc);
            game.right_acc += game.acc_rate;
          }
        } else if (game.left_down) {
          if (game.paddle_x > 0) {
            game.paddle_x -= Math.floor(5 + game.left_acc);
            game.left_acc += game.acc_rate;
          }
        }
        drawPaddle(game.paddle_x);
        ul = [game.x, game.y];
        ur = [game.x + game.ball.w, game.y];
        lr = [game.x + game.ball.w, game.y + game.ball.h];
        ll = [game.x, game.y + game.ball.h];
        c = getRotatedCorners(ul, ur, lr, ll);
        max_y = Math.floor(Math.max.apply(null, _.zip.apply(_, c)[1]));
        min_y = Math.ceil(Math.min.apply(null, _.zip.apply(_, c)[1]));
        max_x = Math.ceil(Math.max.apply(null, _.zip.apply(_, c)[0]));
        min_x = Math.floor(Math.min.apply(null, _.zip.apply(_, c)[0]));

        if (max_x + game.dx > game.w) {
          playSound('bounce');
          if (!game.ball_spin || sign(game.dy) === sign(game.ball_spin)) {
            game.dy = inc_w_limit(game.dy, -game.ball_spin * 2, game.max_dy, -game.max_dy);
            game.ball_spin = inc_w_limit(game.ball_spin, -game.dy, game.ball_max_spin, -game.ball_max_spin);
          }
          game.dx = -game.dx;
        }
        if (min_x + game.dx < 0) {
          playSound('bounce');
          if (!game.ball_spin || sign(game.dy) !== sign(game.ball_spin)) {
            game.dy = inc_w_limit(game.dy, game.ball_spin * 2, game.max_dy, -game.max_dy);
            game.ball_spin = inc_w_limit(game.ball_spin, game.dy, game.ball_max_spin, -game.ball_max_spin);
          }
          game.dy = sign(game.dy) * Math.max(Math.abs(game.dy), Math.abs(game_defaults.dy));
          game.dx = -game.dx;
        }
        if (min_y + game.dy < 0) {
          playSound('bounce');
          if (!game.ball_spin || sign(game.dx) === sign(game.ball_spin)) {
            game.dx = inc_w_limit(game.dx, -game.ball_spin * 2, game.max_dx, -game.max_dx);
            game.ball_spin = inc_w_limit(game.ball_spin, -game.dx, game.ball_max_spin, -game.ball_max_spin);
          }
          game.dy = sign(game.dy) * Math.max(Math.abs(game.dy), Math.abs(game_defaults.dy));
          game.dy = -game.dy;
        } else if (max_y + game.dy > (game.h - game.paddle.h)) {
          if (max_x > game.paddle_x - game.char_w && min_x < (game.paddle_x + game.paddle.w + game.char_w)) {
            playSound('paddle');
            if (!game.ball_spin || sign(game.dx) !== sign(game.ball_spin)) {
              game.dx = inc_w_limit(game.dx, game.ball_spin * 2, game.max_dx, -game.max_dx);
              game.ball_spin = inc_w_limit(game.ball_spin, game.dx, game.ball_max_spin, -game.ball_max_spin);
            }
            game.dx = inc_w_limit(game.dx, -game.paddle_dir * 2, game.max_dx, -game.max_dx);
            game.ball_spin = inc_w_limit(game.ball_spin, -game.paddle_dir, game.ball_max_spin, -game.ball_max_spin);
            if (game.x + game.ball.w < game.paddle_x + game.p_char_w) {
              game.dx = -game.max_dx;
              game.ball_spin = -game.ball_max_spin;
            }
            if (game.x > game.paddle_x + game.paddle.w - game.p_char_w) {
              game.dx = game.max_dx;
              game.ball_spin = game.ball_max_spin;
            }
            game.dy = -game.dy;
            game.dy = sign(game.dy) * Math.max(Math.abs(game.dy), Math.abs(game_defaults.dy));
          } else {
            playSound('death');
            if (game.state === "running") {
              removeLives(1);
            }
            game.dy = -game.dy;
          }
        }
        if (!game.ball_locked) {
          game.l_x = game.x;
          game.l_y = game.y;
          game.x += game.dx;
          game.y += game.dy;
        }
      }
      game.loop_cnt += 1;
    };
    
    game_defaults = {

      // Callbacks
      onGameWin: undefined,
      onGameFlash: undefined,
      onGameStart: undefined,
      onGameOver: undefined,
      onGamePaused: undefined,
      onGamePoints: undefined,
      onGameLives: undefined,
      onGameBonus: undefined,
      onToggleSound: undefined,

      // Default settings
      wrap: false,
      size_to_parent: true,
      container_id: "breakout",
      game_canvas_id: "game-canvas",
      brick_canvas_id: "brick-canvas",
      font_name: "Monospace",
      game_str: "Hello, this is figlet breakout!",
      figlet_font: "Pebbles",
      acc_rate: 0.5,
      w: 800,
      h: 600,
      dx: 0,
      dy: -6,
      max_dx: 6,
      max_dy: 8,
      x: -1000,
      y: -1000,
      l_x: -1,
      bonus_cooldown: 500,
      last_bonus: 0,
      num_bonuses: 6,
      bonuses: _.range(6),
      right_down: false,
      left_down: false,
      right_acc: 0,
      left_acc: 0,
      state: "not-started",
      paddle_color: "white",
      board_disp: [],
      space_w: 0,
      ball: {
        'cols': 3,
        'rows': 3,
        'w': 0,
        'h': 0
      },
      paddle: {
        'cols': 9,
        'rows': 1,
        'w': 0,
        'h': 10
      },
      width: 0,
      height: 0,
      mouse_min_x: 0,
      mouse_max_x: 0,
      ascii_colors: ['#c84848', '#c66c3a', '#b47a30', '#a2a22a', '#48a048'],
      font_size: 12,
      p_font_size: 12,
      // ball locked on the paddle
      ball_locked: true,
      // what direction the ball is spinning
      // and its angle
      ball_spin: 0,
      ball_angle: 0, // Math.PI / 4,
      l_ball_angle: 0,
      ball_da: Math.PI / 16,
      ball_spin_speed: 2,
      ball_max_spin: 1,
      // last row that contains blocks
      // needed for the falling ones 
      l_char_row_index: 0,
      loop_cnt: 0,
      block_rotations: [],
      fall_interval: 50,
      fall_speed: function() {
        return Math.floor(Math.random() * 10 + game.font_size / 3);
      },
      bonus_multiplier: 1,
      points: 0,
      lives: 3,
      brick_bounce: true,
      paddle_x: undefined,
      paddle_dir: 0,
      // for detecting an idle mouse
      m_timeout: null,
      sound_enabled: false,
      sound: new Howl({
            "src": ["../sounds/mygameaudio.ogg", "../sounds/mygameaudio.m4a", "../sounds/mygameaudio.mp3", "../sounds/mygameaudio.ac3"],
            "sprite": {
              "bounce": [0, 636.054421768707],
              "death": [2000, 597.1655328798184],
              "hit": [4000, 33.922902494331],
              "paddle": [6000, 81.541950113379],
              "pause": [8000, 439.818594104308],
              "unpause": [10000, 439.818594104308],
              "upgrade": [12000, 297.142857142857]
            }
          })
    };

    updateBoardCfg = function() {
      game_canvas.width = game.w;
      game_canvas.height = game.h;
      brick_canvas.width = game.w;
      brick_canvas.height = game.h;
      // ctx_g.clearRect(0, 0, game.w, game.h);
      // ctx.clearRect(0, 0, game.w, game.h);
      game.w_h = Math.ceil(game.w / 2);
      game.h_h = Math.ceil(game.h / 2);
      game.mouse_min_x = game_canvas.getBoundingClientRect().left;
      game.mouse_max_x = game.mouse_min_x + game.w - game.paddle.w;
      ctx.textBaseline = "top";
      ctx_g.textBaseline = "top";
      ctx.font = game.font_size + "px " + game.font_name;
      ctx_g.font = game.p_font_size + "px " + game.font_name;
      game.char_w = ctx.measureText("O").width;
      game.p_char_w = ctx_g.measureText("O").width;
      game.char_w_h = Math.round(game.char_w / 2);
      game.p_char_w_h = Math.round(game.p_char_w / 2);
      game.font_size_h = Math.round(game.font_size / 2);
      game.p_font_size_h = Math.round(game.p_font_size / 2);
      game.ball.w = game.ball.cols * game.p_char_w;
      game.ball.w_h = Math.round(game.ball.w / 2);
      game.ball.h = game.ball.rows * game.p_font_size;
      game.ball.h_h = Math.round(game.ball.h / 2);
      game.paddle.w = game.paddle.cols * game.p_char_w;
      game.paddle.w_h = Math.round(game.paddle.w / 2);
      game.paddle.h = game.paddle.rows * game.p_font_size;
      game.paddle.h_h = Math.round(game.paddle.h / 2);
      if (!game.paddle_x) {
        game.l_paddle_x = game.paddle_x;
        game.paddle_x = game.w_h - game.paddle.w_h;
      }
      dispBoard();
    };

    playSound = function(sound) {
      if (game.sound_enabled) {
        game.sound.play(sound);
      }
    };

    addEventListener = function(event, obj, fn) {
      if (obj.addEventListener) {
        obj.addEventListener(event, fn, false);
      } else {
        obj.attachEvent("on"+event, fn); // old ie
      }
    };

    reset = function(settings_override) {
      _.merge(game_defaults, settings);
      if (settings_override) {
        _.merge(game_defaults, settings_override);
      }
      game = _.cloneDeep(game_defaults, true);
      _breakoutObj.game = game;
      resetBonuses();
      resetLives();
      resetPoints();
      el = document.getElementById(game.container_id);
      if (game.size_to_parent) {
        game.w = el.clientWidth;
        game.h = el.clientHeight;
      }
      updateBoardCfg();
      genDispData(game.game_str);
      return game;
    };

    addAllEventListeners = function() {
      addEventListener("keydown", document, function(evt) {
        switch (game.state) {
          case "paused":
            if (evt.keyCode === 27) {
              showRunning();
            }
            break;
          case "running":
            if (evt.keyCode === 27) {
              showPaused();
            }
            if (evt.keyCode === 32) {
              game.ball_locked = false;
            }
            break;
        }
        if (evt.keyCode === 39) {
          game.right_down = true;
          game.paddle_dir = 1;
        } else if (evt.keyCode === 37) {
          game.left_down = true;
          game.paddle_dir = -1;
        } else if (evt.keyCode === 83) {
          game.sound_enabled = !game.sound_enabled;
          if (typeof game.onToggleSound === 'function') { 
            game.onToggleSound(game.sound_enabled);
          }
        }
      });

      addEventListener("keyup", document, function(evt) {
        if (evt.keyCode === 39) {
          game.right_down = false;
          game.right_acc = 0;
          game.paddle_dir = 0;
        } else if (evt.keyCode === 37) {
          game.left_down = false;
          game.left_acc = 0;
          game.paddle_dir = 0;
        }
      });

      addEventListener("click", document.getElementById("breakout"), function() {
        switch (game.state) {
          case "running":
            if (game.ball_locked) {
              game.ball_locked = false;
            } else {
              showPaused();
            }
            break;
          case "paused":
            showRunning();
            break;
        }
      });
      addEventListener("mousemove", document.getElementById("breakout"), paddleMove);
      addEventListener("touchmove", document.getElementById("breakout"), paddleMove);
    };

		
    _breakoutObj.init = function(user_settings, callback) {
      this.reset = reset;
      settings = user_settings;

      game_canvas = document.createElement("canvas");
      game_canvas.id = "game-canvas";
      game_canvas.style.position = "absolute";
      // game_canvas.style.zIndex = 500;
      brick_canvas = document.createElement("canvas");
      brick_canvas.id = "brick-canvas";
      brick_canvas.style.position = "absolute";
      // brick_canvas.style.zIndex = 800;

      ctx_g = game_canvas.getContext("2d");
      ctx = brick_canvas.getContext("2d");

			reset();
      this.play = function() {
          showRunning();
          if (typeof game.onGameStart === 'function') {
            game.onGameStart(); 
          }
      };
      el = document.getElementById(game.container_id);
      if (game.size_to_parent) {
        game.w = el.clientWidth;
        game.h = el.clientHeight;
      }
      el.appendChild(game_canvas);
      el.appendChild(brick_canvas);

      animFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || null;
      if (animFrame !== null) {
        recursiveAnim = function() {
          gameLoop();
          animFrame(recursiveAnim, game_canvas);
        };
        animFrame(recursiveAnim, game_canvas);
      } else {
        setInterval(gameLoop, 1000.0 / 60);
      }
      addAllEventListeners();
      if (typeof callback === 'function') { callback(); }
    };
    return _breakoutObj;
  };

  if (window.FigletBreakout === undefined) {
    window.FigletBreakout = breakoutFunc();
  }

}(window));
