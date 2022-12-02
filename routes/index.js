var express = require('express');
var router = express.Router();

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url = 'mongodb://ylex:S0N6QRFtZukpYGLEfZ2LFGhzTDpV2YE6lJyGPqEGtqk3gCjsFYwFifhiH5iSDZkkDMEpoXAu3gLfs7BwEQKjkA==@ylex.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@ylex@';
const { v4: uuidv4 } = require('uuid');
const jwt = require("jsonwebtoken");
var db;
const auth = require("../middlewares/auth")


MongoClient.connect(url, function (err, client) {
  db = client.db('InventorySystemDB');
  console.log("DB connected");
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Handle the Form */
router.post('/bookings', async function (req, res) {

  req.body.numTickets = parseInt(req.body.numTickets);

  let result = await db.collection("bookings").insertOne(req.body);

  for (var i = 0; i < req.body.numTickets; i++) {

    await db.collection("tickets").insertOne({ bookingId: result.insertedId, uuid: uuidv4() });
  }

  res.status(201).json({ id: result.insertedId });

});

/* Display all Bookings */
router.get('/bookings', async function (req, res) {

  let results = await db.collection("bookings").find().toArray();

  res.render('bookings', { bookings: results });

});

/* Display a single Booking */
router.get('/bookings/read/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOne({ _id: ObjectId(req.params.id) })

  if (result)
    res.render('booking', { booking: result });
  else
    res.status(404).send('Unable to find the requested resource!');

});

// Delete a single Booking
router.post('/bookings/delete/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOneAndDelete({ _id: ObjectId(req.params.id) })

  if (!result.value) return res.status(404).send('Unable to find the requested resource!');

  res.send("Booking deleted.");

});

// Form for updating a single Booking 
router.get('/bookings/update/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOne({ _id: ObjectId(req.params.id) });

  if (!result) return res.status(404).send('Unable to find the requested resource!');

  res.render("update", { booking: result })

});

// Updating a single Booking 
router.post('/bookings/update/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  req.body.numTickets = parseInt(req.body.numTickets);

  var result = await db.collection("bookings").findOneAndReplace({ _id: ObjectId(req.params.id) },
    req.body
  );

  if (!result.value)
    return res.status(404).send('Unable to find the requested resource!');

  res.send("Booking updated.");

});


/* Searching */
router.get('/bookings/search', async function (req, res) {

  var whereClause = {};

  if (req.query.email) whereClause.email = { $regex: req.query.email };

  // if (req.query.team) whereClause.team =  

  var parsedNumTickets = parseInt(req.query.numTickets);
  if (!isNaN(parsedNumTickets)) whereClause.numTickets = parsedNumTickets;

  let results = await db.collection("bookings").find(whereClause).toArray();

  return res.render('bookings', { bookings: results });

});

/* Pagination */
router.get('/bookings/paginate', async function (req, res) {

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("bookings").find({}, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("bookings").count() / perPage);

  return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

});

/* Ajax-Pagination */
router.get('/api/bookings', async function (req, res) {

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("bookings").find({}, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("bookings").count() / perPage);

  // return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

  return res.json({ bookings: results, pages: pages })

});


// Form for updating a single Booking 
router.get('/api/bookings/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOne({ _id: ObjectId(req.params.id) });

  if (!result) return res.status(404).send('Unable to find the requested resource!');

  res.json(result);

});


// Updating a single Booking - Ajax
router.put('/api/bookings/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  req.body.numTickets = parseInt(req.body.numTickets);

  var result = await db.collection("bookings").findOneAndReplace(
    { _id: ObjectId(req.params.id) }, req.body
  );

  if (!result.value)
    return res.status(404).send('Unable to find the requested resource!');

  res.send("Booking updated.");

});

// Delete a single Booking
router.delete('/api/bookings/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOneAndDelete({ _id: ObjectId(req.params.id) })

  if (!result.value) return res.status(404).send('Unable to find the requested resource!');

  return res.status(204).send();

});

// GroupBy
router.get('/api/bookings/aggregate/groupby', auth, async function (req, res) {

  const pipeline = [
    { $match: { superhero: { $ne: null }}},
    { $match: { payment: "Paypal" } },
    { $group: { _id: "$superhero", count: { $sum: 1 } } }
  ];

  const results = await db.collection("bookings").aggregate(pipeline).toArray();

  return res.json(results);

});

