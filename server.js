require ('dotenv').config();

const express = require("express"),
    cookie = require ('cookie-session'),
    { MongoClient, ObjectId } = require("mongodb"),
    app = express()
app.use( express.urlencoded({ extended:true }) )

app.use( express.json() )

app.use(cookie({
  name: 'session',
  keys: ['key1', 'key2']
}))

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.PASS}@${process.env.HOST}`
console.log( 'uri:', uri )
const client = new MongoClient( uri )
let collection = null
let users = null
async function run() {
  await client.connect();
  collection = await client
      .db('tvTracker')
      .collection('shows')
  users = client
      .db('tvTracker')
      .collection('users')
}

run()
//check connection
app.use( (req,res,next) => {
  if( collection !== null && users !== null) {
    next()
  }else{
    res.status( 503 ).send()
  }
})

app.use('/css', express.static('public/css'))
//make login page default
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html')
})

//handles login auth
app.post('/login', async(req, res) => {
  const username = req.body.username
  const password = req.body.password
  const user = await users.findOne({
    username: username
  })

  //make new user if one doesnt exist
  if (user === null) {
    await users.insertOne({
      username: username,
      password: password
    })
    req.session.login = true
    req.session.username = username
    res.redirect('index.html')
  } else if (user.password === password) {
    req.session.login = true
    req.session.username = username
    res.redirect('index.html')
  } else {
    res.sendFile(__dirname + '/public/login.html')
  }
})


//send unauthenticated users to login page
app.use( function( req,res,next) {
  if( req.session.login === true )
    next()
  else
    res.sendFile( __dirname + '/public/login.html' )
})
app.use( express.static( 'public' ) )

app.get('/user', (req, res) => {
  res.json({
    username: req.session.username,
  })
})

app.post('/logout', (req, res) => {
  req.session = null
  res.redirect('/public/login.html')
})

//display results table
app.get('/results', async (req, res) => {
  const appdata = await collection.find({
    username: req.session.username
  }).toArray()
  res.json(appdata)
})

//create new show
app.post('/submit', async(req, res) => {
  const newItem = {
    username: req.session.username,
    show: req.body.show,
    watched: req.body.watched,
    total: req.body.total
  }
  calculatePercent(newItem)
  await collection.insertOne(newItem)
  const appdata = await collection.find({
    username: req.session.username
  }).toArray()
  res.json(appdata)
})

//delete existing show
app.post('/delete', async (req, res) => {
  await collection.deleteOne({
    _id: new ObjectId(req.body._id),
    username: req.session.username
  })
  const appdata = await collection.find({
    username: req.session.username
  }).toArray()
  res.json(appdata)
})

//modify existing show
app.post('/modify', async(req, res) => {
  const modifiedItem = {
    show: req.body.show,
    watched: req.body.watched,
    total: req.body.total
  }
  calculatePercent(modifiedItem)
  await collection.updateOne(
      {
        _id: new ObjectId(req.body._id),
        username: req.session.username
      }, {
        $set: modifiedItem
      })
  const appdata = await collection.find({
    username: req.session.username
  }).toArray()
  res.json(appdata)
})

//calculates the percent complete thru a show the user is
const calculatePercent = function (item) {
  //from total episodes and watched so far
  if (item.total === 0) {
    item.percent = 0
  } else {
    item.percent = Math.round ((item.watched / item.total) * 100)
  }
  return item
}
//appdata.forEach( calculatePercent )
app.listen( process.env.PORT || 3000 )


/*

PREVIOUS SERVER
const appdata = [
  { 'show': 'Silo', 'watched': 20, 'total': 25 },
  { 'show': 'Slow Horses', 'watched': 30, 'total': 30 },
  { 'show': 'Severance', 'watched': 19, 'total': 20 },
]










const handleGet = function( request, response ) {
  const filename = dir + request.url.slice( 1 )

  if( request.url === '/' ) {
    sendFile( response, 'public/index.html' )
    //send data to client
  }else if(request.url === '/results') {
    response.writeHead(200, {
      'Content-Type': 'application/json' })
    response.end (JSON.stringify(appdata))
  } else {
    sendFile( response, filename )
  }
}
//adding and deleting data
const handlePost = function( request, response ) {
  let dataString = ''

  request.on( 'data', function( data ) {
      dataString += data
  })

  request.on( 'end', function() {
    // ... do something with the data here!!!
    // adding a new show
    if (request.url === '/submit'){
      const newItem = JSON.parse (dataString)
      //calculate the percent watched of the show
      calculatePercent (newItem)
      appdata.push (newItem)
      response.writeHead( 200, "OK", {'Content-Type': 'text/plain' })
      response.end(JSON.stringify(appdata))
      //delete a specific show
    } else if (request.url === '/delete'){
      const item = JSON.parse (dataString)
      appdata.splice(item.index, 1)
      response.writeHead( 200, "OK", {'Content-Type': 'text/plain' })
      response.end(JSON.stringify(appdata))
      //edit show
    } else if (request.url === '/modify'){
      const item = JSON.parse (dataString)
      const modified = {
        show: item.show,
        watched: item.watched,
        total: item.total
      }
      calculatePercent (modified )
      appdata[item.index] = modified
      response.writeHead( 200, "OK", {'Content-Type': 'text/plain' })
      response.end(JSON.stringify(appdata))

    }
    // change this to incorporate data
  })
}

const sendFile = function( response, filename ) {
   const type = mime.getType( filename )

   fs.readFile( filename, function( err, content ) {

     // if the error = null, then we've loaded the file successfully
     if( err === null ) {

       // status code: https://httpstatuses.com
       response.writeHeader( 200, { 'Content-Type': type })
       response.end( content )

     }else{

       // file not found, error code 404
       response.writeHeader( 404 )
       response.end( '404 Error: File Not Found' )

     }
   })
}

*/





/*
const { MongoClient, ServerApiVersion } = require('mongodb');

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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
*/