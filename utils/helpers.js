/**
 * Handlebars Helper Functions
 * Custom helpers for use in Handlebars templates
 */

module.exports = {
  /**
   * Equality helper - checks if two values are equal
   * Usage: {{#if (eq page 'home')}}...{{/if}}
   */
  eq: function(a, b) {
    return a === b;
  },

  /**
   * Not equal helper - checks if two values are not equal
   * Usage: {{#if (ne status 'active')}}...{{/if}}
   */
  ne: function(a, b) {
    return a !== b;
  },

  /**
   * Greater than helper
   * Usage: {{#if (gt price 100)}}...{{/if}}
   */
  gt: function(a, b) {
    return a > b;
  },

  /**
   * Less than helper
   * Usage: {{#if (lt price 50)}}...{{/if}}
   */
  lt: function(a, b) {
    return a < b;
  },

  /**
   * Greater than or equal helper
   * Usage: {{#if (gte score 80)}}...{{/if}}
   */
  gte: function(a, b) {
    return a >= b;
  },

  /**
   * Less than or equal helper
   * Usage: {{#if (lte attempts 3)}}...{{/if}}
   */
  lte: function(a, b) {
    return a <= b;
  },

  /**
   * JSON stringify helper - converts object to JSON string
   * Usage: {{{json data}}}
   */
  json: function(context) {
    return JSON.stringify(context);
  },

  /**
   * Format currency helper
   * Usage: {{currency price}}
   */
  currency: function(amount, currency = 'USD') {
    if (typeof amount !== 'number') {
      return amount;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  /**
   * Format date helper
   * Usage: {{formatDate date}}
   */
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

  /**
   * Capitalize first letter helper
   * Usage: {{capitalize text}}
   */
  capitalize: function(str) {
    if (typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Truncate text helper
   * Usage: {{truncate text 100}}
   */
  truncate: function(str, length = 100) {
    if (typeof str !== 'string') return str;
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  },

  /**
   * Get current year helper
   * Usage: {{year}}
   */
  year: function() {
    return new Date().getFullYear();
  },

  /**
   * Add numbers helper
   * Usage: {{add num1 num2}}
   */
  add: function(a, b) {
    return (parseFloat(a) || 0) + (parseFloat(b) || 0);
  },

  /**
   * Subtract numbers helper
   * Usage: {{subtract num1 num2}}
   */
  subtract: function(a, b) {
    return (parseFloat(a) || 0) - (parseFloat(b) || 0);
  },

  /**
   * Multiply numbers helper
   * Usage: {{multiply num1 num2}}
   */
  multiply: function(a, b) {
    return (parseFloat(a) || 0) * (parseFloat(b) || 0);
  },

  /**
   * Divide numbers helper
   * Usage: {{divide num1 num2}}
   */
  divide: function(a, b) {
    const divisor = parseFloat(b);
    if (divisor === 0) return 0;
    return (parseFloat(a) || 0) / divisor;
  },

  /**
   * Check if array/string contains value helper
   * Usage: {{#if (contains array value)}}...{{/if}}
   */
  contains: function(collection, value) {
    if (Array.isArray(collection)) {
      return collection.includes(value);
    }
    if (typeof collection === 'string') {
      return collection.includes(value);
    }
    return false;
  },

  /**
   * Get array length helper
   * Usage: {{length array}}
   */
  length: function(collection) {
    if (Array.isArray(collection) || typeof collection === 'string') {
      return collection.length;
    }
    if (collection && typeof collection === 'object') {
      return Object.keys(collection).length;
    }
    return 0;
  },

  /**
   * Default value helper - returns default if value is falsy
   * Usage: {{default value "Default Value"}}
   */
  default: function(value, defaultValue) {
    return value || defaultValue;
  }
};