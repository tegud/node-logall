# node-logall

Simple logging for node.

## Installation

`npm i --save logall`

## Configuration

Generally it's easiest to create and configure logging singleton:

~~~~
  const logging = require('logall');
  
  logging.registerLogger({
    level: 'INFO',
    type: 'logstash',
    eventType: 'my-api',
    output: {
        transport: 'udp',
        host: 'logstash',
        port: 1234
    }
  });
  
  module.exports = logging;
~~~~

## Basic Usage

Once you've created the logging, simple require it into you module, and log away:

~~~~
  const logging = require('./logging');
  
  logging.logInfo('OMG Logz');
  
  logging.logError('Oh noes', { error: 'Something broke' });
~~~~

## Modules

To help identify where you logging came from, it's often handy to identify the current module:

~~~~
  const logging = require('./logging').forModule('my-code');
  
  logging.logInfo('OMG Logz'); // Logs with module set to "my-code"
~~~~

## Advanced Usages

### Structured Logging

Logs aren't stories, writing an error's life story isn't going to help anyone.  

Log messages should be consistent, and allow you to find where in the code they broke, as well as provide associated information in a useful structure.

e.g. 

*Dont do:*

logging.logError(`Error calling ${host} for the latest news, try: ${retries}`);

*Do:*

logging.logError('Error getting latest news', { host: host, tries: retries });

This becomes particulary powerful when storing in a full-text search datastore such as Elasticsearch.

### Request Logging

Often when dealing with request logging, you want to keep track of all logs pertaining to a single request.  

By combining node-continuation-storage with logall middleware, you can (mostly-)easily provide identifiers which can tie multiple log entries together.

#### Express middleware
~~~~
  const createNamespace = require('continuation-local-storage').createNamespace;
  const namespace = createNamespace('request-context');
  const uuid = require('node-uuid');
  
  app
      .use((req, res, next) => {
          const requestId = uuid.v4();
          namespace.bindEmitter(req);
          namespace.bindEmitter(res);
          namespace.run(() => {
              namespace.set('requestId', requestId);
              console.log(namespace.get('requestId'));
              next();
          });
      });
~~~~

#### Logall middleware
~~~~
  const createNamespace = require('continuation-local-storage').createNamespace;
  
  logging.registerMiddleware((log, next) => {
      const namespace = getNamespace('request-context');
      const requestId = namespace.get('requestId');

      if(!requestId) {
          return next();
      }

      if(!log.data) {
          log.data = { requestId: requestId };
          return next();
      }

      log.data.requestId = requestId;
      next();
  });
~~~~

#### Break in continuation
The `continuation-local-storage` module keeps track of most callbacks/async behaviour, but it will lose track of processes such as `request`, `redis`, etc. calls.  

To deal with this you may need to manually rebind the namespace to those functions:

~~~~
  continuationLocalStorage.getNamespace(namespace).bind(handleResponseFunction)
~~~~
