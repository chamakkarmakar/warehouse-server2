const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();


// middleware 
app.use(cors());
app.use(express.json());

function jwtVerify(req, res, next) {
    const headerAuth = req.headers.authorization;
    console.log('JWT verification ', headerAuth);
    if (!headerAuth) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = headerAuth.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        console.log("Decoded ", decoded);
        req.decoded = decoded;
    })
    next();
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dpqbd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const inventoryCollection = client.db('warehouseManagement').collection('inventory');
        console.log('warehouse management database connected');

        // Authentication 
        app.post('/login', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ token });
        })

        // load all data 
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = inventoryCollection.find(query);
            const inventories = await cursor.toArray();
            res.send(inventories);
        });

        // load single data
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const inventory = await inventoryCollection.findOne(query);
            res.send(inventory);
        });

        // load myitems data
        app.get('/myitems', jwtVerify, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;

            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = inventoryCollection.find(query);
                const items = await cursor.toArray();
                res.send(items);
            }
            else{
               res.status(403).send({ message: 'Forbidden access' });
            }
        });

        // add product
        app.post('/product', async (req, res) => {
            const newProduct = req.body;
            const result = await inventoryCollection.insertOne(newProduct);
            res.send(result);
        })

        // update quantity (delivered)
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const newQty = req.body;
            // const update = parseInt(newQty);
            // console.log(newQty);
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: newQty.quantity
                }
            };
            const result = await inventoryCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // delete product
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await inventoryCollection.deleteOne(query);
            res.send(result);

        })
    }

    finally {

    }
}
run().catch(console.dir);


// root API 
app.get('/', (req, res) => {
    res.send('Warehouse Management Server2');
})

// listening to port 
app.listen(port, () => {
    console.log('Running Port', port);
})