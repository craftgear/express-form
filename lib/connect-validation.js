//var validator = require("../../node-validator"),
var validator = require("validator"),
    FilterPrototype = validator.Filter.prototype,
    ValidatorPrototype = validator.Validator.prototype,
    object = require("object-additions").object;
    

/*!
 * Connect - Validation
 * Copyright(c) 2010 Dan Dean <me@dandean.com>
 * MIT Licensed
 */

function example_usage() {
  // Include it:
  var form = require("connect-validation"),
      filter = form.filter,
      validate = form.validate;

  form.addFilter("capitalize", function(value) {
    this.value = this.value.toUpperCase();
  });

  // Define a route:
  app.post(
    '/register',

    // Add validation route-middleware:
    form(
      filter("username").trim().toInt(),
      validate("username").alphaNumeric("%s must contain only letters and numbers.")
    ),

    function(req, res) {
      // Now we can inspect the errors!  
      if (req.form.errors) {
        // redirect or something
      }
      req.form.isValid; // --> true/false
      req.form.getError("username"); // --> false/message
    }
  );  
}

/**
 * - Populate filter class with filter methods
 * - Allow for runtime extension
**/

function Filter(fieldname) {
  this.stack = [];
  
  this.extend = function(func) {
    this.stack.push(func);
    return this;
  };
  
  this.run = function(formData) {
    this.stack.forEach(function(filter) {
      formData[fieldname] = filter(formData[fieldname]);
    });
  };
}

var externalFilter = new validator.Filter();

Object.keys(FilterPrototype).forEach(function(name) {
  Filter.prototype[name] = function() {
    var args = Array.prototype.slice.call(arguments);
    return this.extend(function(value) {
      return FilterPrototype[name].apply(externalFilter.sanitize(value), args);
    });
  };
});

Filter.prototype.toUpper = function() {
  return this.extend(function(value) {
    return value.toUpperCase();
  });
};

Filter.prototype.truncate = function(length) {
  return this.extend(function(value) {
    if (value.length > length) {
      return value.substr(0,length);
    }
    return value;
  });
};

Filter.prototype.custom = function(func) {
  return this.extend(func);
};


function Validator(fieldname) {
  this.stack = [];
  
  this.extend = function(func) {
    this.stack.push(func);
    return this;
  };
  
  this.run = function(formData) {
    var errors = [];

    this.stack.forEach(function(validate) {
      try {
        validate(formData[fieldname]);
      } catch(e) {
        errors.push(e.toString());
      }
    });
    
    if (errors.length) return errors;
  };
}

var externalValidator = new validator.Validator();

Object.keys(ValidatorPrototype).forEach(function(name) {
  Validator.prototype[name] = function() {
    var args = Array.prototype.slice.call(arguments);
    
    var message = undefined;
    
    if (args.length) {
      switch(name) {
        case "equals":
        case "contains":
        case "notContains":
          message = args[1];
          break;
        case "regex":
        case "notRegex":
        case "len":
          message = args[2];
          break;
        default:
          message = args[0];
      }
    }
    
    return this.extend(function(value) {
      return ValidatorPrototype[name].apply(externalValidator.check(value, message), args);
    });
  };
});

Validator.prototype.required = function(placeholderValue, message) {
  return this.extend(function(value) {
    if (object.isUndefined(value) || value == null || value === '' || value == placeholderValue) {
      throw new Error(message || "Field does not have a value.");
    }
  });
};




function form() {
  var routines = Array.prototype.slice.call(arguments);
  
  return function(req, res, next) {
    if (!req.form) {
      req.form = {};
    }
    
    routines.forEach(function(routine) {
      var result = routine.run(req.body);
      
      if (Array.isArray(result) && result.length) {
        var errors = req.form.errors = req.form.errors || [];
        result.forEach(function(error) {
          errors.push(error);
        });
      }
    });
    
    console.log(req.form.errors);
    
    if (next) next();
  };
}

form.filter = function(fieldname) {
  return new Filter(fieldname);
};

form.validator = function(fieldname) {
  return new Validator(fieldname);
};

module.exports = form;

// Options:
// * flash errors (false)
// * persist fields as locals (true)
// * debug (false)
module.exports.configure = function(options) {
};
