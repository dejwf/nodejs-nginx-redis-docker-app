'use strict';
const os = require('os');
const assert = require('assert');

console.log( os.hostname() )
const express = require('express');
const app = express();
const redis = require('redis');
const client = redis.createClient('6379', 'redis');
client.monitor(function (err, res) {
    console.log("Redis: Entering monitoring mode.");
});
client.on("monitor", function (time, args, raw_reply) {
    console.log(time + ": " + args); // 1458910076.446514:['set', 'foo', 'bar']
});



var nodeRestarts, clientsCnt, hostnameStart;
client.get("starts", function (err, reply) {
    if (err) return next(err);
    console.log(reply)
    nodeRestarts = reply ? reply : 0
});

client.get("clients", function (err, reply) {
    if (err) return next(err);
    console.log(reply)
    clientsCnt = reply ? reply : 0
});

client.get("hostname_"+os.hostname(), function (err, reply) {
    if (err) return next(err);
    console.log(os.hostname() + "->" + reply)
    hostnameStart = reply ? reply : 0
});


client.on('error', (err) => {
    console.log('Error ' + err);
})

client.on('connect', function() {
    console.log('==== connected to redis ====')
    client.incr("starts", function (err, restarts, next){
        console.log(`increasing the starts count: ${restarts} for docker cont. ${os.hostname()}`)
    })
})

app.get('/', async function(req, res){
    res.send(
        `<p>
        clientsCalls: ${clientsCnt}<p>
        host starts cnt: ${hostnameStart}<p>
        hostname: ${os.hostname()}`
    );

})

app.get('/clients', function(req, res){
    client.incr('clients', function (err, clients, next) {
        if (err) return next(err);
        res.send(`This page has been viewed ${clients} times! ( init. client count ${clientsCnt} )`);
        assert(clientsCnt < clients, `The amount of saved client counts (${clients}) is SMALLER than init. client count (${clientsCnt})`)
        clientsCnt = clients
    })
})


app.get("/info", function(req, res){
    client.get("nodeinfo", function(err, reply, next) {
        if (err) return next(err);
        res.send(JSON.parse(reply))
    })
})

const port = 3030;
app.listen(port, function() {
    var obj = {
        "hostname" : os.hostname(),
        "start_count" : hostnameStart
    }
    obj = JSON.stringify(obj)
    client.set("nodeinfo", obj)
    console.log(`server listen port: ${port}`)
    console.log(`DEBUGGER: ${obj}`)
    client.incr("hostname_"+os.hostname())
})