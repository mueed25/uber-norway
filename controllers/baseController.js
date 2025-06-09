class BaseController {
  // Standard success response format
  successResponse(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Standard error response format
  errorResponse(res, message = 'An error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  // Validation error response
  validationError(res, errors) {
    return this.errorResponse(res, 'Validation failed', 422, errors);
  }

  // Not found response
  notFoundResponse(res, resource = 'Resource') {
    return this.errorResponse(res, `${resource} not found`, 404);
  }

  // Unauthorized response
  unauthorizedResponse(res, message = 'Unauthorized access') {
    return this.errorResponse(res, message, 401);
  }

  // Handle async errors
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Extract pagination parameters
  getPaginationParams(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  // Format pagination response
  formatPaginatedResponse(data, totalCount, page, limit) {
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  // Validate required fields
  validateRequiredFields(body, requiredFields) {
    const errors = [];
    
    requiredFields.forEach(field => {
      if (!body[field] || body[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    
    return errors;
  }

  // Sanitize input data
  sanitizeInput(data) {
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string') {
        sanitized[key] = data[key].trim();
      } else if (typeof data[key] === 'object') {
        sanitized[key] = this.sanitizeInput(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    });
    
    return sanitized;
  }
}

module.exports = BaseController;