// Load the TCP Library
var fs = require('fs');
var net = require('net');
var path = require('path');
var express = require('express');
var mysql = require('mysql');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '150mb'}));
app.use(bodyParser.urlencoded({limit: '150mb', extended: true}));

var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'tcp-test',
    timezone: 'utc -3'
});

connection.connect(function(err) {
    if (err) return console.error('error connecting: ' + err.stack);
});

app.get('/', function (req, res) {
    var filename = path.join(__dirname,'views/index.html');
    var html = fs.readFileSync(filename, 'utf8');
    res.send(html);
});
app.post('/data', function (req, res) {
    connection.query("SELECT * FROM data ORDER BY timestamp DESC Limit 30", function(err, rows) {
        if (err) return err;
        res.send(rows);
    });
});
app.post('/active', function (req, res) {
    connection.query("SELECT * FROM active ORDER BY timestamp DESC", function(err, rows) {
        if (err) return err;
        res.send(rows);
    });
});

// Keep track of the chat clients
var clients = [];

// Start a TCP Server
net.createServer(function (socket) {
    app.post('/send', function (req, res) {
        var data = req.body.data;
        var name =req.body.name;
        write(data,name);
        res.send(data +' Enviada Correctamente a '+name)
    });

    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort;

    // Put this new client in the list
    clients.push(socket);

        console.log('Connected : '+socket.name);
        connection.query("" +
            "INSERT INTO " +
            "active (name, timestamp, ip, port) " +
            "VALUES ('"+ socket.name+"', NOW(), '"+socket.remoteAddress+"', '"+socket.remotePort+"');"
            , function(err, rows) {
                if (err) return err;
            });

    setTimeout(function(){
        socket.write("success\n");
    },1000);

    // Handle incoming messages from clients.
    socket.on('data', function (data) {
        if (data != "") {
            connection.query("" +
                "INSERT INTO " +
                "data (data, name, timestamp, ip, port) " +
                "VALUES ('"+data+"', '"+socket.name+"', NOW(), '"+socket.remoteAddress+"', '"+socket.remotePort+"');"
                , function(err, rows) {
                if (err) return err;
            });
            console.log(socket.name + " > " + data+"");
        }
    });

    // Remove the client from the list when it leaves
    socket.on('end', function () {
        connection.query("DELETE FROM active WHERE name = '"+ socket.name +"';");
        clients.splice(clients.indexOf(socket), 1);
        console.log(socket.name + " end.");
    });

    socket.on('close', function () {
        connection.query("DELETE FROM active WHERE name = '"+ socket.name +"';");
        clients.splice(clients.indexOf(socket), 1);
        console.log(socket.name + " closed.");
    });

    socket.on('error', function (error) {
        process.stdout.write('Error:', error);
        connection.query("DELETE FROM active WHERE name = '"+ socket.name +"';");
        clients.splice(clients.indexOf(socket), 1);
        console.log(socket.name + " error.");
    });
    function write(message,to){
        clients.forEach(function (client) {
            if (client.name != to) return;
            client.write(message, function (err) {
                if (err) process.stdout.write('Error', err)
            });
            console.log('SEND :'+to+' > '+ message)
        });
    }
}).listen(3003 ,function () {
    var port = '3003';
    console.log('TCP app listening at http://0.0.0.0:'+port);
});

var server = app.listen(5000, function () {
    var port = server.address().port;
    console.log('HTML app listening at http://0.0.0.0:'+port);
});