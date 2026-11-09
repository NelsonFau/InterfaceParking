import { describe, expect, it, vi } from "vitest";
import { sharePromise } from "../../../src/api/authBridge.js";

// Promesa controlable desde el test.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("sharePromise (compartirPromesa)", () => {
  it("tres llamadas concurrentes ejecutan una sola renovación y reciben el mismo resultado", async () => {
    const d = deferred();
    const renew = vi.fn(() => d.promise);
    const shared = sharePromise(renew);

    const calls = [shared(), shared(), shared()];
    d.resolve("token-nuevo");

    await expect(Promise.all(calls)).resolves.toEqual(["token-nuevo", "token-nuevo", "token-nuevo"]);
    expect(renew).toHaveBeenCalledTimes(1);
  });

  it("si la renovación falla, las tres fallan y la siguiente llamada vuelve a intentar", async () => {
    const first = deferred();
    const renew = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(async () => "token-2");
    const shared = sharePromise(renew);

    const calls = [shared(), shared(), shared()].map((p) => p.then(
      () => "ok",
      (e) => e.message
    ));
    first.reject(new Error("invalid_grant"));

    await expect(Promise.all(calls)).resolves.toEqual(["invalid_grant", "invalid_grant", "invalid_grant"]);
    expect(renew).toHaveBeenCalledTimes(1);

    await expect(shared()).resolves.toBe("token-2");
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it("una llamada posterior a una renovación exitosa vuelve a renovar", async () => {
    let n = 0;
    const renew = vi.fn(async () => `token-${++n}`);
    const shared = sharePromise(renew);

    await expect(shared()).resolves.toBe("token-1");
    await expect(shared()).resolves.toBe("token-2");
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it("un error síncrono de la función también se comparte como rechazo", async () => {
    const shared = sharePromise(() => {
      throw new Error("boom");
    });
    await expect(Promise.all([shared(), shared()])).rejects.toThrow("boom");
  });
});
