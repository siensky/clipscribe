import { buildApp } from "../../src/app.js";

it("boots and closes without a listening socket or external services", async () => {
  const app = buildApp();

  try {
    await app.ready();
    expect(app.server.listening).toBe(false);
  } finally {
    await app.close();
  }
});
