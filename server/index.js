const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
// Cors (cross origin resource sharing), enables us to make requests from one domain
// i.e. the one our react app will be running on, to a completely different domain 
// or port (in this instance), where the express api is hosted on.
app.use(cors());
// Bodyparser parses incoming request from the react app and turn the body of the POST
// request into a json value that the express API can easily work with.
app.use(bodyParser());

// Postgres Client setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

//Anytime and error with a connection occurs, out put error message
pgClient.on('error', () => console.log("Lost PG connection"));

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(err => console.log(err));

    // Redis client setup
    const redis = require('redis');
    const redisClient = redis.createClient({
        host: keys.redisHost,
        port: keys.redisPort,
        retry_strategy: () => 1000
    });

    // Using duplicate because if you have a client listening or publishing information
    // on redis, you have to make a duplicate connection bebcause when a connection is listening
    // subscribe or publish information it cannot be used for other purposes.
    const redisPublisher = redisClient.duplicate();

    // Express route handlers

    // Anyt time someone makes a request to the root route of express
    // application send back response 'Hi"
    app.get('/', (req, res) => {
        res.send('Hi');
    });


    // query postgres and retrieve all the values that have ever been
    // submitted to postgres
    app.get('/values/all', async(req, res) => {
        const values = await pgClient.query('SELECT * from values');
        
        res.send(values.rows);
    });

    app.get('/values/current', async (req, res) => {
        redisClient.hgetall('values', (err, values) =>{
            res.send(values);
        });
    });

    // recieve new values from the react application, by listening for a post request
    app.post('/values', async (req, res) => {
        const index = req.body.index;

        if (parseInt(index) > 40) {
            return res.status(422).send("INDEX IS TOO DAMN HIGH!!");
        }

        redisClient.hset('values', index, 'Nothing yet');
        // Pull new value out of redis and start calculating fib
        redisPublisher.publish('insert', index);
        // Take submitted index and perminantly store it inside postgres
        pgClient.query('INSERT INTO values(number) VALUES $1', [index]);

        res.send({working: true});

    });

    app.listen(5000, err => {
        console.log('Listening on Port 5000')
    });