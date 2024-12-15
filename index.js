require('dotenv').config()
const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');

// call express in the app const
const app = express();

// middleware
app.use(express.json());
app.use(cors())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.226ep.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // connect with db collection
        const allJobsCollection = client.db("job-portal-main").collection("allJobs");
        const jobApplicationCollection = client.db("job-portal-main").collection("applications")

        // do not load all data in home page

        // job related api
        //  all data
        app.get('/jobs', async (req, res) => {
            const allJobs = await allJobsCollection.find().toArray();
            res.send(allJobs);
        });

        app.post('/jobs', async(req, res)=>{
            const newJob = req.body;
            const result = await allJobsCollection.insertOne(newJob);
            res.send(result)
        })

        // get data by id single data
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allJobsCollection.findOne(query);
            res.send(result);
        });

        // application related api
        // get some data by  query
        app.get('/jobs-application', async (req, res) => {
            const email = req.query.email;
            const query = { applicant_email: email };
            const result = await jobApplicationCollection.find(query).toArray();

            // not the best way to aggregate data
            for(const application of result){
                console.log(application.job_id);
                const queryForMyApplication = { _id: new ObjectId(application.job_id)};
                const resultForMyApplication = await allJobsCollection.findOne(queryForMyApplication);

                if(resultForMyApplication){
                    application.title = resultForMyApplication.title;
                    application.company = resultForMyApplication.company;
                    application.location = resultForMyApplication.location;
                    application.company_logo = resultForMyApplication.company_logo;
                }
            }

            res.send(result)
        });

        app.post('/job-applications', async (req, res) => {
            const application = req.body;
            console.log(application);
            const result = await jobApplicationCollection.insertOne(application);
            res.send(result);
        })





    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// initial get method
app.get('/', (req, res) => {
    res.send('server is running')
});

// listener from post
app.listen((port), () => {
    console.log(`Running Port ${port}`);
})