var _ = require('lodash'),
  Promise = require('bluebird'),
  async = require('async');

function lift (done) {
  var self = this;
  var routes = self.config.routes;

  // support middlewares like below:
  // [
  //   function () {
  //     return framework.express.static(framework.config.paths.public || '../.tmp/public');
  //   },
  //   ['/files', function () {
  //     return framework.express.static(framework.config.paths.files || '../../files');
  //   }],
  //   bodyParser.json.bind(bodyParser),
  //   bodyParser.urlencoded.bind(bodyParser, { extended: false }),
  //   multipart
  // ]
  // when a middleware is array, invoke the function in the array, and then apply app.use with the array as arguments 
  _.each((self.config.http || {}).middlewares || [], function (middleware) {
    if(_.isFunction(middleware)) {
      self.expressApp.use(middleware());
      return;
    }
    if(_.isArray(middleware)) {
      middleware = _.map(middleware, function (arg) {
        if(_.isFunction(arg)) {
          return arg();
        }
        return arg;
      });
      console.log('ddddd', middleware);
      self.expressApp.use.apply(self.expressApp, middleware);
    }
  });

  _.each(self.config.routes, function (action, key) {
    var index = key.indexOf(' ');
    var keyParts = [key.slice(0, index), key.slice(index + 1)];
    var method = (keyParts[0] || '').toLowerCase();
    var pattern = keyParts[1];

    if(!(_.includes(['get', 'post', 'put', 'delete', 'patch'], method))) {
      throw new Error('invalid route method: ' + method);
    }

    var actionParts = action.split('.');
    var controllerName = actionParts[0];
    var controller = self.controllers[controllerName];
    if(!controller) {
      throw new Error('undefined controller: ' + controllerName);
    }
    var actionMethodName = actionParts[1];
    var actionMethod = controller[actionMethodName];
    if(!actionMethod) {
      throw new Error('undefined action method: ' + action);
    }

    if(!self.controllerActionPolicies) {
      self.expressApp[method](pattern, function (req, res) {
        var context = {request: req, response: res};
        actionMethod.call(context, req, res);
      });
    } else {
      var policies = self.controllerActionPolicies[controllerName + '.' + actionMethodName];
      self.expressApp[method](pattern, function (req, res) {
        var context = {request: req, response: res};

        async.eachSeries(policies, function (policy, done) {
          policy.call(context, req, res, done);
        }, function (err) {
          if(!err) {
            actionMethod.call(context, req, res);
          }
        });
      });
    }
  });
  self.expressServer = self.expressApp.listen(self.config.port, self.config.host, done);
};

function lower (done) {
  this.expressServer.close();
  done();
}

module.exports = {
  lift: Promise.promisify(lift),
  lower: Promise.promisify(lower)
};