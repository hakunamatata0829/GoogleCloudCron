async function createJob(projectId, locationId, serviceId) {
  // [START cloud_scheduler_create_job]
  const scheduler = require('@google-cloud/scheduler');

  // Create a client.
  const client = new scheduler.CloudSchedulerClient();

  // TODO(developer): Uncomment and set the following variables
  // const projectId = "PROJECT_ID"
  // const locationId = "LOCATION_ID"
  // const serviceId = "my-serivce"

  // Construct the fully qualified location path.
  const parent = client.locationPath(projectId, locationId);

  // Construct the request body.
  const job = {
    appEngineHttpTarget: {
      appEngineRouting: {
        service: serviceId,
      },
      relativeUri: '/log_payload',
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

const args = process.argv.slice(2);
createJob(...args).catch(console.error);