$(document).ready(function (){
    var socket = io(); 
    var name = "";
    document.body.onunload = close();
    let user;
    
    var boom_id = 0;

    function close(){
        socket.emit("disconnect", 0);
    }

    function onclick(id){
        name = $("#name").val();
        socket.emit("got_a_new_user", name, id);
        $("#get_name").remove();
    }

    socket.on('getName', function (games) {
        output = '<form action = "/" class = "get_name effect2 box"><input name = name placeholder = "Your name: " class="form-control" id = name value = "Mariia"><input type = hidden value = "">';
        output += '<button class = btn_submit id = submit type = submit> Single Player! </button></form>';
        output += '<div class = table_players>';
        for (let i = 0; i < games.length; i++){
            if (games[i].player2 == null){
                output += `<div>${games[i].player1.name}<input type = hidden name = id value = ${games[i].player1.game_id}><button class = btn_submit> Join</button></div><hr>`;
            }
        }
        output += '</div>';
        document.getElementById("get_name").innerHTML = output;

        $('button').click(function() {
            let id = $(this).prev().val() == null ? -1 : $(this).prev().val();                    
            onclick(id);
            return false;
        });
    });

    socket.on('second_player', function(player){        
        $('#field').append(`<div class = 'cell player player${player.player}_${player.position}' id = player${player.id}></div><div id = missiles></div>`);
        $('#info').append(`<div id = player2>Player 2: ${player.name}</div>`);
        $('#player2').append(`<div id = player2_killed>Killed: ${player.killed}</div>`);
        drawPlayer(player);
    })

    socket.on('remove_player', function(player){
        console.log('player.player ' + player.player);
        $(`#player${player.id}`).remove();
    })
    
    socket.on('new_field_cell', function(data){
        $(`#${data.y}${data.x}`).removeClass(`${fieldDic[field[data.y][data.x]]}`);
        $(`#${data.y}${data.x}`).addClass(`${fieldDic[0]}`);
        field = data.field; 
    });

    socket.on("get_field", function(data) {
        user = data.user;
        field = data.field;
        drawField();

        //draw player 1 and 2
        $('#field').append(`<div class = 'cell player player${data.game.player1.player}_${data.game.player1.position}' id = player${data.game.player1.id}></div><div id = missiles></div>`);
        drawPlayer(data.game.player1);
        if (data.game.player2){ 
            $('#field').append(`<div class = 'cell player player${data.game.player2.player}_${data.game.player1.position}' id = player${data.game.player2.id}></div><div id = missiles></div>`);
            drawPlayer(data.game.player2);
        }

        //draw info table
        $('#info').append(`<div id = player1>Player 1: ${data.game.player1.name}</div>`);
        $('#player1').append(`<div id = player1_killed>Killed: ${data.game.player1.killed}</div>`);
        if (data.game.player2){
            $('#info').append(`<div id = player2>Player 2: ${data.game.player2.name}</div>`);
            $('#player2').append(`<div id = player2_killed>Killed: ${data.game.player2.killed}</div>`);
        }

        socket.on("disconnect_user", function(user) {
            $("#" + user.id).remove();
        });
    });

    socket.on("boom", function(data){
        //show boom
        id = boom_id;
        let offset_x = 0;
        let offset_y = 0;

        if (data.direction == 'left'){
            offset_x = -15;
            offset_y = -10;
        }
        if (data.direction == 'up'){
            offset_x = 2;
            offset_y = -30;
        }
        if (data.direction == 'down'){
            offset_x = 5    ;
            offset_y = 10;
        }
        if (data.direction == 'right'){
            offset_x = 25;
            offset_y = -10;
        }
        content = `<div class = boom id = boom_${boom_id} style = 'left : ${data.x * 40 - offset_x}px; top : ${data.y * 40 - offset_y}px'></div>`;
        
        $('#boom').append(content);
        boom_id++;
        removeBOOM(id);
    });

    socket.on('update_position', function (data) {
        if (data.user.id == user.id){
            user = data.user;
        }
        
        $(`#player${data.user.id}`).removeClass(`player${data.user.player}_${data.old_position}`);
        $(`#player${data.user.id}`).addClass(`player${data.user.player}_${data.user.position}`);   
        drawPlayer(data.user);
    });

    socket.on('got_missiles', function(player){
        if (user.id == player.id){
            user.missiles = player.missiles;
        }
        drawMissiles(player);
    });

    socket.on('got_enemy', function(enemy, id){
        drawEnemy(enemy, id);
        drawMissiles(enemy);
    });

    socket.on('remove_enemy', function (id, player1, player2){
        console.log('remove enemy ' + id + player1.killed);
        if (player2 != null){
            console.log(player2.killed);
        }
        removeEnemy(id, player1, player2);
    })

    socket.on('move_enemies', function(enemies){
        drawEnemies(enemies);
    })

    document.onkeydown = function(e){
        if(e.keyCode == 37){
            socket.emit("move", "left");
        }
        if(e.keyCode == 39){
            socket.emit("move", "right");
        }   
        if(e.keyCode == 40){    
            socket.emit("move", "down");
        }
        if(e.keyCode == 38){                    
            socket.emit("move", "up");
        }
        if (e.keyCode == 87) {
            socket.emit("new_missiles");
        };
        drawPlayer(user);
    }
    
    socket.on('game_over', function(){
        $('#136').removeClass('eagle').addClass('eagle_boom');
        setTimeout(game_over(), 5000);
    })

    socket.on('win', function(){
        win();
    })
})
