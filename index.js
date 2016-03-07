var _ = require('lodash'),
  async = require('async');

function lift (done) {
  var self = this;
  var routes = self.config.routes;

  _.each((self.config.http || {}).middlewares || [], function (middleware) {
    self.expressApp.use(middleware());
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
    var actionMethodName = actionParts[1];
    var actionMethod = controller[actionMethodName];
    if(!actionMethod) {
      throw new Error('undefined action method:' + action);
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
  self.expressServer = self.expressApp.listen(self.config.port, done);
};

function lower (done) {
  this.expressServer.close();
  done();
}

module.exports = {
  lift: lift,
  lower: lower
};