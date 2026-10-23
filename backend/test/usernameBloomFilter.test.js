const usernameBloomFilter = require("../src/services/usernameBloomFilter");

test("normalizes usernames consistently", () => {
  expect(usernameBloomFilter.normalize("  Jane_Doe  ")).toBe("jane_doe");
});

test("returns true for a username added to the filter", () => {
  const username = `known_user_${Date.now()}`;
  usernameBloomFilter.add(username);

  expect(usernameBloomFilter.mightContain(username)).toBe(true);
  expect(usernameBloomFilter.mightContain(username.toUpperCase())).toBe(true);
});

test("returns false for a username that is not in the filter", () => {
  const username = `definitely_missing_${Date.now()}_${Math.random()}`;

  expect(usernameBloomFilter.mightContain(username)).toBe(false);
});

test("initializes the filter from the User model only once", async () => {
  const username = `loaded_user_${Date.now()}`;
  let calls = 0;
  const User = {
    find() {
      calls += 1;
      return {
        select: () => ({
          lean: async () => [{ username }],
        }),
      };
    },
  };

  if (!usernameBloomFilter.isInitialized()) {
    await usernameBloomFilter.initialize(User);
    expect(calls).toBe(1);
    expect(usernameBloomFilter.mightContain(username)).toBe(true);
  }
});
