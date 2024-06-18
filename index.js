const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "https://b9a12-a138e.web.app"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4iqtbw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const availableCampsCollection = client
      .db("mediCare")
      .collection("availableCamps");
    const allJoinedCampCollection = client
      .db("mediCare")
      .collection("allJoinedCamp");
    const userCollection = client.db("mediCare").collection("user");
    const feedbackCollection = client.db("mediCare").collection("feedback");

    // jwt api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });

      res.send({ token });
    });


    const verifyToken = (req, res, next) => {
      console.log("inside", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access of data" });
      }
      const token = req.headers.authorization.split(' ')[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden access" });
        }

        req.decoded = decoded;
        next();
      });
    };


    // all available camp related api
    app.get("/allCamp",async (req, res) => {
      const result = await availableCampsCollection.find().toArray();

      res.send(result);
    });

    app.get("/allCampByHigh", async (req, res) => {
      const sortedResult = await availableCampsCollection
        .find()
        .sort({
          participantCount: -1,
        })
        .toArray();
      res.send(sortedResult);
    });

    app.get("/allCamp/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await availableCampsCollection.findOne(query);
      res.send(result);
    });

    app.post("/allCamp", async (req, res) => {
      const item = req.body;
      const result = await availableCampsCollection.insertOne(item);
      res.send(result);
    });

    app.put("/allCamp/:id", async (req, res) => {
      const id = req.params.id;
      const updateCamp = req.body;
      console.log(updateCamp);
      console.log("id of camp", id);

      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const camp = {
        $set: {
          campName: updateCamp.campName,
          image: updateCamp.image,
          campFees: updateCamp.campFees,
          dateTime: updateCamp.dateTime,
          location: updateCamp.location,
          healthcareProfessionalName: updateCamp.healthcareProfessionalName,
          participantCount: updateCamp.participantCount,
          description: updateCamp.description,
        },
      };
      const result = await availableCampsCollection.updateOne(
        filter,
        camp,
        options
      );

      console.log(result);
      res.send(result);
    });

    app.delete("/allCamp/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await availableCampsCollection.deleteOne(query);
      res.send(result);
    });

    // all Joined Camp
    app.post("/allJoinedCamp/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const item = req.body;

      const filter = { _id: new ObjectId(id) };

      const updateResult = await availableCampsCollection.updateOne(filter, {
        $inc: {
          participantCount: 1,
        },
      });
      const addResult = await allJoinedCampCollection.insertOne(item);
      console.log(addResult);
      res.send({ addResult, updateResult });
    });

    app.get("/allJoinedCamp", verifyToken,async (req, res) => {
      const camp = req.body;

      const result = await allJoinedCampCollection.find().toArray();
      res.send(result);
    });

    app.get("/allJoinedCampByEmail/:email",async (req, res) => {
      const camp = req.body;
      const email = req.params.email;

      const query = { email: email };

      const result = await allJoinedCampCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/allJoinedCamp/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allJoinedCampCollection.deleteOne(query);
      res.send(result);
    });

    // feedback related api
    app.post("/feedback", async (req, res) => {
      const user = req.body;

      const result = await feedbackCollection.insertOne(user);
      res.send(result);
    });

    app.get("/feedback", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    });

    // user related api
    app.post("/user", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };

      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "USer already exist!!!" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };

      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/user/:id", async (req, res) => {
      const id = req.params.id;
      const updateUSer = req.body;
      // console.log(id);
      // console.log("id of book", updateUSer);

      const filter = { _id: new ObjectId(id) };
      const user = {
        $set: {
          name: updateUSer.name,
        },
      };
      const result = await userCollection.updateOne(filter, user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("MediCare server is running");
});

app.listen(port, () => {
  console.log(`MediCare Server is running on${port}`);
});
