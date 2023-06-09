const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7v3zbbp.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// JWT
const verifyJWT = (req , res , next) => {
  const authorization = req.headers.authorization;
  if(!authorization) {
    return res.status(401).send({ error : true , message : 'unauthorized token' })
  }

  const token = authorization.split(' ')[1]
  
  jwt.verify(token , process.env.ACCESS_KEY_SECRET , (error , decoded) => {
    if(error) {
      return res.status(403).send({ error : true , message : 'unathorized access' })
    }
    req.decoded = decoded;
    next()
  })

}

async function run() {
  try {

    // await client.connect();

    const serviceCollection = client.db('carsDoctor').collection('services')
    const bookingsCollection = client.db('carsDoctor').collection('bookings')

    // JWT
    app.post('/jwt' , (req , res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user , process.env.ACCESS_KEY_SECRET , { expiresIn : '1h' })
      res.send({token})
    })

    app.get('/services' , async(req , res) => {
        const sort = req.query.sort;
        const search = req.query.search;
        const query = { title : { $regex : search , $options : 'i' } };
        const options = {
          sort : {
            'price' : sort === 'asc' ? 1 : -1
          }
        }
        const cursor = serviceCollection.find(query , options);
        const result = await cursor.toArray();
        res.send(result);
    })


    app.get('/services/:id' , async(req , res) => {
        const id = req.params.id;
        const query = new ObjectId(id)
        const options = {
            projection: { title : 1 , price : 1 , service_id : 1 , img : 1 }
        }
        const result = await serviceCollection.findOne(query , options)
        res.send(result)
    })

    // Bookings

    app.get('/bookings' , verifyJWT , async(req , res) => {
      const decoded = req.decoded;
      console.log(decoded)

      if(decoded.email !== req.query.email) {
        return res.status(403).send({ error : 1 , message : 'forbidden access' })
      }

      let query = {};
      if (req.query?.email) {
        query = { email : req.query.email }
      }

      const result = await bookingsCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/bookings' , async(req , res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking)
      res.send(result)
    })

    app.patch('/bookings/:id' , async(req , res) => {
      const id = req.params.id;
      const filter = { _id : new ObjectId(id) } 
      const updateBooking = req.body;

      const updateDoc = {
        $set : {
          status : updateBooking.status
        }
      }

      const result = await bookingsCollection.updateOne(filter , updateDoc)
      res.send(result)
    })

    app.delete('/bookings/:id' , async(req , res) => {
      const id = req.params.id;
      const query = { _id : new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {

    // await client.close();

  }
}
run().catch(console.dir);


app.get('/' , (req , res) => {
    res.send('Car Doctor is running')
})

app.listen(port , () => {
    console.log(`Cars doctor is running on ${port}`)
})

//  