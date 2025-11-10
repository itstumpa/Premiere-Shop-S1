require('dotenv').config();
const express = require('express')

const cors = require('cors')
// require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const admin = require("firebase-admin");
const port = process.env.PORT || 3000

const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
// var serviceAccount = require("./firebase-adminsdk-fbsvc-469d75a788.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// app.use(cors({
//       origin: "http://localhost:5173",
//       credentials: true
// }));

app.use(
  cors({
    origin: ["http://localhost:5173","https://premiere-shop.netlify.app", "https://smart-deals-346de.web.app"],
    credentials: true,
  })
);



app.use(express.json());




// verifyFireBaseToken 

const verifyFireBaseToken = async (req, res, next) => {
const authorization = req.headers.authorization;
if(!authorization){
      return res.status(401).send({ message: 'unauthorized access'})
}
    const token = req.headers.authorization.split(' ')[1];
    try {

        const decoded = await admin.auth().verifyIdToken(token);
        console.log('after token validation', decoded);
        req.token_email = decoded.email;
        next();
    }
catch (error) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
}





const verifyJWTToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  const token = authorization.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  // ✅ Use same secret and algorithm
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) {
      console.log('JWT verify error:', err);
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.token_email = decoded.email;
    next();
  });
};


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ielazur.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
  
// const db = client.db ("smartdbuser")

app.get('/', (req, res) => {
  res.send('smart server is running!')
})


async function run() {
  try {
    
//     await client.connect();

const db = client.db('smart_db');
const productsCollection = db.collection('products');
const bidsCollection = db.collection('bids');
const usersCollection = db.collection('users');


// jwt 
app.post('/getToken', (req, res) => {
            const loggedUser = req.body;
            const token = jwt.sign(loggedUser, process.env.JWT_SECRET, { expiresIn: '5h' })
            res.send({ token: token })
        })






// users api 
app.post('/users', async (req, res) => {
const newUser = req.body;
console.log('new user', newUser)
const email = req.body.email;
const query = { email: email }
const existingUser = await usersCollection.findOne(query);
if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
}
else{

      const result = await usersCollection.insertOne(newUser);
           res.send(result);
}})


// products api 
app.get('/products', async(req, res) =>{
      console.log(req.query)
      const email = req.query.email;
      const query = {}
      if (email){
            query.email = email;
      }
const cursor = productsCollection.find(query);
const result = await cursor.toArray();
      res.send(result);

});

app.get('/latest-products', async (req, res) =>{
      const cursor = productsCollection.find().sort({created_at: -1}).limit(6);
      const result = await cursor.toArray();
      res.send(result);

})

app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: (id)}
      const result = await productsCollection.findOne(query);
      res.send(result);
})





app.post('/products', async(req, res) =>{
      console.log('headers in the post', req.headers)
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
})

app.patch('/products/:id', async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const query = {_id: new ObjectId(id)}
      const update = {
            $set: {
                  name: updatedProduct.name,
                  price: updatedProduct.price
            }
      }
      const result = await productsCollection.updateOne(query, update)
      res.send(result);

})

app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await productsCollection.deleteOne(query);
      res.send(result);
})

// firebase 
// app.get('/bids', verifyFirebaseToken,  async (req, res) => {
//       const email = req.query.email;
//       console.log('')
//       const query = {};
//       if (email){
//             query.buyer_email = email;
//       }
//       // verify user have access to see this data
//       if(email !== req.token_email){
//                   return res.status(403).send({message: 'forbidden access'})
//             }
//       const cursor = bidsCollection.find(query);
// const result = await cursor.toArray();
//       res.send(result);
// })



// Send token to the server and verify token jwt
app.get('/bids', verifyJWTToken,  async (req, res) => {
      const email = req.query.email;
      console.log('')
      const query = {};
      if (email){
            query.buyer_email = email;
      }
      // verify user have access to see this data
      if(email !== req.token_email){
                  return res.status(403).send({message: 'forbidden access'})
            }
      const cursor = bidsCollection.find(query);
const result = await cursor.toArray();
      res.send(result);
})








app.get('/products/bids/:productId', verifyJWTToken, async (req, res) => {
            const productId = req.params.productId;
            const query = { product: productId }
            const cursor = bidsCollection.find(query).sort({ bid_price: -1 })
            const result = await cursor.toArray();
            res.send(result);
        })

// bids related api 

// app.get('/bids', logger, verifyFireBaseToken,  async (req, res) => {
//       console.log('headers', req.headers)
//       const email = req.query.email;
//       const query = {};
//       if (query.email){
//             if(email !== req.token_email){
//                   return res.status(403).send({message: 'forbidden access'})
//             }
//             query.buyer_email = email;
//       }
//             const cursor = bidsCollection.find(query);
//             const result = await cursor.toArray();
//             res.send(result);

// })



app.post('/bids', async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
})



 app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        })


//     await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
//     await client.close();
  }
}
run().catch(console.dir);










app.listen(port, () => {
  console.log(`smart server app listening on port ${port}`)
})
