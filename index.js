require('dotenv').config()
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const cookieParser = require('cookie-parser');

// call express in the app const
const app = express();

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())






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

        // Auth related APIS

        app.use('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false
            })
                .send({ success: true })
        })

        // app.post('/jwt', async (req, res) => {
        //     const user = req.body;
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });

        //     res.
        //         cookie('token', token, {
        //             httpOnly: true,
        //             secure: false,
        //         })
        //         .send({ success: true });
        // })

        // do not load all data in home page

        // job related api
        //  all data or get data by hr_email address
        app.get('/jobs', async (req, res) => {
            console.log('now in the api callback');
            const email = req.query.email;
            let query = {};
            if (email) {
                query = { hr_email: email }
            }
            const cursor = allJobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        // get data by id single data
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allJobsCollection.findOne(query);
            res.send(result);
        });
        // add a job
        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            const result = await allJobsCollection.insertOne(newJob);
            res.send(result)
        })



        // application related api
        // get some data by  query
        app.get('/jobs-application', async (req, res) => {
            const email = req.query.email;
            const query = { applicant_email: email };
            const result = await jobApplicationCollection.find(query).toArray();
            for (const application of result) {

                const queryForMyApplication = { _id: new ObjectId(application.job_id) };
                const resultForMyApplication = await allJobsCollection.findOne(queryForMyApplication);

                if (resultForMyApplication) {
                    application.title = resultForMyApplication.title;
                    application.company = resultForMyApplication.company;
                    application.location = resultForMyApplication.location;
                    application.company_logo = resultForMyApplication.company_logo;
                }
            }

            res.send(result)
        });
        // employer need to know who apply for the job
        app.get('/job-application/jobs/:job_id', async (req, res) => {
            const jobId = req.params.job_id;
            const query = { job_id: jobId };
            const result = await jobApplicationCollection.find(query).toArray();
            res.send(result)

        })



        app.post('/job-applications', async (req, res) => {
            const application = req.body;

            const result = await jobApplicationCollection.insertOne(application);
            // not the best wait (use aggregate)
            const id = application.job_id;
            const query = { _id: new ObjectId(id) };
            const job = await allJobsCollection.findOne(query);
            let newCount = 0;
            if (job.applicationCount) {
                newCount = job.applicationCount + 1;
            } else {
                newCount = 1;
            }
            // now update the job info

            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    applicationCount: newCount
                }
            }
            const updatedResult = await allJobsCollection.updateOne(filter, updatedDoc);

            res.send(result);
        });

        app.patch('/job-applications/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: data.status
                }
            }
            const result = await jobApplicationCollection.updateOne(filter, updatedDoc);
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