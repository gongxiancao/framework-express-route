# framework-express-route

http config file sample:

```
'use strict';
var bodyParser = require('body-parser'),
  multipart = require('connect-multiparty');

module.exports.http = {
  middlewares: [
    function () {
      return framework.express.static(framework.config.paths.public || '../.tmp/public');
    },
    ['/files', function () {
      return framework.express.static(framework.config.paths.files || '../../files');
    }],
    bodyParser.json.bind(bodyParser),
    bodyParser.urlencoded.bind(bodyParser, { extended: false }),
    multipart
  ],
  error: function (err, req, res, next) {
    console.error(err);
    res.render('error/error', {layout: false});
    // res.json('ok');
  }
};

```

route config file sample:

```
'use strict';
module.exports.routes = {
  'get /': 'HomeController.index',
  'get /news': 'NewsController.index',
  'get /news/:id': 'NewsController.news'
};
```