var http = require('http'),
	express = require('express'),
	cors = require('cors'),
	app = express(),
	utils = require('./utils.js'),
	dbLayer = require('./database.js'),
	io = null,
	clients = {},
	port = process.env.PORT || 5000;

app.use(cors());
dbLayer.initDB();

var server = http.createServer(app);
io = require('socket.io').listen(server);
server.listen(port);

io.sockets.on('connection', function(socket) {
	registerSocket(socket);

	socket.on('get-users-list', function(data) {
		getUsersList(socket, data);
	});

	socket.on('add-user', function(data) {
		addUser(socket, data);
	});

	socket.on('update-user', function(data) {
		updateUser(socket, data);
	});

	socket.on('delete-user', function(data) {
		deleteUser(socket, data);
	});

	socket.on('delete-all-user', function(data) {
		deleteAllUsers(socket, data);
	});

	//Removing the socket on disconnect
	socket.on('disconnect', function() {
		disconnectClient(socket);
	});
});

function registerSocket(socket) {
	clients[socket.id] = socket;
}

function getUsersList(socket, data) {
	dbLayer.listRecords('id_member', 'DESC', 100, function(resp) {
		if (socket) {
			socket.emit('users-list-resp', resp);
		} else {
			io.sockets.emit('users-list-resp', resp);
		}
	});
}

function addUser(socket, data) {
	dbLayer.insertRecords(fullBody, function(resp) {
		if (!resp.success) {
			socket.emit('add-user-resp', resp);
		} else {
			getUsersList();
		}
	});
}

function updateUser(socket, data) {
	dbLayer.updateRecord('id_member', data.userId, data.userData, function(resp) {
		socket.emit('update-user-resp', resp);
		if (resp.success) {
			getUsersList();
		}
	});
}

function deleteUser(socket, data) {
	dbLayer.deleteRecord('id_member', data.userId, function(resp) {
		if (!resp.success) {
			socket.emit('delete-user-resp', resp);
		} else {
			getUsersList();
		}
	});
}

function deleteAllUsers(socket, data) {
	dbLayer.deleteMutipleRecords('id_member', data.userIds, function(resp) {
		if (!resp.success) {
			socket.emit('delete-all-user-resp', resp);
		} else {
			getUsersList();
		}
	});
}

function disconnectClient(socket) {
	delete clients[socket.id];
}
