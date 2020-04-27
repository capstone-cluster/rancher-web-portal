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

const images_names = ['Default - VS Code', 'Dr. Novocin - VS Code', 'Dr. Cotton - Nessus', 'Dr. Cotton - OpenVAS'];
const images_docker = ['linuxserver/code-server', 'linuxserver/code-server', 'linuxserver/code-server', 'linuxserver/code-server'];

dotenv.config();
const rancher_endpoint = process.env.RANCHER_ENDPOINT;
const rancher_token = process.env.RANCHER_TOKEN;

if(rancher_endpoint == null){
  throw 'Missing rancher address';
}
if(rancher_token == null){
  throw 'Missing rancher token';
}
axios.defaults.headers.common = {'Authorization': `bearer ${rancher_token}`};
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

// Get definintion of the provided word from the dictionary
app.get('/api/images', function(request, response) {
  response.send(images_names);
});

app.post('/api/deploy', function(request, response) {
  let img = request.body.image;
  let email = request.body.email;
  let pass = request.body.pass;

  if(img == null || email == null || pass == null){
    response.statusMessage = 'Missing data';
    response.status(400).end();
  }
  else if(img >= images_names.length){
    response.statusMessage = 'Image out of range';
    response.status(400).end();
  }
  else if(!RegExp('\\b[a-z]{2,16}\\b').test(email)){
    response.statusMessage = 'Email invalid';
    response.status(400).end();
  }
  else if(!RegExp('\\b[\\da-zA-Z]{8,32}\\b').test(pass)){
    response.statusMessage = 'Pass invalid';
    response.status(400).end();
  }
  else{
    let str = deploy(img, email, pass);
    if(str != null){
      response.statusMessage = 'Deploy success';
      response.status(200).end(str);
    }
    else{
      response.statusMessage = 'Deploy failed';
      response.status(500).end();
    }
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

function deploy(img, email, pass){

  let json_dir = './images/'+images_docker[img].replace('/','#');
  let namespace_raw = fs.readFileSync(json_dir+'/namespace.json');
  let namespace = JSON.parse(namespace_raw);
  namespace['name'] = email;
  console.log(namespace);
  
  axios_insecure.post(rancher_endpoint+'/clusters/c-rz4m4/namespace', namespace)
  .then(res => {
    console.log(`statusCode: ${res.statusCode}`)
    console.log(res)
  })
  .catch(error => {
    console.error(error)
  })
  

  //return null;
  return "https://192.168.0.4";
}
