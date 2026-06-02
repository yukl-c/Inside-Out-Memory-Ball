const successMessage = (res, statusCode=200, msg='succeeded', data=null) => {
    return res.status(statusCode).json({
        success: true,
        statusCode: statusCode,
        message: msg,
        data
    }); 
};

const errorMessage = (res, statusCode=500, msg='error', err=null) => {
    return res.status(statusCode).json({
        success: false,
        statusCode: statusCode,
        message: msg,
        err
    }); 
};

module.exports = {
    successMessage,
    errorMessage
};