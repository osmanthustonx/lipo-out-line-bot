export class LineApiError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'LineApiError';
  }
}

export class OpenAIError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export const errorHandler = async (
  ctx: { response: Response },
  next: () => Promise<unknown>
) => {
  try {
    await next();
  } catch (err) {
    console.error('Error:', err);

    if (err instanceof LineApiError) {
      ctx.response = new Response(JSON.stringify({
        error: 'LINE API Error',
        message: err.message
      }), {
        status: err.statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (err instanceof OpenAIError) {
      ctx.response = new Response(JSON.stringify({
        error: 'OpenAI API Error',
        message: err.message
      }), {
        status: err.statusCode,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (err instanceof ValidationError) {
      ctx.response = new Response(JSON.stringify({
        error: 'Validation Error',
        message: err.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (err instanceof DatabaseError) {
      ctx.response = new Response(JSON.stringify({
        error: 'Database Error',
        message: err.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      ctx.response = new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
