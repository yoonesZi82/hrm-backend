import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const response =
      exception instanceof HttpException ? exception.getResponse() : exception;

    res.status(status).json({
      success: false,
      message: response?.message || 'Internal server error',
      error: exception.name || 'Error',
      statusCode: status,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
