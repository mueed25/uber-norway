class BaseController {
  
  successResponse(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
  errorResponse(res, message = 'An error occurred', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  validationError(res, errors) {
    return this.errorResponse(res, 'Validation failed', 422, errors);
  }

  notFoundResponse(res, resource = 'Resource') {
    return this.errorResponse(res, `${resource} not found`, 404);
  }

  unauthorizedResponse(res, message = 'Unauthorized access') {
    return this.errorResponse(res, message, 401);
  }

  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  getPaginationParams(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

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

  validateRequiredFields(body, requiredFields) {
    const errors = [];
    
    requiredFields.forEach(field => {
      if (!body[field] || body[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    
    return errors;
  }

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