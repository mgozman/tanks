var fieldDic = {
    0: 'blank',
    1: 'wall',
    2: 'white_brick',
    3: 'eagle',
};
function drawPlayer(player){   
    document.getElementById(`player${player.id}`).style.top  = player.y * 40 + 'px';
    document.getElementById(`player${player.id}`).style.left  = player.x * 40 - 15 + 'px';
}

function removeBOOM(id){
    setTimeout(function(){ 
        $(`#boom_${id}`).remove();
    }, 300);
}

function removeEnemy(id, player1, player2){
    setTimeout(function(){ 
        $(`#enemy_${id}`).remove();
        $('#player1_killed').html(`<div id = player1_killed>Killed: ${player1.killed}</div>`);
        if (player2 != null){
            $('#player2_killed').html(`<div id = player2_killed>Killed: ${player2.killed}</div>`)
        }
    }, 500);
}

function drawEnemies (enemies){
    content = "";
    for (let i = 0; i < enemies.length; i++){
        content += `<div class = 'enemy enemy_${enemies[i].position}' id = enemy_${i} style = 'left : ${enemies[i].x * 40 - 15}px; top : ${enemies[i].y * 40}px'></div>`;
    }
    $('#enemies').html(content);

    for (let i = 0; i < enemies.length; i++){
        drawMissiles(enemies[i]);
    }
}

function drawEnemy (enemy, id){
    content = `<div class = 'enemy enemy_${enemy.position}' id = enemy_${id} style = 'left : ${enemy.x * 40 - 15}px; top : ${enemy.y * 40}px'></div>`;
    $('#enemies').append(content);
}

function drawMissiles (player){
    content = "";
    for (let i = 0; i < player.missiles.length; i++){
        content += `<div class = missile style = 'left : ${player.missiles[i].left}px; top : ${player.missiles[i].top}px'></div>`;
    }
    $('#missiles').html(content);
}

function game_over() {
    $('#page').addClass("game_over");
    $('#page').html('Game Over!');
}

function win () {
    $('#page').addClass("game_over");
    $('#page').html('Congratulation!');
}

function close(){
    socket.emit("disconnect", 0);
}

function onclick(id){
    name = $("#name").val();
    socket.emit("got_a_new_user", name, id);
    $("#get_name").remove();
}

function drawField(){
    let outform = '';
    for (let i = 0; i < field.length; i++){
        outform += "<div class = 'row'>";
        for (let y = 0; y < field[i].length; y++){
            outform += `<div class = 'cell ${fieldDic[field[i][y]]}' id = ${i}${y}></div>`;
        }
        outform += "</div>";
    }
    $("#field").html(outform);

    $('#field').append('<div id = boom></div>');
    $('#field').append('<div id = enemies></div>');

    $('#field').after("<div id = info></div>")
    $("#page").css("padding", "40px");
}