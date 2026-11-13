const request = require("supertest");
const app = require("../src/app");

describe("API", () => {
  test("expose le contrôle de santé", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  test("renvoie 404 pour une route inconnue", async () => {
    const response = await request(app).get("/api/route-inconnue");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Route introuvable" });
  });
});
