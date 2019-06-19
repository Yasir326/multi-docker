const keys = require('./keys');
const redis = require('redis');

const redistClient = redis.createClient({
    host: keys.rediHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

//you duplicate redislcient because turning it into a listener/publisher
// mutates the instance so you need to alter a clean copy.
const sub = redistClient.duplicate();

function fib(index) {
    if (index < 2) return 1;
    return fib(index -1) + fib(index -2);
}

//Anytime we get a new message, calculate the fibancci value and insert
//into a hash set called 'values' they key will be message(index) and the value
//of the fibinacci sequence is pushed in as well
sub.on('message', (channel, message) => {
    redistClient.hset('values', message, fib(parseInt(message)));
});

//Anytime someone inserts a new value into redis
//we will calculate the value and put it back into redis
sub.subscribe('insert');