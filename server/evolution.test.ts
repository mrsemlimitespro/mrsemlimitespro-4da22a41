import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-evolution-user",
    email: "test@example.com",
    name: "Evolution Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("evolutionRouter with mocks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows listing instances for authenticated user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.evolution.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates instance successfully when remote Evolution API responds with QR code", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ qrcode: { base64: "mock_qr_base64_string" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const res = await caller.evolution.createInstance({
      instanceName: "MockInstance-MR",
      apiUrl: "https://evo.example.com",
      apiKey: "secret-key",
    });

    expect(res).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const list = await caller.evolution.list();
    const created = list.find(i => i.instanceName === "MockInstance-MR");
    expect(created).toBeDefined();
    expect(created?.qrCode).toBe("mock_qr_base64_string");

    if (created) {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
      await caller.evolution.deleteInstance({ id: created.id });
    }
  });

  it("handles remote Evolution API failure gracefully during creation", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 })
    );

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.evolution.createInstance({
        instanceName: "FailInstance",
        apiUrl: "https://evo.example.com",
        apiKey: "bad-key",
      })
    ).rejects.toThrow(/Evolution API HTTP 401/);
  });
});
