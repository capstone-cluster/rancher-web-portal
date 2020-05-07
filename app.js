'use strict';
const express = require('express'),
  fs = require('fs'),
  path = require('path'),
  https = require('https'),
  dotenv = require('dotenv'),
  axios = require('axios'),
  pkg = require('./package.json');

const app = express();
const protocol = 'https';
const port = 3000;
const host = 'localhost';
const key_path = './certs/encrypted.key';
const cert_path = './certs/server.cert';

const docker_images = {
  'Default - VS Code': 'linuxserver/code-server',
  'Dr. Novocin - VS Code': 'linuxserver/code-server',
  'Dr. Cotton - Nessus': 'linuxserver/code-server',
  'Dr. Cotton - OpenVAS': 'linuxserver/code-server'
};

dotenv.config();
const rancher_endpoint = process.env.RANCHER_ENDPOINT;
const rancher_id = process.env.RANCHER_ID;
const rancher_token = process.env.RANCHER_TOKEN;

if (rancher_endpoint == null) {
  throw 'Missing rancher address';
}
if (rancher_id == null) {
  throw 'Missing rancher cluster:project id';
}
if (rancher_token == null) {
  throw 'Missing rancher token';
}
axios.defaults.headers.common = { 'Authorization': `bearer ${rancher_token}` };
// Allow self-signed certificates
const axios_insecure = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

//Configure express middleware
app.use(express.json());

// serve static resources
app.use('/static', express.static(path.join(__dirname, 'public_html')));

// serve index page
app.get('/', function (request, response) {
  response.sendFile(__dirname + '/public_html/index.html');
});

// get list of docker images available to deploy
app.get('/api/images', function (request, response) {
  response.send(Object.keys(docker_images));
});

// deploy a workload to the cluster
app.post('/api/deploy', function (request, response) {
  let img = request.body.image;
  let email = request.body.email;
  let pass = request.body.pass;

  let images_names = Object.keys(docker_images);

  if (img == null || email == null || pass == null) {
    response.statusMessage = 'Missing data';
    response.status(400).end();
  }
  else if (!images_names.includes(img)) {
    response.statusMessage = 'Docker image is invalid';
    response.status(400).end();
  }
  else if (!RegExp('\\b[a-z]{2,16}\\b').test(email)) {
    response.statusMessage = 'Email invalid';
    response.status(400).end();
  }
  else if (!RegExp('\\b[\\da-zA-Z]{8,32}\\b').test(pass)) {
    response.statusMessage = 'Pass invalid';
    response.status(400).end();
  }
  else {
    deploy(response, img, email, pass);
  }
});

// get the public endpoint for a deployed workload
app.get('/api/workloadurl', function (request, response) {
  let email = request.query.email;

  if (email == null) {
    response.statusMessage = 'Missing data';
    response.status(400).end();
  }
  else if (!RegExp('\\b[a-z]{2,16}\\b').test(email)) {
    response.statusMessage = 'Email invalid';
    response.status(400).end();
  }
  else {
    geturl(response, email);
  }
});

// Configure an HTTPS server
const options = {
  key: fs.readFileSync(key_path),
  cert: fs.readFileSync(cert_path),
  passphrase: 'rancherwebportalkey',
};
const server = https.createServer(options, app);

server.listen(port, function () {
  console.log(
    'Express server listening at: https://' +
    server.address().address + ':' + server.address().port
  );
});

function deploy(resp, img, email, pass) {

  let json_dir = './images/' + docker_images[img].replace('/', '#');

  deploy_namespace(json_dir, email)
    .then(res => deploy_storage(json_dir, email))
    .then(res => deploy_secret(json_dir, email, pass))
    .then(res => deploy_workload(json_dir, email))
    //.then(x => new Promise(resolve => setTimeout(() => resolve(x), 250))) // give rancher a sec to create everything
    //.then(res => get_nodeport(email))
    .then(res => {
      //console.log(res);
      //let port = res.data['publicEndpoints'][0]['port'];
      //let addr = 'http://'+res.data['publicEndpoints'][0]['addresses'][0];
      //let server_str = addr+':'+port;
      resp.statusMessage = 'Deploy success';
      resp.status(200).end();
    })
    .catch(error => {
      console.error(error);
      resp.statusMessage = 'Deploy failed';
      resp.status(500).end();
    });
}