// ItemsGroupBy
router.get('/api/items/aggregate/groupby', async function (req, res) {

  const pipeline = [
    // { $match: { superhero: { $ne: null }}},
    // { $match: { payment: "Paypal" } },
    { $group: { _id: "$type", count: { $sum: 1 } } }
  ];

  const results = await db.collection("items").aggregate(pipeline).toArray();

  return res.json(results);

});

//Add Item
router.post('/api/items/detail', async function (req, res) {
  
  let result = await db.collection("items").insertOne(req.body);
  res.status(201).json({ id: result.insertedId });

});

//Add Item
router.post('/api/users/detail', async function (req, res) {
  
  let result = await db.collection("users").insertOne(req.body);
  res.status(201).json({ id: result.insertedId });

});

/* Ajax-Pagination */
router.get('/api/book/detail', async function (req, res) {

  var whereClause = {};

  if (req.query.type) whereClause.type = { $regex: req.query.type };

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("items").find(whereClause, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("items").count(whereClause) / perPage);

  // return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

  return res.json({ book: results, pages: pages })

});

/* Ajax-Pagination */
router.get('/api/game/detail', async function (req, res) {

  var whereClause = {};

  if (req.query.type) whereClause.type = { $regex: req.query.type };

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("items").find(whereClause, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("items").count(whereClause) / perPage);

  // return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

  return res.json({ game: results, pages: pages })

});
/* Ajax-Pagination */
router.get('/api/gift/detail', async function (req, res) {

  var whereClause = {};

  if (req.query.type) whereClause.type = { $regex: req.query.type };

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("items").find(whereClause, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("items").count(whereClause) / perPage);

  // return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

  return res.json({ gift: results, pages: pages })

});

/* Ajax-Pagination */
router.get('/api/material/detail', async function (req, res) {

  var whereClause = {};

  if (req.query.type) whereClause.type = { $regex: req.query.type };

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("items").find(whereClause, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("items").count(whereClause) / perPage);

  // return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

  return res.json({ material: results, pages: pages })
});

/* Ajax-Pagination */
router.get('/api/user/detail', async function (req, res) {

  var whereClause = {};

  // if (req.query.type) whereClause.type = { $regex: req.query.type };

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("users").find(whereClause, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("users").count(whereClause) / perPage);

  // return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

  return res.json({ user: results, pages: pages })

});

router.get("/api/bookings/:id/tickets", async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  var pipelines = [
    { $match: { _id: req.params.id } },
    {
      $lookup:
      {
        from: "tickets",
        localField: "_id",
        foreignField: "bookingId",
        as: "tickets"
      }
    }
  ]

  let results = await db.collection("bookings").aggregate(pipelines).toArray();

  if (results.length > 0)
    return res.json(results[0]);
  else
    return res.status(404).send("Not Found");

});

router.post("/api/login", async function (req, res) {

  var correspondingUser = await db.collection("users").findOne({ email : req.body.email });

  if (req.body.password == correspondingUser.password) {

    const user = {};

    const token = jwt.sign(
      { email: req.body.email, type: correspondingUser.type, user_id: correspondingUser._id, userName: correspondingUser.fullName }, "process.env.TOKEN_KEY", {
      expiresIn: "2h",
    }
    );

    user.token = token;

    return res.json(user);

  } else {
    res.status(400).send("Invalid Credentials");

  }

});

// Delete a single user
router.delete('/api/users/delete/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("users").findOneAndDelete({ _id: ObjectId(req.params.id) })

  if (!result.value) return res.status(404).send('Unable to find the requested resource!');

  res.send("User deleted.");

});

// Form for updating a single Booking 
router.get('/api/users/update1/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("users").findOne({ _id: ObjectId(req.params.id) });

  if (!result) return res.status(404).send('Unable to find the requested resource!');

  return res.json({booking: result })

});

// Updating a single Booking 
router.put('/api/users/update2/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  req.body.numTickets = parseInt(req.body.numTickets);

  var result = await db.collection("users").findOneAndReplace({ _id: ObjectId(req.params.id) },
    req.body
  );

  if (!result.value)
    return res.status(404).send('Unable to find the requested resource!');

  res.send("User updated.");

});


module.exports = router;


