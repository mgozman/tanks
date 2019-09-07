var express = require("express");
var path = require("path");
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'keyboardkitteh',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
  }))
app.use(express.static(path.join(__dirname, "./static")));
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

app.use(express.static(__dirname + "/server"));
const server = app.listen(8000);
const io = require('socket.io')(server);

const kNewEnemy = 60;
let newEnemyTick = 0;
const kMoveEnemy = 10;
let moveEnemyTick = 5;

let users = [];
let games = [];
let enemies = [];
var field = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    [2, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 2],
    [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 1, 3, 1, 0, 0, 0, 0, 0],
    ];

io.on('connection', function(socket) {
    socket.emit('getName', games);
    
    let user = {id: socket.id, name: '', x: 4, y: 13, game_id : 0, missiles: [], position: 'up', player: 1, killed: 0};
    let game = {player1: user, player2: null, enemies, enemiesCount: 5};
    socket.on('got_a_new_user', function(name, id) {
        user.name = name;
        users.push(user);

        if (id == ""){
            game.player1 = user;
            games.push(game);
            user.game_id = games.length - 1;
            socket.emit("get_field", {user, field, game});
        } else {
            user.game_id = id;
            user.player = 2;
            user.x = 8;
            games[id].player2 = user;
            io.clients().sockets[games[id].player1.id].emit('second_player', user);
            socket.emit("get_field", {user, field, game});
            socket.emit('second_player', games[id].player1);
        }
        setInterval(gameloop, 100);
    });

    socket.on('new_missiles', function(){
        user.missiles.push({left: user.x * 40 + 5, top: user.y * 40 + 15, direction: user.position, player: user.player});

        io.clients().sockets[games[user.game_id].player1.id].emit('got_missiles', user);
        if (games[user.game_id].player2){
            io.clients().sockets[games[user.game_id].player2.id].emit('got_missiles', user);
        }
    });

    function newEnemy() {
        if (games[user.game_id].enemiesCount > 0){
            games[user.game_id].enemiesCount--;
            let enemy = {x: 12, y: 0, position: 'down', missiles: []};
            enemy.missiles.push({left: enemy.x * 40 + 5, top: enemy.y * 40 + 15, direction: enemy.position, player: 0});
            games[user.game_id].enemies.push(enemy);
            io.clients().sockets[games[user.game_id].player1.id].emit('got_enemy', enemy, games[user.game_id].enemies.length - 1);
            if (games[user.game_id].player2){
                io.clients().sockets[games[user.game_id].player2.id].emit('got_enemy', enemy, games[user.game_id].enemies.length - 1);
            }
        }
    }

    function gameloop () {
        ++newEnemyTick;
        if ((newEnemyTick % kNewEnemy) === 0 && games[user.game_id].player1)
            newEnemy();
        if (user.missiles.length > 0){
            moveMissiles(user);
        }
        if (games[user.game_id].enemiesCount === 0 && enemies.length === 0){
            if (games[user.game_id].player1){
                io.clients().sockets[games[user.game_id].player1.id].emit('win');
            }
            if (games[user.game_id].player2){
                io.clients().sockets[games[user.game_id].player2.id].emit('win');
            }
        }
        for (let i = 0; i < enemies.length; i ++ ){
            if (enemies[i].missiles.length > 0){
                moveMissiles(enemies[i]);    
            }
        }

        ++moveEnemyTick;
        if ((moveEnemyTick % kMoveEnemy) === 0)
            moveEnemies();
    }

    function checkMissilePosition (missile){        
        var x = Math.floor(missile.left / 40);
        var y = Math.floor(missile.top / 40);
        var partner;
        var game = games[user.game_id];
        partner = user.player == 1 ? game.player2 : game.player1;        
        
        for (let i = 0; i < game.enemies.length; i++){
            if (game.enemies[i].x == x && game.enemies[i].y == y){
                game.enemies.splice(i, 1);
                
                if (missile.player === 1){
                    game.player1.killed++;
                }
                
                if (missile.player === 2 && game.player2 != null){
                    game.player2.killed++;
                }
                io.clients().sockets[user.id].emit('boom', {x, y, direction: missile.direction});
                io.clients().sockets[user.id].emit('remove_enemy', i, game.player1, game.player2);

                if (game.player2){
                    io.clients().sockets[game.player2.id].emit('boom', {x, y, direction: missile.direction});
                    io.clients().sockets[game.player2.id].emit('remove_enemy', i, game.player1, game.player2);
                }
                return true;
            } 
        }

        if (partner && partner.x == x && partner.y == y){
            io.clients().sockets[partner.id].emit('boom', {x, y, direction: missile.direction});   
            io.clients().sockets[user.id].emit('boom', {x, y, direction: missile.direction});
            return true;
        }
        if (user.x === x && user.y === y && user.player != missile.player){
            //game over
            console.log('Game over');
            io.clients().sockets[user.id].emit('game_over');   
            if (partner){
                io.clients().sockets[partner.id].emit('remove_player', user);   
            }
            return true;
        }
     
        if (field[y] && field[y][x] && field[y][x] == 1){
            //emit Boom and new field
            field[y][x] = 0;
            io.clients().sockets[game.player1.id].emit('boom', {x, y, direction: missile.direction});
            io.clients().sockets[game.player1.id].emit('new_field_cell', {x, y, field});
            if (game.player2){
                io.clients().sockets[game.player2.id].emit('boom', {x, y, direction: missile.direction});
                io.clients().sockets[game.player2.id].emit('new_field_cell', {x, y, field});
            }
            return true;
        }
        if (field[y] && field[y][x] && field[y][x] == 2){
            //emit Boom
            io.clients().sockets[game.player1.id].emit('boom', {x, y, direction: missile.direction});
            if (game.player2){
                io.clients().sockets[game.player2.id].emit('boom', {x, y, direction: missile.direction});
            }
            return true;
        }
        if (field[y] && field[y][x] && field[y][x] == 3){
            //game over
            console.log('Eagle killed');
            io.clients().sockets[game.player1.id].emit('game_over');
            if (game.player2){
                io.clients().sockets[game.player2.id].emit('game_over');
            }
            return true;
        }
        return false;
    }

    function moveEnemies(){
        //find target
        let target = {x: 0, y: 0};
        let enemy;
        
        for (let i = 0; i < games[user.game_id].enemies.length; i ++){
            enemy = games[user.game_id].enemies[i];
            target = findTarget(enemy);
            offset_x = enemy.x - target.x;
            if (offset_x !== 0)
                offset_x = Math.floor(offset_x / Math.abs(offset_x));
           
            offset_y = enemy.y - target.y;
            if (offset_y !== 0)
                offset_y = Math.floor(offset_y / Math.abs(offset_y));;
            
            if (field[enemy.y - offset_y] && offset_y != 0 && field[enemy.y - offset_y][enemy.x] <= 1){
                enemy.y -= offset_y;
                console.log('move y');
                enemy.position = offset_y > 0 ? "up" : "down";
            } else {
                if (enemy.x - offset_x > 0 && enemy.x - offset_x < field[enemy.y].length && field[enemy.y][enemy.x - offset_x] <= 1){
                    enemy.x -= offset_x;
                    console.log('move x');
                    enemy.position = offset_x > 0 ? "left" : "right";
                    
                }
            }
            enemy.missiles.push({left: enemy.x * 40 + 5, top: enemy.y * 40 + 15, direction: enemy.position, player: 0});
            games[user.game_id].enemies[i] = enemy;
        }

        if (games[user.game_id].enemies.length > 0) {
            if (games[user.game_id].player1.id){
                io.clients().sockets[games[user.game_id].player1.id].emit('move_enemies', games[user.game_id].enemies);
            }
            if (games[user.game_id].player2){
                io.clients().sockets[games[user.game_id].player2.id].emit('move_enemies', games[user.game_id].enemies);
            }
        }
    }

    function findTarget(enemy){
        let dist_p1;
        let dist_p2;
        let dist_eagle;
        let target = {x: 0, y: 0};
        let game = games[user.game_id];
        
        dist_p1 = Math.abs(enemy.x - game.player1 .x) + Math.abs(enemy.y - game.player1.y);
        dist_p2 = game.player2 ? Math.abs(enemy.x - game.player2 .x) + Math.abs(enemy.y - game.player2.y) : Infinity;
        dist_eagle = Math.abs(enemy.x - 6) + Math.abs(enemy.y - 13);

        if (dist_p1 == Math.min(dist_p1, dist_p2, dist_eagle)){
            target = {x: game.player1.x, y: game.player1.y};
        }
        if (dist_p2 == Math.min(dist_p1, dist_p2, dist_eagle)){
            target = {x: game.player2.x, y: game.player2.y};
        }
        if (dist_eagle == Math.min(dist_p1, dist_p2, dist_eagle)){
            target.x = 6;
            target.y = 13;
        }
        return target;
    }

    function moveMissiles(player){
        var offset = 25;
        
        for (let i = 0; i < player.missiles.length; i++) {
            if (player.missiles[i] && player.missiles[i].direction === "up"){
                if (player.missiles[i].top - offset < 0){
                    player.missiles.splice(i, 1);
                } else  {
                    player.missiles[i].top -= offset;
                }
            }
            if (player.missiles[i] && player.missiles[i].direction === "down"){
                if (player.missiles[i].top + offset > 500){
                    player.missiles.splice(i, 1);
                } else  {
                    player.missiles[i].top += offset;
                }
            }
            if (player.missiles[i] && player.missiles[i].direction === "left"){
                if (player.missiles[i].left - offset < 0){
                    player.missiles.splice(i, 1);
                } else  {
                    player.missiles[i].left -= offset;
                }
            }
            if (player.missiles[i] && player.missiles[i].direction === "right"){
                if (player.missiles[i].left + offset > 500){
                    player.missiles.splice(i, 1);
                } else  {
                    player.missiles[i].left += offset;
                }
            }
            if (player.missiles[i]) {
                if (checkMissilePosition(player.missiles[i])){
                    player.missiles.splice(i, 1);
                };
            }
        }

        if (games[user.game_id]){
            if (games[user.game_id].player1.id){
                io.clients().sockets[games[user.game_id].player1.id].emit('got_missiles', player);
            }
            if (games[user.game_id].player2){
                io.clients().sockets[games[user.game_id].player2.id].emit('got_missiles', player);
            }
        }
    };

    socket.on('move', function(direction) {
        var old_position = user.position;
        user.position = direction;
        if (direction == "left" && field[user.y][user.x - 1] == 0 && user.x - 1 >= 0){
            user.x--;
        }
        if (direction == "right" && user.x + 1 < field[user.y].length && field[user.y][user.x + 1] == 0){
            user.x++;
        }
        if (direction == "up" && field[user.y - 1] && field[user.y - 1][user.x] == 0){
            user.y--;
        }
        if (direction == "down" && field[user.y + 1] && field[user.y + 1][user.x] == 0){
            user.y++;
        }
        
        if (games[user.game_id].player1){
            io.clients().sockets[games[user.game_id].player1.id].emit('update_position', {user, old_position});
        }
        if (games[user.game_id].player2){
            io.clients().sockets[games[user.game_id].player2.id].emit('update_position', {user, old_position});
        }
    });

    socket.on('disconnect', function() {
        users.splice(users.indexOf(user), 1);
        socket.broadcast.emit('disconnect_user', user);
    });
});

app.get('/', function(req, res) {
    res.render("index.ejs");
})