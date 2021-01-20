const app = require('express')();
const { equal } = require('assert');
var cors = require('cors');
const http = require('http').Server(app);
//const io = require('socket.io')(http, { origins: ['http://localhost:4200', "*:*"], transports: ['polling', 'flashsocket'] });
var corsOptions = {
    origin: ["http://localhost:4200", "https://tresor.victordurand.fr", "https://rhumpa-loopa.eu"],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

const io = require("socket.io")(http, {
    cors: {
        origin: ["http://localhost:4200", "https://tresor.victordurand.fr", "https://rhumpa-loopa.eu"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket']
});


let connectedUsers = [];

let winners = [];

io.on("connection", socket => {
    socket.on('user.login', username => {
        if (userExists(username)) {
            console.warn(`User ${username} already connected`);
        } else {
            const user = {
                username: username,
                score: 0
            }
            connectedUsers.push(user);
            console.log(`${username} is connected successfully`);
            socket.to("admin").emit("admin.new.logs", `${username} vient de se connecter`);
        }
        socket.emit('users.list.updated', connectedUsers);
        socket.broadcast.emit('users.list.updated', connectedUsers);
        socket.once('disconnect', reason => {
            console.log(`${username} has disconnected`);
            const index = getUserIndex(username);
            if (index !== -1)
                connectedUsers.splice(index, 1);
            socket.broadcast.emit('users.list.updated', connectedUsers);
        });
    });


    socket.on('game.step.success', obj => {
        console.log(`${obj.username} a réussi l'épreuve du ${obj.step} !`);
        socket.to("admin").emit("admin.new.logs", `${obj.username} a réussi l'épreuve du ${obj.step} !`);
        addPoint(obj.username);
        socket.emit("users.list.updated", connectedUsers);
        socket.broadcast.emit("users.list.updated", connectedUsers);

        const user_index = getUserIndex(obj.username);
        if (connectedUsers[user_index].score == 300) {
            this.winners.push(connectedUsers[user_index]);
            console.log(`${obj.username} a terminé la chasse au trésor`);
            socket.to("admin").emit("admin.new.logs", `${obj.username} a terminé la chasse au trésor à la position : ${this.winners.length}`);
        }
    })


    socket.on('user.disconnect', user => {
        console.log(`${username} has disconnected`);
        socket.to("admin").emit("admin.new.logs", `${username} has disconnected`);
        const index = getUserIndex(username);
        if (index !== -1)
            connectedUsers.splice(index, 1);
        socket.broadcast.emit('users.connected', connectedUsers);
    });



    socket.on('game.start', () => {
        socket.broadcast.emit('game.started', true);
    });


    socket.on("admin.new.connection", () => {
        socket.join("admin");
        socket.to("admin").emit("admin.new.logs", "Un nouvel administrateur s'est connecté !");
    });


    socket.on("admin.waiting.message", (message) => {
        socket.broadcast.emit("waiting.message", message);
    })
});
app.get("/connected_users", cors(corsOptions), (req, res) => {
    res.send(getActiveUsers());
})

app.get("/user_exists", cors(corsOptions), (req, res) => {
    const email = req.query.email;
    res.send(userExists(email));
});

app.get("/winners", cors(corsOptions), (req, res) => {
    res.send(winners);
});


function getActiveUsers() {
    return connectedUsers;
}

function userExists(username) {
    for (i = 0; i < connectedUsers.length; i++) {
        if (connectedUsers[i].username == username) {
            return true;
        }
    }
    return false;
}

function getUserIndex(username) {
    for (i = 0; i < connectedUsers.length; i++) {
        if (connectedUsers[i].username == username) {
            return i;
        }
    }
    return -1;
}

function addPoint(username) {
    const user_index = getUserIndex(username);
    if (connectedUsers[user_index]) {
        connectedUsers[user_index].score += 100
    }
}



http.listen(process.env.PORT || 3000);