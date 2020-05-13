# Intercept Cosmos Http REST calls with fiddler

To be able to intercept the cosmos HTTP calls when developing a Cosmos app with the JavaScript SDK, you need to setup a proxy. 

1. Add the https-proxy-agent@^2.2.4 (the version is actually important, because they removed a feature you need to make sure the untrusted certificate from fiddler won't break it.
2. Setup your cosmos client passing in the https proxy agent like so:

  ```typescript
  let agent = new proxy({ rejectUnauthorized: false, host:'localhost', port: 8888});
  let options: CosmosClientOptions = {
    endpoint: [your endpoint],
    key: [your key],
    agent: agent
  };
  this.client = new CosmosClient(options);
  ```

3. launch fiddler (make sure it listens on port 8888 (or configure it to whatever you chosen it to be in code
4. run your application


You should see the requests coming into fiddler now.
