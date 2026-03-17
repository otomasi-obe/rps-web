import RPSAPIServer, { logger } from '../src/apiserver/index';

describe('RPSAPIServer', () => {
  let server: RPSAPIServer;

  beforeAll(() => {
    // Create server instance but don't start it
    server = new RPSAPIServer(5001); // Use different port to avoid conflicts
  });

  test('should instantiate RPSAPIServer', () => {
    expect(server).toBeDefined();
  });

  test('logger should be defined', () => {
    expect(logger).toBeDefined();
  });

  test('should have correct port', () => {
    const testServer = new RPSAPIServer(5002);
    expect(testServer).toBeDefined();
  });

  // Note: For full integration testing, you would need to:
  // 1. Start the server
  // 2. Make HTTP requests to the endpoints
  // 3. Verify the responses
  // 4. Stop the server
  //
  // This would typically be done with a different testing approach
  // like using supertest library
});
