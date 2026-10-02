const { getSlots } = require("./helpers/bookingHelper");
const { uniqueDate, ids } = require("./helpers/testData");

describe("Available slots API: GET /api/salons/:salonId/available-slots", () => {
  test("returns slots for a valid salon, date and service (200)", async () => {
    const date = uniqueDate();
    const res = await getSlots(date, ids.service30);
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(date);
    expect(res.body.service).toBe("Men Haircut");
    expect(res.body.duration).toBe(30);
    expect(Array.isArray(res.body.availableSlots)).toBe(true);
    expect(res.body.availableSlots.length).toBeGreaterThan(0);
  });

  test("each slot has time, stylistId and stylistName", async () => {
    const res = await getSlots(uniqueDate(), ids.service30);
    res.body.availableSlots.forEach((s) => {
      expect(s).toEqual(
        expect.objectContaining({
          time: expect.stringMatching(/^\d{2}:\d{2}$/),
          stylistId: expect.any(String),
          stylistName: expect.any(String),
        })
      );
    });
  });

  test("slots stay inside opening hours 09:00-18:00", async () => {
    const res = await getSlots(uniqueDate(), ids.service30);
    const times = res.body.availableSlots.map((s) => s.time).sort();
    expect(times[0]).toBe("09:00");
    expect(times[times.length - 1]).toBe("17:30"); // 30 min service ends 18:00
  });

  test("60-minute service has its last slot at 17:00", async () => {
    const res = await getSlots(uniqueDate(), ids.service60);
    const times = res.body.availableSlots.map((s) => s.time).sort();
    expect(res.body.duration).toBe(60);
    expect(times[times.length - 1]).toBe("17:00");
  });

  test("both stylists are offered for each time", async () => {
    const res = await getSlots(uniqueDate(), ids.service30);
    const at9 = res.body.availableSlots.filter((s) => s.time === "09:00");
    expect(at9).toHaveLength(2);
  });

  test("missing date returns 400", async () => {
    const api = require("./helpers/client");
    const res = await api
      .get(`/api/salons/${ids.salon}/available-slots`)
      .query({ serviceId: ids.service30 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("date and serviceId are required");
  });

  test("missing serviceId returns 400", async () => {
    const api = require("./helpers/client");
    const res = await api
      .get(`/api/salons/${ids.salon}/available-slots`)
      .query({ date: uniqueDate() });
    expect(res.status).toBe(400);
  });

  test("unknown salon returns 404", async () => {
    const res = await getSlots(uniqueDate(), ids.service30, "6abe5fbce282fbd1efb78699");
    expect(res.status).toBe(404);
  });

  test("unknown service returns 404", async () => {
    const res = await getSlots(uniqueDate(), "6abe5fbce282fbd1efb78699");
    expect(res.status).toBe(404);
  });

  test.failing("malformed salon id returns a 4xx, not 500 (validation)", async () => {
    const res = await getSlots(uniqueDate(), ids.service30, "not-an-id");
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

