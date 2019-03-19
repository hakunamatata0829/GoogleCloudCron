const functions = require('firebase-functions');
const firebase = require('firebase-admin');
const express = require('express');
const request=require('request');
const scheduler = require('@google-cloud/scheduler');
const csv = require('csvtojson');
const csvFilePath='./addresses.csv';

// Initialize Cloud Firestore through Firebase
const firebaseApp =  firebase.initializeApp({
    apiKey: "AIzaSyA8pTdfwqww2c3DXNU6n4wxQsX2YWC1YKQ",
    authDomain: "csvdemo-234414.firebaseapp.com",
    databaseURL: "https://csvdemo-234414.firebaseio.com",
    projectId: "csvdemo-234414",
    storageBucket: "csvdemo-234414.appspot.com",
    messagingSenderId: "117916870320"
  });
  
var db = firebaseApp.firestore();
const app = express();
const cronJob = express();

//Initialize Cloud Project 
const projectId = "csvdemo-234414" // change your project-id
const locationId = "us-central1"   // change your location-id

function getFacts(){
    const ref = firebaseApp.database().ref('facts');
    return ref.once('value').then(snap => snap.val());

}
const url = 'https://people.sc.fsu.edu/~jburkardt/data/csv/addresses.csv';

async function csvToJSON1() {
    var i = 0;
    const stream = request.get('https://people.sc.fsu.edu/~jburkardt/data/csv/addresses.csv');
    
    await csv()
   // .fromFile(csvFilePath)
    .fromStream(stream)
    .then( (jsonObj)=>{ 
        console.log(jsonObj);
        return;
        return Promise.all(
            jsonObj.map(async k => {

            //for(var k in jsonObj) {            
                console.log("DB name "+i+" -> ",k['FirstName']);
                var usersRef = db.collection('Users');
                await usersRef.where('FirstName', '==', k['FirstName']).get()
                .then(async snapshot => {
                    console.log(k)
                    if(snapshot.empty) {
                        console.log('No matching documents.' + i );
                        var addDoc = await usersRef.add(k)
                            .then(ref => {
                                console.log(i + '  Added document with ID: ', ref.id);
                                return ref.id;
                            })
                            .catch((error) =>  {
                                console.error("Error adding document: ", error);
                                return error;
                            }); 
                        return;
                    }else{
                        snapshot.forEach(doc => {
                            console.log(i + " - "+k['FirstName'] + '  is already exist..');
                        // console.log(doc.id, '=>', doc.data());
                        });
                    }    
                    i++;            
                })
                .catch(err => {
                    console.log('Error getting documents', err);
                });
               
        })
        
        );
        //return jsonObj;        
    })
    .catch(errors => {
        console.error(error);
        res.error(500);
    });

    // // get csv file and create stream from remote link
    // const stream = request.get('https://people.sc.fsu.edu/~jburkardt/data/csv/addresses.csv');
    
    // // convert csv file (stream) to JSON format data
    // const json = await csv().fromStream(stream);
    // return json;
}

app.get('/timestamp', (request, response) => {
    response.send(`${Date.now()}`);
});

const start3 = async function(file){
    const jsonArray = await csvToJSON1();
    console.log(jsonArray);
    return jsonArray;
}


app.get('/', (request, response) => {
    
    const json = start3();
    response.send( json );
   
});

async function getJobs(){
    var i = 0;
    var cronJobsRef = db.collection('CronJobs');
    await cronJobsRef.get()
    .then(async snapshot => {
        
        if(snapshot.empty) {
            console.log('No matching documents.' + i );
            return;
        }else{
            await snapshot.forEach(async doc => {
                await console.log(i + " - " + doc.id + '=>', doc.data());
                await createJob(doc.data()).catch(console.error);
            });
        }    
        i++;            
    })
    .catch(err => {
        console.log('Error getting documents', err);
    });
}

async function createJob(jobObj) {
    // [START cloud_scheduler_create_job]
    const scheduler = require('@google-cloud/scheduler');
    console.log(' reading job list from db.... ');
    
    // Create a client.
    const client = new scheduler.CloudSchedulerClient();
  
    // Config your project details
    const serviceId = jobObj.Name     
  
    // Construct the fully qualified location path.
    const parent = client.locationPath(projectId, locationId);
    const jobname = "projects/"+projectId+"/locations/"+locationId+"/jobs/"+serviceId;
    
    // Construct the request body.
    const job = {
        name:jobname,
        HttpTarget: {
            uri: jobObj.API_URL,
            httpMethod: 'POST',
            body: Buffer.from('Hello World'), //.toString("base64"),
        },
        schedule: '* /5 * * *',
        timeZone: 'America/Los_Angeles',
    };
  
    const request = {
      parent: parent,
      job: job,
    };
  
    // Use the client to send the job creation request.
    const [response] = await client.createJob(request);
    console.log(`Created job: ${response.name}`);
    // [END cloud_scheduler_create_job]
}
  
 /**
 * Delete a job via the Cloud Scheduler API
 */
async function deleteJob(jobId) {
    // [START cloud_scheduler_delete_job]
    const scheduler = require('@google-cloud/scheduler');
  
    // Create a client.
    const client = new scheduler.CloudSchedulerClient();
  
    // Construct the fully qualified location path.
    const job = client.jobPath(projectId, locationId, jobId);
  
    // Use the client to send the job creation request.
    await client.deleteJob({name: job});
    console.log('Job deleted.');
    // [END cloud_scheduler_delete_job]
}
 
 /**
 * Get a job via the Cloud Scheduler API
 */
async function getJob(jobId) {
    // [START cloud_scheduler_get_job]
    const scheduler = require('@google-cloud/scheduler');
  
    // Create a client.
    const client = new scheduler.CloudSchedulerClient();
  
    // Construct the fully qualified location path.
    const job = client.jobPath(projectId, locationId, jobId);
  
    // Use the client to send the job creation request.
    await client.getJob({name: job});
    console.log('Job getted.');
    // [END cloud_scheduler_get_job]
}

cronJob.get('/', (request, response) => {
    
    const json = getJobs();
   // createJob().catch(console.error);
    response.send( 'CronJobs run' );
   
});

exports.app = functions.https.onRequest(app);
exports.cronJob = functions.https.onRequest(cronJob);  