const config = {
    type: Phaser.AUTO,
    width: window.innerHeight * .75,
    height: window.innerHeight,
    pixelArt: true,
    canvasStyle: "border-radius: 10px",
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: {y: window.innerHeight * 1.5 }
        }
    }
};

const socket = io();
let id = null;

//variables

let pipes = [];
let PIPES = [];

let players = {};
let player;

let dead = false;
let canJump = true;

const ratio = 320 / 52;

const speed = 100;
let x = 0;

let t = 0;

let pipeWidth = null;
let lastPipeX = pipeWidth;

//client - server

socket.on("setId", (data) => {
    id = data;
})

socket.on('pipes', (data) => {
    pipes = data;
});

socket.on("updatePlayer", (data) => {
    const id = data.id;
    const pos = data.data;

    if (!players[id] || id === socket.id) return;

    console.log("neighbor X = "+pos[0]+", our x = "+x);

    const X = pos[0] - x;
    const y = pos[1];
    const angle = pos[2];

    players[id].x = X;
    players[id].y = y;
    players[id].angle = angle;
});

let game = new Phaser.Game(config);

//functions

function playerDie() {
    if (dead) return;
    dead = true;
    canJump = false;

    dieSound.play();

    gameOver.setDepth(10);

    setTimeout(() => {
        gameOver.setDepth(-3);

        socket.emit("dead");

        dead = false;
        canJump = true;

        x = 0;
        player.y = 200;
        player.angle = 0;

        lastPipeX = pipeWidth;

        PIPES.forEach(pipe => {
            pipe.destroy();
        });

        player.body.checkCollision.none = false;

        PIPES = [];
        pipes = [];
    }, 3000);

    player.body.checkCollision.none = true;
}

function createPipe(y) {
    let pipe = this.physics.add.image(game.scale.width + player.displayWidth, game.scale.height / 2 + game.scale.height * y, "pipe");
    pipe.setImmovable(true);
    pipe.displayWidth = player.displayWidth * 2;
    pipe.displayHeight = pipe.displayWidth * ratio;
    pipe.setDepth(-1);
    pipe.body.allowGravity = false;
    pipe.body.setSize(pipe.width, pipe.height, true);

    let pipe2 = this.physics.add.image(game.scale.width + player.displayWidth, game.scale.height / 2 + game.scale.height * y - player.height * 6 - pipe.displayWidth * ratio, "pipe");
    pipe2.setImmovable(true);
    pipe2.angle = 180;
    pipe2.displayWidth = player.displayWidth * 2;
    pipe2.displayHeight = pipe.displayWidth * ratio;
    pipe2.setDepth(-1);
    pipe2.body.allowGravity = false;
    pipe2.body.setSize(pipe2.width, pipe2.height, true);

    PIPES.push(pipe);
    PIPES.push(pipe2);

    this.physics.add.collider(player, pipe, playerDie);
    this.physics.add.collider(player, pipe2, playerDie); 
}

function updatePercentage(percent) {
    /*statsBar.clear();
    statsBar.fillStyle(0xcfa563);
    statsBar.fillRect(20, 20, game.scale.width - 40, 20);
    statsBar.fillStyle(0x00ff00);
    statsBar.fillRect(20, 20, (game.scale.width - 40) * (percent / 100), 20);*/
}

//phaser functions

function preload(){
    this.load.image("player", "Images/yellowbird-midflap.png");
    this.load.image("background", "Images/background-day.png");
    this.load.image("pipe", "Images/pipe-green.png");
    this.load.image("base", "Images/base.png");

    this.load.image("gameover", "UI/gameover.png");

    this.load.audio("jump", "SoundEffects/wing.wav");
    this.load.audio("die", "SoundEffects/die.wav");
}

function create() {
    //background
    background = this.add.image(game.scale.width / 2 + 1, game.scale.height / 2, "background");
    background.displayWidth = game.scale.width;
    background.displayHeight = game.scale.height;

    background.setDepth(-2);

    //base
    base = this.physics.add.image(game.scale.width / 2 + 1, game.scale.height * 0.9, "base");
    base.displayWidth = game.scale.width;
    base.displayHeight = base.displayWidth * (112 / 360);
    base.setImmovable(true);
    base.body.allowGravity = false;

    base.setDepth(0);

    //player
    player = this.physics.add.image(200, 200, "player");
    player.displayHeight = game.scale.height * 0.06;
    player.displayWidth = player.displayHeight * 1.42;
    player.setCollideWorldBounds(true);

    player.setDepth(1);

    this.physics.add.collider(player, base, playerDie);

    socket.emit("requestPlayers", players);

    socket.on("playerAdded", (id) => {
        console.log("new player.")
        if (id === socket.id) return;

        console.log(id);
    
        players[id] = this.add.image(200, 200, "player");
    
        players[id].displayHeight = game.scale.height * 0.06;
        players[id].displayWidth = players[id].displayHeight * 1.42;
    });

    //keyboard
    cursors = this.input.keyboard.createCursorKeys();

    //interface
    statsBar = this.add.graphics();
    statsBar.setDepth(10);
    statsBar.x = 0;
    statsBar.y = 5;

    updatePercentage(0);

    gameOver = this.add.image(game.scale.width / 2, game.scale.height / 2, "gameover");
    gameOver.setDepth(-3);

    //sounds
    jumpSound = this.sound.add("jump");
    dieSound = this.sound.add("die");
}

function update(time, delta) {
    const dt = delta / 1000;

    pipeWidth = player.displayWidth * 2;

    t += dt;
    if (t > 0.3) {
        t = 0;
        socket.emit("updatePlayer", [x, player.y, player.angle]);
    }

    if ((cursors.space.isDown || cursors.up.isDown) && canJump) {
        player.setVelocityY(-window.innerHeight * 0.5);

        player.angle = -30;
        canJump = false;

        jumpSound.play();

        setTimeout(() => {
            canJump = true;
        }, 150);
    }

    if (pipes.length > 0 && lastPipeX > pipeWidth * 3) {
        createPipe.call(this, pipes.shift());

        lastPipeX = 0;

        updatePercentage(100 * (40 - pipes.length) / 40);
    }

    PIPES.forEach(pipe => {
        if (dead) return;
        pipe.x -= dt * speed;
        if (pipe.x < -100) {
            pipe.destroy();
            PIPES.shift();
        }
    });

    player.angle = Math.min(90, player.angle + 60 * dt);

    if (dead == false) {
        x += dt * speed;
        lastPipeX += dt * speed;
    }

    //resize
    game.scale.resize(window.innerHeight * .75, window.innerHeight);

    pipeWidth = player.displayWidth * 2;

    player.displayHeight = game.scale.height * 0.06;
    player.displayWidth = player.displayHeight * 1.42;

    background.displayWidth = game.scale.width;
    background.displayHeight = game.scale.height;

    background.x = game.scale.width / 2 + 1;
    background.y = game.scale.height / 2;

    base.displayWidth = game.scale.width;
    base.displayHeight = base.displayWidth * (112 / 360);

    base.y = game.scale.height * 0.9;
    base.x = game.scale.width / 2 + 1;

    updatePercentage(100 * (40 - pipes.length) / 40);
}