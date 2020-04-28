# rancher-web-portal
 
A web-based form for deploying templated docker containers onto RKE.
This project uses Node.JS, Express, and Docker

Make sure to add a .env file to the root directory with these contents:<br/>
`RANCHER_ENDPOINT=x.x.x.x` (Rancher API endpoint address)<br/>
`RANCHER_TOKEN=xxxxxxxxx` (Rancher API bearer token)