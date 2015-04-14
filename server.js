var net = require('net');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
/*
 var arp = require('arp-table')();
 var parse = require('arp-parse')();
 var through = require('through');
 var filter = require('stream-filter')(function(device) {
 return !!device.mac
 });
 */
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser());
var tcp = net.createServer();
var devices = [];
var host = '0.0.0.0';
var tcpPort = 6969;
var httpPort = 8000;


app.get('/', function (req, res) {
    res.render('pages/index');
});
app.get('/about', function (req, res) {
    res.render('pages/form');
});

app.get('/example', function (req, res) {
    var sensors = [
        {name: 'sensor1', value: 0},
        {name: 'sensor2', value: 0}
    ];
    res.render('pages/example', {
        sensors: sensors
    });
});

app.post('/example', function (req, res) {
    var sensor1 = req.body.sensor1,
        sensor2 = req.body.sensor2;
    var sensors = [
        {name: 'sensor1', value: sensor1},
        {name: 'sensor2', value: sensor2}
    ];
    res.render('pages/example', {
        sensors: sensors
    });

    //Send data to all devices
    devices.forEach(function (device) {
        device.write('{1:' + sensor1 + ',2:' + sensor2 + '}');
    });
    console.log('DEVICES : {1:' + sensor1 + ',2:' + sensor2 + '}');

});
// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection


tcp.on('connection', function (sock) {
    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
    sock.name = sock.remoteAddress + ":" + sock.remotePort;
    devices.push(sock);

});

tcp.on('data', function (data) {
    console.log('DATA ' + sock.remoteAddress + ': ' + data);
    // Write the data back to the socket, the client will receive it as data from the server
    sock.write('You said "' + data + '"');
});

tcp.on('close', function (sock) {
    console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
    sock.name = sock.remoteAddress + ":" + sock.remotePort;
    var index = devices.indexOf(sock);
    if (index > -1) {
        devices.splice(index, 1);
    }
});

app.listen(httpPort, host);
tcp.listen(tcpPort, host);

console.log('Server TCP/IP listening on ' + host + ':' + tcpPort);
console.log('Server HTTP listening on ' + host + ':' + httpPort);
