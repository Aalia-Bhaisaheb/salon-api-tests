const request = require("supertest");

module.exports = request(process.env.BASE_URL);