function deploy_namespace(json_dir, name) {
  let namespace_raw = fs.readFileSync(json_dir + '/namespace.json');
  let namespace = JSON.parse(namespace_raw);

  namespace['name'] = name;

  let cluster_id = rancher_id.split(':')[0];

  //console.log(namespace);

  return axios_insecure.post(`${rancher_endpoint}/clusters/${cluster_id}/namespace`, namespace)
}

function deploy_storage(json_dir, name) {
  let storage_raw = fs.readFileSync(json_dir + '/persistentvolumeclaim.json');
  let storage = JSON.parse(storage_raw);

  storage['namespaceId'] = name;
  storage['name'] = name + '-vol';

  //console.log(storage);

  return axios_insecure.post(`${rancher_endpoint}/projects/${rancher_id}/persistentvolumeclaim`, storage);
}

function deploy_secret(json_dir, name, pass) {
  let secret_raw = fs.readFileSync(json_dir + '/namespacedsecret.json');
  let secret = JSON.parse(secret_raw);

  let base64pass = Buffer.from(pass).toString('base64');// rancher accepts base64 encoded strings

  secret['data']['PASSWORD'] = base64pass;
  secret['data']['SUDO_PASSWORD'] = base64pass;
  secret['name'] = name + '-pass';
  secret['namespaceId'] = name;

  //console.log(secret);

  return axios_insecure.post(`${rancher_endpoint}/projects/${rancher_id}/namespacedsecret`, secret);
}

function deploy_workload(json_dir, name) {
  let workload_raw = fs.readFileSync(json_dir + '/workload.json');
  let workload = JSON.parse(workload_raw);
  workload['namespaceId'] = name;
  workload['containers'][0]['namespaceId'] = name;
  workload['containers'][0]['environmentFrom'][0]['sourceName'] = name + '-pass';
  workload['containers'][0]['name'] = name;
  workload['containers'][0]['volumeMounts'][0]['name'] = name + '-vol';
  workload['statefulSetConfig']['serviceName'] = name;
  workload['name'] = name;
  workload['volumes'][0]["persistentVolumeClaim"]["persistentVolumeClaimId"] = name + ':' + name + '-vol';
  workload['volumes'][0]["name"] = name + '-vol';
  workload['annotations']['cattle.io/timestamp'] = new Date().toISOString();

  //console.log(workload);

  return axios_insecure.post(`${rancher_endpoint}/projects/${rancher_id}/workload`, workload);
}

function geturl(resp, email) {
  get_nodeport(email)
    .then(res => {
      if(res.data['publicEndpoints'] == undefined){
        resp.statusMessage = 'Workload not available yet';
        resp.status(501).end();
      }
      else if(res.data['state'] !== 'active' || res.data['statefulSetStatus']['readyReplicas'] !== res.data['statefulSetStatus']['replicas']){
        // return the endpoint url even if not ready yet, that way the client doesn't have to ping forever if the deployment is really slow
        let port = res.data['publicEndpoints'][0]['port'];
        let addr = 'http://'+res.data['publicEndpoints'][0]['addresses'][0];
        let server_str = addr+':'+port;
        resp.statusMessage = 'Workload not available yet';
        resp.status(501).end(server_str);
      }
      else{
        let port = res.data['publicEndpoints'][0]['port'];
        let addr = 'http://'+res.data['publicEndpoints'][0]['addresses'][0];
        let server_str = addr+':'+port;
        resp.statusMessage = 'Success';
        resp.status(200).end(server_str);
      }
    })
    .catch(error => {
      console.error(error);
      resp.statusMessage = 'Server couldn\'t find workload';
      resp.status(500).end();
    });
}

function get_nodeport(name) {
  return axios_insecure.get(`${rancher_endpoint}/projects/${rancher_id}/workloads/statefulset:${name}:${name}`);
}