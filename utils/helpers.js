

module.exports = {
  
  eq: function(a, b) {
    return a === b;
  },

  ne: function(a, b) {
    return a !== b;
  },


  gt: function(a, b) {
    return a > b;
  },

  
  lt: function(a, b) {
    return a < b;
  },

 
  gte: function(a, b) {
    return a >= b;
  },

  
  lte: function(a, b) {
    return a <= b;
  },

 
  json: function(context) {
    return JSON.stringify(context);
  },

  currency: function(amount, currency = 'USD') {
    if (typeof amount !== 'number') {
      return amount;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  
  formatDate: function(date, format = 'short') {
    if (!date) return '';
    
    const d = new Date(date);
    
    if (format === 'short') {
      return d.toLocaleDateString();
    } else if (format === 'long') {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (format === 'time') {
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return d.toLocaleDateString();
  },

  capitalize: function(str) {
    if (typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },


  truncate: function(str, length = 100) {
    if (typeof str !== 'string') return str;
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  },

  year: function() {
    return new Date().getFullYear();
  },

 
  add: function(a, b) {
    return (parseFloat(a) || 0) + (parseFloat(b) || 0);
  },

  subtract: function(a, b) {
    return (parseFloat(a) || 0) - (parseFloat(b) || 0);
  },


  multiply: function(a, b) {
    return (parseFloat(a) || 0) * (parseFloat(b) || 0);
  },

 
  divide: function(a, b) {
    const divisor = parseFloat(b);
    if (divisor === 0) return 0;
    return (parseFloat(a) || 0) / divisor;
  },


  contains: function(collection, value) {
    if (Array.isArray(collection)) {
      return collection.includes(value);
    }
    if (typeof collection === 'string') {
      return collection.includes(value);
    }
    return false;
  },

  and: function() {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    
    return args.every(arg => !!arg);
  },
  
  or: function() {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.some(arg => !!arg);
  },

  length: function(collection) {
    if (Array.isArray(collection) || typeof collection === 'string') {
      return collection.length;
    }
    if (collection && typeof collection === 'object') {
      return Object.keys(collection).length;
    }
    return 0;
  },

 
  default: function(value, defaultValue) {
    return value || defaultValue;
  }
};