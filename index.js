const express = require("express")
const jwt = require('jsonwebtoken')
const cookiesParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;

// middleware 
app.use(cookiesParser())
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}))
app.use(express.json())



// logger middleware
const logger = async(req,res,next)=>{
  console.log('this is url method', req.method,req.url)
  next()
}

// varify token 
const varifyToken = async(req,res,next)=>{
   const token = req.cookies.accessToken;
  //  console.log(token)
   if(!token){
    return res.status(401).send({massage:'unAuthrized you dont have a any token '})
   }
   jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
     if(err){
      return res.status(401).send({massage: 'unAuthrized because your token is not verified '})
     }
     req.validUser = decoded;
     next()
   })
   
}

console.log("token",process.env.ACCESS_TOKEN_SECRET)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ytj0kf8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("carDoctor");
    const serviceCollection = database.collection("services");
    const bookingCollection = database.collection('booking')


    // create a api token  
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('this is ', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1s" })

      res
        .cookie('accessToken', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send({ success: true })
    })

    // create a api for logOut the when token is expire
    app.post('/logOut', async (req, res) => {
      const user = req.body;
      console.log('this is loggout user',user)
      res
        .clearCookie('accessToken',{maxAge:0})
        .send({ success: true })
    })

    // this is service api 
    app.get('/services',logger, async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, img: 1, service_id: 1, price: 1 },
      };
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })

    // update booking use this api
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const updateBooking = req.body;
      console.log(updateBooking)
      const updateDoc = {
        $set: {
          status: updateBooking.status
        }
      }
      const result = await bookingCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    app.get('/bookings',varifyToken, async (req, res) => {
      console.log(req.query.email,'tmi hoila booking kora user')
      console.log('this is valid user info',(req.validUser))
      // console.log('this is cookies come to the client side', req.cookies.accessToken)
      // if(req.query.email !== req.validUser.email){
      //   return res.status(403).send({massage:'forbitten error unAuthorizes access'})
      // }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      //  console.log(booking)
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('doctor is running')
})

app.listen(port, () => {
  console.log(`car dorcotr server port is ${port}`)
})